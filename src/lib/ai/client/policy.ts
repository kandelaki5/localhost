/**
 * Policy Q&A — browser module + shared contract (BROWSER-SAFE: no SDK, no
 * secrets, no policy texts). A visitor asks a question about Local Host's
 * sustainability and partner policies; POST /api/policy-qa answers ONLY from
 * the five policy documents, with citations that quote the documents verbatim.
 *
 *   import { askPolicyQuestion, nextPolicyHistory } from '../lib/ai/client/policy';
 *   let history: PolicyHistoryTurn[] = [];
 *   const r = await askPolicyQuestion({ locale: 'de', question, history });
 *   if (!r.ok) showError(r.error);                       // 'bad_request' (see r.field), 'rate_limited', 'refusal', …
 *   else {
 *     render(r.data.answer);                             // [{ text, citations: [{ documentTitle, documentUrl, citedText }] }]
 *     if (r.data.mode === 'demo') showBadge(r.data.sample);
 *     history = nextPolicyHistory(history, question, r.data.answer);
 *   }
 *
 * `validatePolicyQaRequest()` is the single source of truth for the request
 * format: the API route uses it, and askPolicyQuestion() runs it before sending.
 */
import { postAiJson } from '../client';
import { LOCALES, isLocale } from '../locales';
import type { AiMode, Locale } from '../types';

export const POLICY_QA_ENDPOINT = '/api/policy-qa';

/** Max characters of a question. */
export const POLICY_QUESTION_MAX = 500;
/** Max earlier messages sent as history (one turn = one message, so 6 = three Q&A pairs). */
export const POLICY_HISTORY_MAX_TURNS = 6;
/** Max characters per history message. */
export const POLICY_HISTORY_TEXT_MAX = 3000;

// ---------------------------------------------------------------------------
// The five policy documents (order = document_index sent to Claude)
// ---------------------------------------------------------------------------

export const POLICY_IDS = ['sustainability', 'report', 'excursions', 'accomodations', 'inbound'] as const;
export type PolicyId = (typeof POLICY_IDS)[number];

export interface PolicyDocumentInfo {
  id: PolicyId;
  /** Title sent to Claude and shown in citations. */
  title: string;
  /** The published PDF (kept at its historical URL). */
  url: string;
}

export const POLICY_DOCUMENTS: readonly PolicyDocumentInfo[] = [
  { id: 'sustainability', title: 'Sustainability Policy (Aug 2025)', url: '/assets/policies/sustainability.pdf' },
  { id: 'report', title: 'Sustainability Report (Nov 2025)', url: '/assets/policies/report.pdf' },
  { id: 'excursions', title: 'Sustainable Excursions Policy', url: '/assets/policies/excursions.pdf' },
  { id: 'accomodations', title: 'Sustainable Accommodations Policy', url: '/assets/policies/accomodations.pdf' },
  { id: 'inbound', title: 'Sustainable Inbound Travel Agency Policy', url: '/assets/policies/inbound.pdf' },
];

export function policyDocument(id: PolicyId): PolicyDocumentInfo {
  const doc = POLICY_DOCUMENTS.find((d) => d.id === id);
  if (!doc) throw new Error(`Unknown policy document ${id}`);
  return doc;
}

/**
 * Suggested questions (English). In demo mode these four get precomputed
 * answers with real, verbatim citations; the UI should offer them as chips.
 */
export const SUGGESTED_POLICY_QUESTIONS = [
  { id: 'footprint', question: 'How do you reduce your environmental footprint?' },
  { id: 'animals', question: 'Do you include animal attractions in tours?' },
  { id: 'hotels', question: 'How do you choose hotels?' },
  { id: 'rights', question: "How do you protect children and workers' rights?" },
] as const;
export type SuggestedPolicyQuestionId = (typeof SUGGESTED_POLICY_QUESTIONS)[number]['id'];

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export interface PolicyHistoryTurn {
  role: 'user' | 'assistant';
  /** Plain text (for assistant turns: the previous answer's text, see policyAnswerText()). */
  content: string;
}

/** Body of POST /api/policy-qa. */
export interface PolicyQaRequest {
  /** Answer language; defaults to the Accept-Language header, then English. */
  locale?: Locale;
  /** 1–500 characters. */
  question: string;
  /** Up to 6 earlier messages, oldest first (see nextPolicyHistory()). */
  history?: PolicyHistoryTurn[];
}

