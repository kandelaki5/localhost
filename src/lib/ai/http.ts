/**
 * HTTP helpers for AI API routes (SERVER-ONLY).
 *
 *  - json() / error()            consistent JSON responses ({error:{code,message}})
 *  - guard()                     method + origin + rate limit + body size + JSON parse, in one call
 *  - checkRateLimit()            per-IP sliding window + site-wide daily cap (in-memory, best effort)
 *  - streamText()                AsyncIterable<string> → streaming text/plain Response
 *  - demoStream()                fixture text → AsyncIterable<string> in small timed chunks
 *  - streamClaudeResponse()      SDK MessageStream → streaming Response with [[markers]]
 *  - describeUpstreamError()     typed SDK error → {status, code, message}
 *
 * RATE LIMITING IS BEST EFFORT: state lives in the memory of one serverless
 * instance. Vercel may run several instances and recycles them, so the real
 * ceiling can be a small multiple of the configured limits. It is a guard
 * against casual abuse and runaway loops, not a billing guarantee — also set
 * a spend limit in the Anthropic Console.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { BetaMessage, BetaRawMessageStreamEvent } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import type { BetaMessageStream } from '@anthropic-ai/sdk/lib/BetaMessageStream';
import { aiMode, dailyCap, isLive, rateLimitPerHour } from './config';
import { REFUSAL_MARKER, TRUNCATED_MARKER, errorMarker } from './markers';
import type { AiMode } from './types';

export { REFUSAL_MARKER, TRUNCATED_MARKER, errorMarker, parseStreamText } from './markers';

/** Reject request bodies larger than this (bytes). NB: Vercel itself caps bodies at 4.5 MB. */
export const MAX_BODY_BYTES = 6 * 1024 * 1024;

export type AiErrorCode =
  | 'bad_request'
  | 'invalid_json'
  | 'unsupported_media_type'
  | 'payload_too_large'
  | 'method_not_allowed'
  | 'forbidden_origin'
  | 'rate_limited'
  | 'daily_cap'
  | 'refusal'
  | 'truncated'
  | 'upstream_rate_limited'
  | 'upstream_overloaded'
  | 'upstream_timeout'
  | 'upstream_connection'
  | 'upstream_auth'
  | 'upstream_bad_request'
  | 'upstream_error'
  | 'aborted'
  | 'internal';

export interface ApiErrorBody {
  error: { code: AiErrorCode; message: string; retryAfter?: number };
  mode?: AiMode;
}

const NO_STORE = 'no-store, no-cache, must-revalidate, no-transform';

export interface ResponseOptions {
  status?: number;
  headers?: HeadersInit;
  /** Adds `X-AI-Mode` and (for object bodies) a `mode` field. */
  mode?: AiMode;
}

function mergeHeaders(base: Record<string, string>, extra?: HeadersInit): Headers {
  const headers = new Headers(base);
  if (extra) new Headers(extra).forEach((value, key) => headers.set(key, value));
  return headers;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** JSON response. With `mode`, sets `X-AI-Mode` and adds `mode` to object bodies. */
export function json(data: unknown, options: ResponseOptions = {}): Response {
  const { status = 200, headers, mode } = options;
  const body = mode && isPlainObject(data) && !('mode' in data) ? { ...data, mode } : data;
  const base: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': NO_STORE,
    'X-Content-Type-Options': 'nosniff',
  };
  if (mode) base['X-AI-Mode'] = mode;
  return new Response(JSON.stringify(body), { status, headers: mergeHeaders(base, headers) });
}

/** Error response with the shared shape `{ error: { code, message } }`. */
export function error(
  status: number,
  code: AiErrorCode,
  message: string,
  options: { headers?: HeadersInit; mode?: AiMode; retryAfter?: number } = {},
): Response {
  const headers = mergeHeaders({}, options.headers);
  if (options.retryAfter !== undefined) headers.set('Retry-After', String(options.retryAfter));
  const body: ApiErrorBody = {
    error: { code, message, ...(options.retryAfter !== undefined ? { retryAfter: options.retryAfter } : {}) },
  };
  return json(body, { status, headers, ...(options.mode ? { mode: options.mode } : {}) });
}

// ---------------------------------------------------------------------------
// Client IP
// ---------------------------------------------------------------------------

