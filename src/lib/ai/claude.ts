/**
 * Claude request building + calling (SERVER-ONLY). Every AI feature should go
 * through these helpers so all calls share the same defaults:
 *
 *  - model()                     claude-opus-5-5 unless ANTHROPIC_MODEL overrides
 *  - no `thinking` param         Opus 5.5 always uses adaptive thinking; never budget_tokens
 *  - output_config.effort        set explicitly per feature ("low" chat-like, "medium" proposals)
 *  - fallbacks: "default"        server-side refusal fallback (beta server-side-fallback-2026-07-01)
 *  - system[0] = knowledge base  stable, cache_control → prompt-cached across all requests
 *  - system[1] = feature prompt  stable per feature, cache_control
 *  - system[2] = volatile bits   answer language + per-request context (not cached)
 *  - last message must be user   no assistant prefill (400 on this model)
 */
import type {
  BetaMessage,
  BetaMessageParam,
  BetaTextBlockParam,
  MessageCreateParamsBase,
} from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { FALLBACK_BETA, anthropic, fallbacksEnabled, model } from './config';
import {
  type AiErrorCode,
  describeUpstreamError,
  error,
  logUpstreamError,
  logUsage,
  streamClaudeResponse,
} from './http';
import { knowledgeSystemPrompt } from './knowledge';
import { languageInstruction } from './locales';
import type { Locale } from './types';

export type Effort = 'low' | 'medium' | 'high';

export interface ClaudeRequest {
  /** Short feature name for logs, e.g. "planner". */
  feature: string;
  /** Feature system prompt. Keep it STABLE (no dates, ids, user data) — it is cached. */
  instructions: string;
  /** Conversation; must end with a user message. Untrusted text belongs here, not in `instructions`. */
  messages: BetaMessageParam[];
  /** Answer language → appended as an uncached system block. */
  locale?: Locale;
  /** Per-request system context (e.g. today's date, page section). Uncached, after the breakpoints. */
  context?: string;
  /** Output budget incl. thinking. Keep sensible for a public endpoint (see docs). */
  maxTokens: number;
  /** "low" for chat-like/latency-sensitive endpoints, "medium" for heavier writing. */
  effort: Effort;
  /** Include the knowledge base block (default true). */
  knowledge?: boolean;
  /**
   * Escape hatch for extra params (tools, metadata, stop_sequences, betas...).
   * thinking / temperature / top_p / top_k / fallbacks are excluded on purpose.
   */
  extra?: Partial<
    Omit<
      MessageCreateParamsBase,
      'model' | 'messages' | 'system' | 'max_tokens' | 'stream' | 'thinking' | 'temperature' | 'top_p' | 'top_k' | 'fallbacks'
    >
  >;
}

/**
 * Hard ceiling for max_tokens on public endpoints (thinking counts towards it).
 * Georgian (Mkhedruli) text costs considerably more tokens than the same
 * text in English — size `ka` answers generously, but never above this.
 */
export const MAX_TOKENS_CEILING = 16_000;

/** System blocks: [knowledge base (cached), feature instructions (cached), volatile (not cached)]. */
export function buildSystem(req: Pick<ClaudeRequest, 'instructions' | 'locale' | 'context' | 'knowledge'>): BetaTextBlockParam[] {
  const blocks: BetaTextBlockParam[] = [];
  if (req.knowledge !== false) {
    blocks.push({ type: 'text', text: knowledgeSystemPrompt(), cache_control: { type: 'ephemeral' } });
  }
  blocks.push({ type: 'text', text: req.instructions.trim(), cache_control: { type: 'ephemeral' } });
  const volatile = [req.locale ? languageInstruction(req.locale) : '', req.context?.trim() ?? ''].filter(Boolean);
  if (volatile.length) blocks.push({ type: 'text', text: volatile.join('\n\n') });
  return blocks;
}

/** Full request params with the house defaults. Throws on assistant prefill. */
export function messageParams(req: ClaudeRequest): MessageCreateParamsBase {
  const last = req.messages[req.messages.length - 1];
  if (!last || last.role !== 'user') {
    throw new Error(`[ai] ${req.feature}: messages must end with a user message (no assistant prefill on ${model()}).`);
  }
  const { output_config: extraOutput, ...extra } = req.extra ?? {};
  const maxTokens = Math.max(256, Math.min(MAX_TOKENS_CEILING, Math.round(req.maxTokens)));
  if (maxTokens !== req.maxTokens) console.warn(`[ai] ${req.feature}: max_tokens ${req.maxTokens} clamped to ${maxTokens}`);
  return {
    ...extra,
    model: model(),
    max_tokens: maxTokens,
    system: buildSystem(req),
    messages: req.messages,
    output_config: { ...extraOutput, effort: req.effort },
    ...(fallbacksEnabled()
      ? { fallbacks: 'default' as const, betas: [...(extra.betas ?? []), FALLBACK_BETA] }
      : {}),
  };
}

/**
 * Live streaming text endpoint in one call: builds the request, opens the
 * stream and returns a streaming text Response (pre-output errors → JSON
 * error with HTTP status; later problems → [[markers]]; see http.ts).
 */
export async function streamClaude(req: ClaudeRequest, options: { headers?: HeadersInit } = {}): Promise<Response> {
  let params: MessageCreateParamsBase;
  try {
    params = messageParams(req);
  } catch (err) {
    console.error(err);
    return error(500, 'internal', 'The AI assistant is misconfigured.', { mode: 'live' });
  }
  const stream = anthropic().beta.messages.stream(params);
  return streamClaudeResponse(stream, { feature: req.feature, ...(options.headers ? { headers: options.headers } : {}) });
}

