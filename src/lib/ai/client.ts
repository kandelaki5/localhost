/**
 * Browser helpers for calling the AI endpoints (BROWSER-SAFE: no SDK, no
 * secrets — import this from <script> tags / client components).
 *
 * RENDERING RULE: model output is untrusted text. Put it into the page with
 * `textContent` / Astro `{expressions}` (auto-escaped) — never `innerHTML`,
 * `set:html` or `insertAdjacentHTML` with model text unless every character
 * is HTML-escaped first, and never use model text as a URL (href/src).
 *
 *   const result = await postAiStream('/api/plan', body, {
 *     onText: (visible) => (output.textContent = visible),
 *   });
 *   if (result.mode === 'demo') badge.hidden = false;      // "Demo — sample answer"
 *   if (result.refusal) showMessage(t.refusal);           // discard the partial text
 *   else if (result.error) showMessage(t.error);
 */
import { parseStreamText, visibleStreamText } from './markers';
import type { AiMode } from './types';

export { parseStreamText, visibleStreamText } from './markers';

export interface AiStreamResult {
  ok: boolean;
  /** HTTP status (200 for streams that started). */
  status: number;
  mode: AiMode;
  /** Final text without markers. On refusal, do NOT show it as an answer. */
  text: string;
  refusal: boolean;
  truncated: boolean;
  /** Error code: from a JSON error response (e.g. "rate_limited") or a mid-stream marker. */
  error: string | null;
  /** Human-readable message from a JSON error response, if any. */
  message?: string;
  /** Seconds to wait (rate limits), if the server said so. */
  retryAfter?: number;
  aborted: boolean;
}

export interface AiErrorPayload {
  error?: { code?: string; message?: string; retryAfter?: number };
  mode?: AiMode;
}

function modeOf(response: Response, fallback?: unknown): AiMode {
  const header = response.headers.get('x-ai-mode');
  if (header === 'demo' || header === 'live') return header;
  return fallback === 'demo' ? 'demo' : 'live';
}

async function errorResult(response: Response): Promise<AiStreamResult> {
  let payload: AiErrorPayload = {};
  try {
    payload = (await response.json()) as AiErrorPayload;
  } catch {
    /* non-JSON error */
  }
  const retryHeader = Number(response.headers.get('retry-after'));
  const retryAfter = payload.error?.retryAfter ?? (Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : undefined);
  return {
    ok: false,
    status: response.status,
    mode: modeOf(response, payload.mode),
    text: '',
    refusal: payload.error?.code === 'refusal',
    truncated: false,
    error: payload.error?.code ?? `http_${response.status}`,
    ...(payload.error?.message ? { message: payload.error.message } : {}),
    ...(retryAfter !== undefined ? { retryAfter } : {}),
    aborted: false,
  };
}

/**
 * Reads a streaming text response. `onText(visible, full)` is called for
 * every chunk with the text that is safe to display (markers stripped).
 */
export async function readAiStream(
  response: Response,
  onText?: (visible: string, raw: string) => void,
): Promise<AiStreamResult> {
  if (!response.ok) return errorResult(response);
  const mode = modeOf(response);
  if (!response.body) {
    const parsed = parseStreamText(await response.text());
    return { ok: !parsed.refusal && !parsed.error, status: response.status, mode, ...parsed, aborted: false };
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      raw += decoder.decode(value, { stream: true });
      onText?.(visibleStreamText(raw), raw);
    }
    raw += decoder.decode();
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    const parsed = parseStreamText(raw);
    return {
      ok: false,
      status: response.status,
      mode,
      ...parsed,
      error: parsed.error ?? (aborted ? 'aborted' : 'network'),
      aborted,
    };
  }
  const parsed = parseStreamText(raw);
  onText?.(parsed.refusal ? '' : parsed.text, raw);
  return { ok: !parsed.refusal && !parsed.error, status: response.status, mode, ...parsed, aborted: false };
}

/** POST JSON and read the streamed text answer. */
export async function postAiStream(
  url: string,
  body: unknown,
  options: { onText?: (visible: string, raw: string) => void; signal?: AbortSignal } = {},
): Promise<AiStreamResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
      body: JSON.stringify(body),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    return {
      ok: false, status: 0, mode: 'live', text: '', refusal: false, truncated: false,
      error: aborted ? 'aborted' : 'network', aborted,
    };
  }
  return readAiStream(response, options.onText);
}

export type AiJsonResult<T> =
  | { ok: true; status: number; mode: AiMode; data: T }
  | { ok: false; status: number; mode: AiMode; error: string; message?: string; retryAfter?: number; aborted: boolean };

/** POST JSON and parse a JSON answer (structured endpoints). `headers` adds request headers (e.g. X-Staff-Key). */
export async function postAiJson<T>(
  url: string,
  body: unknown,
  options: { signal?: AbortSignal; headers?: Record<string, string> } = {},
): Promise<AiJsonResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { ...options.headers, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    return { ok: false, status: 0, mode: 'live', error: aborted ? 'aborted' : 'network', aborted };
  }
  if (!response.ok) {
    const r = await errorResult(response);
    return {
      ok: false, status: r.status, mode: r.mode, error: r.error ?? 'unknown', aborted: false,
      ...(r.message ? { message: r.message } : {}),
      ...(r.retryAfter !== undefined ? { retryAfter: r.retryAfter } : {}),
    };
  }
  try {
    const data = (await response.json()) as T & { mode?: AiMode };
    return { ok: true, status: response.status, mode: modeOf(response, data?.mode), data };
  } catch {
    return { ok: false, status: response.status, mode: modeOf(response), error: 'invalid_response', aborted: false };
  }
}