/** Groups IPv6 addresses by /64 (one subscriber usually owns a whole /64). */
function normalizeIp(raw: string): string {
  let ip = raw.trim().replace(/^\[|\]$/g, '');
  if (ip.startsWith('::ffff:') && ip.includes('.')) ip = ip.slice(7); // IPv4-mapped
  if (!ip.includes(':')) return ip || 'unknown';
  const [head = '', tail = ''] = ip.split('::');
  const headParts = head ? head.split(':') : [];
  const tailParts = tail ? tail.split(':') : [];
  const missing = Math.max(0, 8 - headParts.length - tailParts.length);
  const full = [...headParts, ...Array<string>(missing).fill('0'), ...tailParts];
  return `${full.slice(0, 4).map((p) => p.toLowerCase().replace(/^0+(?=.)/, '')).join(':')}::/64`;
}

/**
 * Best-effort client IP: x-forwarded-for (first hop; set by Vercel), x-real-ip,
 * then Astro's `clientAddress`. Pass the APIContext (or {request, clientAddress}).
 */
export function clientIp(context: { request: Request; clientAddress?: string }): string {
  const { headers } = context.request;
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return normalizeIp(forwarded);
  const real = headers.get('x-real-ip')?.trim();
  if (real) return normalizeIp(real);
  try {
    // Astro throws when clientAddress is unavailable (e.g. prerendered route).
    const address = context.clientAddress;
    if (address) return normalizeIp(address);
  } catch {
    /* ignore */
  }
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per instance, best effort)
// ---------------------------------------------------------------------------

const WINDOW_MS = 60 * 60 * 1000;
const MAX_TRACKED_IPS = 10_000;
const hitsByIp = new Map<string, number[]>();
let capDay = '';
let capCount = 0;

export interface RateLimitResult {
  ok: boolean;
  /** Which limit was hit (only when !ok). */
  reason?: 'ip' | 'daily';
  limit: number;
  remaining: number;
  /** Seconds until a retry can succeed (only when !ok). */
  retryAfter?: number;
}

function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function secondsToUtcMidnight(now: number): number {
  const d = new Date(now);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now) / 1000));
}

function pruneIps(cutoff: number): void {
  if (hitsByIp.size <= MAX_TRACKED_IPS) return;
  for (const [ip, hits] of hitsByIp) {
    if ((hits[hits.length - 1] ?? 0) <= cutoff) hitsByIp.delete(ip);
  }
  // Still too many (e.g. an IP-rotating flood): drop the oldest-inserted entries.
  while (hitsByIp.size > MAX_TRACKED_IPS) {
    const first = hitsByIp.keys().next().value;
    if (first === undefined) break;
    hitsByIp.delete(first);
  }
}

/**
 * Sliding-window limit per IP (AI_RATE_LIMIT_PER_HOUR) + a site-wide daily cap
 * (AI_DAILY_CAP, UTC day) that only counts live Claude calls. Consumes
 * `cost` units when allowed.
 */
export function checkRateLimit(
  ip: string,
  options: { cost?: number; live?: boolean; now?: number } = {},
): RateLimitResult {
  const { cost = 1, live = isLive(), now = Date.now() } = options;
  const limit = rateLimitPerHour();
  const cutoff = now - WINDOW_MS;
  const hits = (hitsByIp.get(ip) ?? []).filter((t) => t > cutoff);

  if (hits.length + cost > limit) {
    hitsByIp.set(ip, hits);
    const oldest = hits[0] ?? now;
    return {
      ok: false,
      reason: 'ip',
      limit,
      remaining: Math.max(0, limit - hits.length),
      retryAfter: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
    };
  }

  if (live) {
    const today = utcDay(now);
    if (today !== capDay) {
      capDay = today;
      capCount = 0;
    }
    if (capCount + cost > dailyCap()) {
      return { ok: false, reason: 'daily', limit, remaining: limit - hits.length, retryAfter: secondsToUtcMidnight(now) };
    }
    capCount += cost;
  }

  for (let i = 0; i < cost; i++) hits.push(now);
  hitsByIp.delete(ip); // re-insert → Map order approximates recency for pruning
  hitsByIp.set(ip, hits);
  pruneIps(cutoff);
  return { ok: true, limit, remaining: Math.max(0, limit - hits.length) };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
  };
  if (result.retryAfter !== undefined) headers['Retry-After'] = String(result.retryAfter);
  return headers;
}