/** The validated, normalised request. */
export interface PolicyQaInput {
  /** Undefined when the client did not send one (server picks from Accept-Language). */
  locale: Locale | undefined;
  question: string;
  history: PolicyHistoryTurn[];
}

export type PolicyQaValidation = { ok: true; value: PolicyQaInput } | { ok: false; field: string; message: string };

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const cleanText = (value: string) => value.replace(CONTROL_CHARS, '').replace(/\r\n?/g, '\n').trim();
const isBlank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/** Strict validation of a POST /api/policy-qa body (unknown fields are ignored, nothing is silently clamped). */
export function validatePolicyQaRequest(body: unknown): PolicyQaValidation {
  const fail = (field: string, message: string): PolicyQaValidation => ({ ok: false, field, message });
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return fail('body', 'Body must be a JSON object.');
  const b = body as Record<string, unknown>;

  let locale: Locale | undefined;
  if (!isBlank(b.locale)) {
    const base = typeof b.locale === 'string' ? b.locale.trim().toLowerCase().split(/[-_]/)[0] : undefined;
    if (!isLocale(base)) return fail('locale', `locale must be one of ${LOCALES.join(', ')}.`);
    locale = base;
  }

  if (typeof b.question !== 'string') return fail('question', 'question must be a string.');
  const question = cleanText(b.question);
  if (!question) return fail('question', 'question must not be empty.');
  if (question.length > POLICY_QUESTION_MAX) return fail('question', `question must be at most ${POLICY_QUESTION_MAX} characters.`);

  const history: PolicyHistoryTurn[] = [];
  if (!isBlank(b.history)) {
    if (!Array.isArray(b.history)) return fail('history', 'history must be an array of { role, content }.');
    if (b.history.length > POLICY_HISTORY_MAX_TURNS) {
      return fail('history', `history must have at most ${POLICY_HISTORY_MAX_TURNS} messages.`);
    }
    for (const item of b.history) {
      if (typeof item !== 'object' || item === null) return fail('history', 'history items must be { role, content } objects.');
      const { role, content } = item as { role?: unknown; content?: unknown };
      if (role !== 'user' && role !== 'assistant') return fail('history', 'history roles must be "user" or "assistant".');
      if (typeof content !== 'string') return fail('history', 'history content must be a string.');
      const text = cleanText(content);
      if (text.length > POLICY_HISTORY_TEXT_MAX) {
        return fail('history', `history messages must be at most ${POLICY_HISTORY_TEXT_MAX} characters.`);
      }
      if (text) history.push({ role, content: text });
    }
  }
  return { ok: true, value: { locale, question, history } };
}

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

export interface PolicyCitation {
  /** One of POLICY_DOCUMENTS[].title. */
  documentTitle: string;
  /** The matching PDF, e.g. "/assets/policies/excursions.pdf". */
  documentUrl: string;
  /** Verbatim passage from the policy text (English, as in the document). */
  citedText: string;
}

/** One piece of the answer. Concatenate all `text`s for the full answer; show citations next to their piece. */
export interface PolicyAnswerBlock {
  text: string;
  /** Empty for connecting text that makes no claim of its own. */
  citations: PolicyCitation[];
}

export interface PolicyQaSampleInfo {
  /** Which prepared answer was returned ("generic" when the question matched none). */
  id: SuggestedPolicyQuestionId | 'generic';
  /** The suggested question this sample answers (English). */
  question: string;
  /** True when the visitor asked exactly this suggested question. */
  exact: boolean;
}

/** 200 response of POST /api/policy-qa (identical shape in live and demo mode). */
export interface PolicyQaResponse {
  mode: AiMode;
  /** Language the answer was requested in (demo answers are always English). */
  locale: Locale;
  answer: PolicyAnswerBlock[];
  /** Demo mode only, else null. */
  sample: PolicyQaSampleInfo | null;
}

// ---------------------------------------------------------------------------
// Helpers for rendering + history
// ---------------------------------------------------------------------------

/** The full answer as plain text. */
export function policyAnswerText(answer: readonly PolicyAnswerBlock[]): string {
  return answer.map((b) => b.text).join('').trim();
}

