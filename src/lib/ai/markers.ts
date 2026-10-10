/**
 * In-band status markers appended to streamed text responses.
 *
 * A text endpoint streams `text/plain`. Because the HTTP status is already
 * 200 once streaming starts, problems that happen *during* the stream are
 * reported as one final marker, always preceded by a blank line:
 *
 *   "...partial text\n\n[[refusal]]"        Claude declined; DISCARD the partial text
 *   "...full text\n\n[[truncated]]"          hit max_tokens; text is usable but cut off
 *   "...partial text\n\n[[error:<code>]]"    upstream/network error mid-stream
 *
 * Browser-safe (no dependencies). Clients should use `parseStreamText()` or
 * the higher-level helpers in `client.ts`.
 */

export const MARKER_PREFIX = '\n\n[[';
export const REFUSAL_MARKER = '\n\n[[refusal]]';
export const TRUNCATED_MARKER = '\n\n[[truncated]]';

export function errorMarker(code: string): string {
  return `\n\n[[error:${code.replace(/[^a-z0-9_]/gi, '_')}]]`;
}

export interface ParsedStreamText {
  /** Text without the trailing marker. */
  text: string;
  /** Claude declined (stop_reason "refusal"). The partial text must not be shown as an answer. */
  refusal: boolean;
  /** Output hit max_tokens. */
  truncated: boolean;
  /** Error code when the stream failed mid-way, else null. */
  error: string | null;
}

const FINAL_MARKER_RE = /\n\n\[\[(refusal|truncated|error:([a-z0-9_]+))\]\]\s*$/i;

/** Splits a complete streamed body into text + status. */
export function parseStreamText(full: string): ParsedStreamText {
  const match = FINAL_MARKER_RE.exec(full);
  if (!match) return { text: full, refusal: false, truncated: false, error: null };
  const text = full.slice(0, match.index);
  const kind = (match[1] ?? '').toLowerCase();
  return {
    text,
    refusal: kind === 'refusal',
    truncated: kind === 'truncated',
    error: kind.startsWith('error:') ? (match[2] ?? 'unknown').toLowerCase() : null,
  };
}

/**
 * While a stream is still arriving, returns the text that is safe to display:
 * strips a complete trailing marker and holds back anything that could be the
 * beginning of one (e.g. a trailing "\n\n[[ref").
 */
export function visibleStreamText(partial: string): string {
  const parsed = parseStreamText(partial);
  if (parsed.refusal || parsed.truncated || parsed.error) return parsed.text;
  const idx = partial.lastIndexOf(MARKER_PREFIX);
  if (idx !== -1 && /^\n\n\[\[[a-z0-9_:]*\]?$/i.test(partial.slice(idx))) {
    return partial.slice(0, idx);
  }
  // Hold back a trailing "\n", "\n\n" or "\n\n[" that may start a marker.
  for (const tail of ['\n\n[', '\n\n', '\n']) {
    if (partial.endsWith(tail)) return partial.slice(0, -tail.length);
  }
  return partial;
}