/** Test helper: clears all in-memory rate-limit state. */
export function resetRateLimits(): void {
  hitsByIp.clear();
  capDay = '';
  capCount = 0;
}

// ---------------------------------------------------------------------------
// Origin check
// ---------------------------------------------------------------------------

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'localhost.ge', 'www.localhost.ge']);

/**
 * Same-origin-ish check to stop other websites from using our endpoints from
 * their visitors' browsers. Allows: the request's own host, localhost,
 * localhost.ge (+ subdomains) and *.vercel.app previews. Requests without an
 * Origin header (curl, server-to-server) are allowed unless the browser marks
 * them `Sec-Fetch-Site: cross-site` — they are still rate limited.
 * This is abuse reduction, not authentication (Origin can be forged outside browsers).
 */
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return request.headers.get('sec-fetch-site') !== 'cross-site';
  if (origin === 'null') return false;
  let host: string;
  try {
    host = new URL(origin).hostname.replace(/^\[|\]$/g, '').toLowerCase();
  } catch {
    return false;
  }
  let ownHost = '';
  try {
    ownHost = new URL(request.url).hostname.replace(/^\[|\]$/g, '').toLowerCase();
  } catch {
    /* ignore */
  }
  return (
    host === ownHost ||
    ALLOWED_HOSTS.has(host) ||
    host.endsWith('.localhost.ge') ||
    host.endsWith('.vercel.app')
  );
}

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------

export type BodyResult<T> = { ok: true; data: T } | { ok: false; response: Response };

/**
 * Reads a JSON object body with a hard size limit (checked against
 * Content-Length *and* while streaming the body, so chunked uploads can't
 * bypass it). Requires `Content-Type: application/json`.
 */
export async function readJson<T = Record<string, unknown>>(
  request: Request,
  options: { maxBytes?: number; mode?: AiMode } = {},
): Promise<BodyResult<T>> {
  const maxBytes = options.maxBytes ?? MAX_BODY_BYTES;
  const fail = (status: number, code: AiErrorCode, message: string): BodyResult<T> => ({
    ok: false,
    response: error(status, code, message, options.mode ? { mode: options.mode } : {}),
  });
  const tooLarge = () => fail(413, 'payload_too_large', `Request body is larger than ${Math.round(maxBytes / 1024)} KB.`);

  const contentType = request.headers.get('content-type') ?? '';
  if (!/^application\/(.+\+)?json\b/i.test(contentType.trim())) {
    return fail(415, 'unsupported_media_type', 'Send the request body as application/json.');
  }
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) return tooLarge();
  if (!request.body) return fail(400, 'invalid_json', 'Request body is empty.');

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return tooLarge();
      }
      chunks.push(value);
    }
  } catch {
    return fail(400, 'bad_request', 'Could not read the request body.');
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder('utf-8').decode(bytes).trim();
  if (!text) return fail(400, 'invalid_json', 'Request body is empty.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fail(400, 'invalid_json', 'Request body is not valid JSON.');
  }
  if (!isPlainObject(parsed)) {
    return fail(400, 'bad_request', 'Request body must be a JSON object.');
  }
  return { ok: true, data: parsed as T };
}

// ---------------------------------------------------------------------------
// One-stop guard for POST endpoints
// ---------------------------------------------------------------------------

export interface GuardOptions {
  /** Allowed methods (default ["POST"]). */
  methods?: string[];
  /** Body size limit in bytes (default MAX_BODY_BYTES = 6 MB). */
  maxBytes?: number;
  /** Rate-limit units this request costs (default 1). */
  cost?: number;
  /** Set false to skip the origin check (default true). */
  checkOrigin?: boolean;
}

export type GuardResult<T> =
  | {
      ok: true;
      body: T;
      ip: string;
      mode: AiMode;
      /** X-RateLimit-* headers — pass them on to your Response. */
      headers: Record<string, string>;
    }
  | { ok: false; response: Response };

/**
 * Runs, in order: method → origin → rate limit/daily cap → JSON body.
 * Returns either the parsed body or a ready-made error Response:
 *
 *   const g = await guard(context);
 *   if (!g.ok) return g.response;
 */