// ---------------------------------------------------------------------------
// Structured (JSON) output
// ---------------------------------------------------------------------------

export type JsonSchema = { [key: string]: unknown };

/**
 * Makes a JSON schema strict for structured outputs: every object gets
 * `additionalProperties: false` and (if missing) `required` = all its
 * properties. Keeps `enum`, `description`, `items`, `anyOf`. Avoid
 * minLength/maxLength/minimum/maximum/pattern — put limits in descriptions.
 */
export function strictSchema(schema: JsonSchema): JsonSchema {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (typeof node !== 'object' || node === null) return node;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) out[k] = walk(v);
    if (out.type === 'object') {
      const props = (out.properties ?? {}) as Record<string, unknown>;
      out.properties = props;
      out.additionalProperties = false;
      if (!Array.isArray(out.required)) out.required = Object.keys(props);
    }
    return out;
  };
  return walk(schema) as JsonSchema;
}

export type StructuredResult<T> =
  | { ok: true; data: T; message: BetaMessage }
  | { ok: false; status: number; code: AiErrorCode; message: string; retryAfter?: number };

/**
 * Non-text endpoint: asks for JSON matching `schema` (output_config.format)
 * and returns the parsed object. Uses streaming under the hood (no HTTP
 * timeouts on long generations) and handles refusal / max_tokens / invalid
 * JSON / API errors uniformly.
 *
 *   const r = await runStructured<Proposal>({ ...req, schema, validate: isProposal });
 *   if (!r.ok) return structuredErrorResponse(r);
 *   return json({ proposal: r.data }, { mode: 'live' });
 */
export async function runStructured<T>(
  req: ClaudeRequest & { schema: JsonSchema; validate?: (value: unknown) => value is T },
): Promise<StructuredResult<T>> {
  let params: MessageCreateParamsBase;
  try {
    const base = messageParams(req);
    params = {
      ...base,
      output_config: { ...base.output_config, format: { type: 'json_schema', schema: strictSchema(req.schema) } },
    };
  } catch (err) {
    console.error(err);
    return { ok: false, status: 500, code: 'internal', message: 'The AI assistant is misconfigured.' };
  }

  let message: BetaMessage;
  try {
    message = await anthropic().beta.messages.stream(params).finalMessage();
  } catch (err) {
    logUpstreamError(req.feature, err);
    const info = describeUpstreamError(err);
    return { ok: false, status: info.status, code: info.code, message: info.message, ...(info.retryAfter ? { retryAfter: info.retryAfter } : {}) };
  }
  logUsage(req.feature, message);

  if (message.stop_reason === 'refusal') {
    return { ok: false, status: 422, code: 'refusal', message: 'The assistant could not help with this request. Please rephrase it or contact the Local Host team.' };
  }
  if (message.stop_reason === 'max_tokens' || message.stop_reason === 'model_context_window_exceeded') {
    return { ok: false, status: 502, code: 'truncated', message: 'The answer was too long to finish. Please try a shorter request.' };
  }
  const text = message.content
    .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error(`[ai] ${req.feature}: structured output was not valid JSON (stop=${message.stop_reason})`);
    return { ok: false, status: 502, code: 'upstream_error', message: 'The assistant returned an unexpected answer. Please try again.' };
  }
  if (req.validate && !req.validate(parsed)) {
    console.error(`[ai] ${req.feature}: structured output failed validation`);
    return { ok: false, status: 502, code: 'upstream_error', message: 'The assistant returned an unexpected answer. Please try again.' };
  }
  return { ok: true, data: parsed as T, message };
}

/** Error Response for a failed runStructured() result. */
export function structuredErrorResponse(
  result: Extract<StructuredResult<unknown>, { ok: false }>,
  headers?: HeadersInit,
): Response {
  return error(result.status, result.code, result.message, {
    mode: 'live',
    ...(headers ? { headers } : {}),
    ...(result.retryAfter ? { retryAfter: result.retryAfter } : {}),
  });
}

// ---------------------------------------------------------------------------
// Conversation history from the browser (untrusted)
// ---------------------------------------------------------------------------

/**
 * Cleans a client-supplied chat history into valid Messages API input:
 * only {role:"user"|"assistant", content:string}, trimmed and length-capped,
 * keeps the last `maxTurns` messages, merges consecutive same-role messages,
 * starts with a user message and ENDS with a user message (drops a trailing
 * assistant turn — no prefill). Returns [] if nothing usable remains.
 */
export function sanitizeHistory(
  raw: unknown,
  options: { maxTurns?: number; maxChars?: number } = {},
): BetaMessageParam[] {
  const { maxTurns = 12, maxChars = 4000 } = options;
  if (!Array.isArray(raw)) return [];
  const cleaned: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') continue;
    const text = content.trim().slice(0, maxChars);
    if (!text) continue;
    const prev = cleaned[cleaned.length - 1];
    if (prev && prev.role === role) prev.content = `${prev.content}\n\n${text}`.slice(0, maxChars);
    else cleaned.push({ role, content: text });
  }
  let recent = cleaned.slice(-maxTurns);
  while (recent.length && recent[0]?.role !== 'user') recent = recent.slice(1);
  while (recent.length && recent[recent.length - 1]?.role !== 'user') recent = recent.slice(0, -1);
  return recent;
}