/** Unique documents cited anywhere in the answer, in POLICY_DOCUMENTS order (for a "Sources" list). */
export function policySources(answer: readonly PolicyAnswerBlock[]): PolicyDocumentInfo[] {
  const urls = new Set(answer.flatMap((b) => b.citations.map((c) => c.documentUrl)));
  return POLICY_DOCUMENTS.filter((d) => urls.has(d.url));
}

/**
 * Numbered footnotes: every unique citation gets a number (1-based), and each
 * answer block gets the numbers of its citations — handy for "[1]" markers.
 */
export function policyFootnotes(answer: readonly PolicyAnswerBlock[]): {
  notes: (PolicyCitation & { n: number })[];
  blocks: { text: string; refs: number[] }[];
} {
  const notes: (PolicyCitation & { n: number })[] = [];
  const blocks = answer.map((block) => {
    const refs: number[] = [];
    for (const c of block.citations) {
      let note = notes.find((n) => n.documentUrl === c.documentUrl && n.citedText === c.citedText);
      if (!note) {
        note = { ...c, n: notes.length + 1 };
        notes.push(note);
      }
      if (!refs.includes(note.n)) refs.push(note.n);
    }
    return { text: block.text, refs };
  });
  return { notes, blocks };
}

/** History for the next question: previous turns + this Q&A, trimmed to the last 6 messages. */
export function nextPolicyHistory(
  history: readonly PolicyHistoryTurn[],
  question: string,
  answer: readonly PolicyAnswerBlock[],
): PolicyHistoryTurn[] {
  const text = policyAnswerText(answer).slice(0, POLICY_HISTORY_TEXT_MAX);
  const next: PolicyHistoryTurn[] = [...history, { role: 'user', content: question.slice(0, POLICY_HISTORY_TEXT_MAX) }];
  if (text) next.push({ role: 'assistant', content: text });
  let trimmed = next.slice(-POLICY_HISTORY_MAX_TURNS);
  while (trimmed.length && trimmed[0]?.role !== 'user') trimmed = trimmed.slice(1);
  return trimmed;
}

// ---------------------------------------------------------------------------
// Browser: call the endpoint
// ---------------------------------------------------------------------------

export type PolicyQaOutcome =
  | { ok: true; mode: AiMode; data: PolicyQaResponse }
  | {
      ok: false;
      /** null when the request never reached the server (validation, network). */
      mode: AiMode | null;
      status: number;
      /** "bad_request" (see `field`), "rate_limited", "daily_cap", "refusal", "truncated", "upstream_*", "network", "aborted", "invalid_response". */
      error: string;
      field?: string;
      /** Server or validation message (English); prefer your own localised copy per code. */
      message?: string;
      retryAfter?: number;
      aborted: boolean;
    };

/**
 * Validates and POSTs a question to /api/policy-qa. History longer than 6
 * messages is trimmed to the most recent ones before sending.
 */
export async function askPolicyQuestion(
  request: PolicyQaRequest,
  options: { signal?: AbortSignal; endpoint?: string } = {},
): Promise<PolicyQaOutcome> {
  let history = (request.history ?? []).slice(-POLICY_HISTORY_MAX_TURNS);
  while (history.length && history[0]?.role !== 'user') history = history.slice(1);
  const body: PolicyQaRequest = { ...request, history };
  const check = validatePolicyQaRequest(body);
  if (!check.ok) {
    return { ok: false, mode: null, status: 0, error: 'bad_request', field: check.field, message: check.message, aborted: false };
  }
  const r = await postAiJson<PolicyQaResponse>(options.endpoint ?? POLICY_QA_ENDPOINT, body, options.signal ? { signal: options.signal } : {});
  if (!r.ok) {
    return {
      ok: false,
      mode: r.status === 0 ? null : r.mode,
      status: r.status,
      error: r.error,
      aborted: r.aborted,
      ...(r.message ? { message: r.message } : {}),
      ...(r.retryAfter !== undefined ? { retryAfter: r.retryAfter } : {}),
    };
  }
  const data = r.data;
  if (!data || !Array.isArray(data.answer) || !data.answer.every((b) => typeof b?.text === 'string' && Array.isArray(b.citations))) {
    return { ok: false, mode: r.mode, status: r.status, error: 'invalid_response', aborted: false };
  }
  return { ok: true, mode: data.mode ?? r.mode, data };
}