export async function guard<T = Record<string, unknown>>(
  context: { request: Request; clientAddress?: string },
  options: GuardOptions = {},
): Promise<GuardResult<T>> {
  const { request } = context;
  const mode = aiMode();
  const methods = (options.methods ?? ['POST']).map((m) => m.toUpperCase());

  if (!methods.includes(request.method.toUpperCase())) {
    return {
      ok: false,
      response: error(405, 'method_not_allowed', `Use ${methods.join(' or ')}.`, {
        headers: { Allow: methods.join(', ') },
        mode,
      }),
    };
  }
  if (options.checkOrigin !== false && !isAllowedOrigin(request)) {
    return { ok: false, response: error(403, 'forbidden_origin', 'This endpoint only serves the Local Host website.', { mode }) };
  }

  const ip = clientIp(context);
  const limit = checkRateLimit(ip, { cost: options.cost ?? 1, live: mode === 'live' });
  const headers = rateLimitHeaders(limit);
  if (!limit.ok) {
    const message =
      limit.reason === 'daily'
        ? 'The AI assistant has reached its daily limit. Please try again tomorrow or contact info@localhost.ge.'
        : 'Too many requests. Please wait a little and try again.';
    return {
      ok: false,
      response: error(429, limit.reason === 'daily' ? 'daily_cap' : 'rate_limited', message, {
        headers,
        mode,
        ...(limit.retryAfter !== undefined ? { retryAfter: limit.retryAfter } : {}),
      }),
    };
  }

  const body = await readJson<T>(request, { mode, ...(options.maxBytes !== undefined ? { maxBytes: options.maxBytes } : {}) });
  if (!body.ok) return body;
  return { ok: true, body: body.data, ip, mode, headers };
}

// ---------------------------------------------------------------------------
// Small input validators (return undefined when invalid)
// ---------------------------------------------------------------------------

/** Trimmed string of 1..max chars, else undefined. Collapses control characters. */
export function asText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (!cleaned) return undefined;
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
}

/** Integer clamped to [min, max], else undefined. */
export function asInt(value: unknown, min: number, max: number): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Value if it is one of `allowed`, else undefined. */
export function asOneOf<const T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** Unique allowed values from an array (max `maxItems`). */
export function asList<const T extends string>(value: unknown, allowed: readonly T[], maxItems = allowed.length): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const item of value) {
    const v = asOneOf(item, allowed);
    if (v && !out.includes(v)) out.push(v);
    if (out.length >= maxItems) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

const STREAM_HEADERS: Record<string, string> = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': NO_STORE,
  'X-Content-Type-Options': 'nosniff',
  'X-Accel-Buffering': 'no',
};

function toAsyncIterator(source: AsyncIterable<string> | Iterable<string>): AsyncIterator<string> | Iterator<string> {
  if (Symbol.asyncIterator in source) return (source as AsyncIterable<string>)[Symbol.asyncIterator]();
  return (source as Iterable<string>)[Symbol.iterator]();
}

/**
 * Streams text chunks as a `text/plain; charset=utf-8` Response with no-cache
 * headers and `X-AI-Mode`. Client disconnects call the iterator's `return()`,
 * which aborts an upstream Claude stream (see streamClaudeResponse).
 */
export function streamText(
  source: AsyncIterable<string> | Iterable<string>,
  options: ResponseOptions = {},
): Response {
  const { status = 200, headers, mode = aiMode() } = options;
  const encoder = new TextEncoder();
  const iterator = toAsyncIterator(source);
  let finished = false;

  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        // Loop until something is enqueued (empty chunks would otherwise stall the reader).
        for (;;) {
          const { done, value } = await iterator.next();
          if (done) {
            finished = true;
            controller.close();
            return;
          }
          if (value) {
            controller.enqueue(encoder.encode(value));
            return;
          }
        }
      } catch (err) {
        console.error('[ai] stream source failed', err);
        finished = true;
        controller.enqueue(encoder.encode(errorMarker('internal')));
        controller.close();
      }
    },
    async cancel() {
      if (finished) return;
      finished = true;
      try {
        await iterator.return?.();
      } catch {
        /* ignore */
      }
    },
  });

  return new Response(body, { status, headers: mergeHeaders({ ...STREAM_HEADERS, 'X-AI-Mode': mode }, headers) });
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface DemoStreamOptions {
  /** Words per chunk (default 3). */
  chunk?: number;
  /** Delay between chunks in ms (default 22). */
  delayMs?: number;
  /** Delay before the first chunk in ms, imitating time-to-first-token (default 350). */
  firstDelayMs?: number;
}

/**
 * Replays fixture text in small word chunks with tiny delays, so demo mode
 * looks and parses exactly like a live stream. Whitespace is preserved
 * byte-for-byte. Use with streamText(demoStream(text), { mode: 'demo' }).
 */
export async function* demoStream(text: string, options: DemoStreamOptions = {}): AsyncGenerator<string> {
  const { chunk = 3, delayMs = 22, firstDelayMs = 350 } = options;
  const tokens = text.match(/\s+|\S+\s*/g) ?? [];
  if (firstDelayMs > 0) await sleep(firstDelayMs);
  for (let i = 0; i < tokens.length; i += Math.max(1, chunk)) {
    yield tokens.slice(i, i + Math.max(1, chunk)).join('');
    if (delayMs > 0 && i + chunk < tokens.length) await sleep(delayMs);
  }
}

/** Convenience: a complete demo streaming Response. */
export function demoTextResponse(text: string, options: DemoStreamOptions & { headers?: HeadersInit } = {}): Response {
  const { headers, ...streamOptions } = options;
  return streamText(demoStream(text, streamOptions), { mode: 'demo', ...(headers ? { headers } : {}) });
}

// ---------------------------------------------------------------------------
// Upstream (Claude) errors
// ---------------------------------------------------------------------------

export interface UpstreamErrorInfo {
  status: number;
  code: AiErrorCode;
  /** Safe, user-facing message (no internals). */
  message: string;
  retryAfter?: number;
}

const BUSY = 'The AI assistant is busy right now. Please try again in a minute.';
const UNAVAILABLE = 'The AI assistant is temporarily unavailable. Please contact info@localhost.ge.';

/** Maps SDK errors (typed classes, most specific first) to an HTTP status + code. */
export function describeUpstreamError(err: unknown): UpstreamErrorInfo {
  if (err instanceof Anthropic.APIUserAbortError) {
    return { status: 499, code: 'aborted', message: 'Request was cancelled.' };
  }
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return { status: 504, code: 'upstream_timeout', message: BUSY };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { status: 502, code: 'upstream_connection', message: UNAVAILABLE };
  }
  if (err instanceof Anthropic.RateLimitError) {
    const retry = Number(err.headers?.get('retry-after'));
    return {
      status: 503,
      code: 'upstream_rate_limited',
      message: BUSY,
      ...(Number.isFinite(retry) && retry > 0 ? { retryAfter: Math.ceil(retry) } : { retryAfter: 30 }),
    };
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return { status: 500, code: 'upstream_auth', message: UNAVAILABLE };
  }
  if (
    err instanceof Anthropic.BadRequestError ||
    err instanceof Anthropic.NotFoundError ||
    err instanceof Anthropic.UnprocessableEntityError ||
    err instanceof Anthropic.ConflictError
  ) {
    return { status: 502, code: 'upstream_bad_request', message: UNAVAILABLE };
  }
  if (err instanceof Anthropic.InternalServerError) {
    // 500 / 529 overloaded and other 5xx.
    return { status: 503, code: 'upstream_overloaded', message: BUSY, retryAfter: 30 };
  }
  if (err instanceof Anthropic.APIError && err.type === 'overloaded_error') {
    // e.g. an SSE `error` event mid-stream (no HTTP status) — typed via err.type.
    return { status: 503, code: 'upstream_overloaded', message: BUSY, retryAfter: 30 };
  }
  if (err instanceof Anthropic.APIError && err.type === 'rate_limit_error') {
    return { status: 503, code: 'upstream_rate_limited', message: BUSY, retryAfter: 30 };
  }
  if (err instanceof Anthropic.APIError || err instanceof Anthropic.AnthropicError) {
    return { status: 502, code: 'upstream_error', message: UNAVAILABLE };
  }
  return { status: 500, code: 'internal', message: UNAVAILABLE };
}

/** Logs an upstream error with the request id (never the API key or prompt). */
export function logUpstreamError(feature: string, err: unknown): void {
  if (err instanceof Anthropic.APIUserAbortError) return;
  if (err instanceof Anthropic.APIError) {
    console.error(`[ai] ${feature} upstream ${err.status ?? '-'} ${err.type ?? ''} request_id=${err.requestID ?? '-'}: ${err.message}`);
  } else {
    console.error(`[ai] ${feature} failed:`, err);
  }
}

/** JSON error Response for a thrown upstream error. */
export function upstreamErrorResponse(feature: string, err: unknown, headers?: HeadersInit): Response {
  logUpstreamError(feature, err);
  const info = describeUpstreamError(err);
  return error(info.status, info.code, info.message, {
    mode: 'live',
    ...(headers ? { headers } : {}),
    ...(info.retryAfter !== undefined ? { retryAfter: info.retryAfter } : {}),
  });
}

/** One compact usage line per call — lets you verify prompt caching in the logs. */
export function logUsage(feature: string, message: BetaMessage): void {
  const u = message.usage;
  const fallback = (u.iterations ?? []).some((entry) => entry.type === 'fallback_message');
  console.info(
    `[ai] ${feature} model=${message.model} stop=${message.stop_reason ?? '-'}` +
      ` in=${u.input_tokens} cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0}` +
      ` out=${u.output_tokens}${fallback ? ' fallback=yes' : ''}`,
  );
}

export interface ClaudeStreamOptions {
  /** Short feature name for logs, e.g. "planner". */
  feature: string;
  /** Extra response headers (e.g. rate-limit headers from guard()). */
  headers?: HeadersInit;
  /** Called with the final message after a successful stream (usage, stop_reason...). */
  onFinal?: (message: BetaMessage) => void;
}

/**
 * Turns an SDK BetaMessageStream into a streaming text Response.
 *
 * Waits for the FIRST stream event before answering, so failures before any
 * output (bad key, 429, overload, connection) become proper JSON error
 * responses with an HTTP status. After that, text deltas are streamed and the
 * body ends with a marker when needed:
 *   stop_reason "refusal"    → "\n\n[[refusal]]"   (client must discard the partial text)
 *   stop_reason "max_tokens" → "\n\n[[truncated]]"
 *   error mid-stream         → "\n\n[[error:<code>]]"
 * A client disconnect aborts the upstream request.
 */
export async function streamClaudeResponse(
  stream: BetaMessageStream<unknown>,
  options: ClaudeStreamOptions,
): Promise<Response> {
  const iterator = stream[Symbol.asyncIterator]();
  let first: IteratorResult<BetaRawMessageStreamEvent>;
  try {
    first = await iterator.next();
    // The iterator can end quietly on error; done() rethrows it.
    if (first.done) await stream.done();
  } catch (err) {
    stream.abort();
    return upstreamErrorResponse(options.feature, err, options.headers);
  }
  return streamText(claudeTextDeltas(stream, iterator, first, options), {
    mode: 'live',
    ...(options.headers ? { headers: options.headers } : {}),
  });
}

async function* claudeTextDeltas(
  stream: BetaMessageStream<unknown>,
  iterator: AsyncIterator<BetaRawMessageStreamEvent>,
  first: IteratorResult<BetaRawMessageStreamEvent>,
  options: ClaudeStreamOptions,
): AsyncGenerator<string> {
  try {
    let result = first;
    while (!result.done) {
      const event = result.value;
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      } else if (event.type === 'content_block_start' && event.content_block.type === 'fallback') {
        const block = event.content_block;
        console.info(`[ai] ${options.feature} refusal fallback ${block.from.model} → ${block.to.model}`);
      }
      result = await iterator.next();
    }
    const message = await stream.finalMessage();
    logUsage(options.feature, message);
    options.onFinal?.(message);
    if (message.stop_reason === 'refusal') {
      yield REFUSAL_MARKER;
    } else if (message.stop_reason === 'max_tokens' || message.stop_reason === 'model_context_window_exceeded') {
      yield TRUNCATED_MARKER;
    }
  } catch (err) {
    if (err instanceof Anthropic.APIUserAbortError) return; // client went away
    logUpstreamError(options.feature, err);
    yield errorMarker(describeUpstreamError(err).code);
  } finally {
    if (!stream.ended) stream.abort();
  }
}
