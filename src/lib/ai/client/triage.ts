/**
 * Inbox triage (staff tool) — browser module + shared contract (BROWSER-SAFE:
 * no SDK, no secrets). A staff member pastes an incoming email; POST
 * /api/triage classifies it (language, market, sender, intent, urgency, desk),
 * extracts the trip facts, lists what is missing and drafts a reply in the
 * sender's language (signed "Local Host team", never with prices).
 *
 *   import { triageEmail } from '../lib/ai/client/triage';
 *   const r = await triageEmail({ email: pastedText });
 *   if (!r.ok) showError(r.error, r.field);
 *   else render(r.data.triage);                 // r.data.triage.routeTo, .draftReply.body, …
 *   if (r.ok && r.data.mode === 'demo') showBadge(r.data.sample);
 *
 * `validateTriageRequest()` is the single source of truth for the request
 * format: the API route uses it, and triageEmail() runs it before sending.
 */
import { postAiJson } from '../client';
import { LOCALES, isLocale } from '../locales';
import type { AiMode, Locale } from '../types';

export const TRIAGE_ENDPOINT = '/api/triage';
/** Max characters of the pasted email. */
export const TRIAGE_EMAIL_MAX = 8000;

export const SENDER_TYPES = ['agency', 'traveller', 'supplier', 'other'] as const;
export type SenderType = (typeof SENDER_TYPES)[number];

export const TRIAGE_INTENTS = ['new-request', 'quote-follow-up', 'booking-change', 'complaint', 'partnership', 'other'] as const;
export type TriageIntent = (typeof TRIAGE_INTENTS)[number];

export const URGENCY_LEVELS = ['low', 'normal', 'high'] as const;
export type Urgency = (typeof URGENCY_LEVELS)[number];

export const TRIAGE_ROUTES = [
  'Italy desk',
  'Poland desk',
  'DACH desk',
  'CIS & Ukraine desk',
  'UK, US & Nordics desk',
  'Western Europe & Asia desk',
  'Reservations',
  'Finance',
  'Management',
] as const;
export type TriageRoute = (typeof TRIAGE_ROUTES)[number];

/** The three sample emails offered as "Try a sample email" (texts + results in fixtures/triage.ts). */
export const TRIAGE_SAMPLE_IDS = ['it-wine-group', 'pl-family-hiking', 'de-transfer-complaint'] as const;
export type TriageSampleId = (typeof TRIAGE_SAMPLE_IDS)[number];

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/** Body of POST /api/triage. */
export interface TriageRequest {
  /** The pasted email (subject + body + signature), 1–8000 characters. */
  email: string;
  /**
   * Language of the staff-facing notes (urgencyReason, summary, missingInfo,
   * extracted values). Default English. The draft reply is always in the sender's language.
   */
  locale?: Locale;
  /** Optional: which sample email was loaded (demo mode returns its prepared result while the text is unchanged). */
  sampleId?: TriageSampleId;
}

export interface TriageInput {
  email: string;
  /** Staff notes language (default 'en'). */
  locale: Locale;
  sampleId: TriageSampleId | null;
}

export type TriageValidation = { ok: true; value: TriageInput } | { ok: false; field: string; message: string };

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const isBlank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/** Strict validation of a POST /api/triage body (unknown fields are ignored, nothing is silently truncated). */
export function validateTriageRequest(body: unknown): TriageValidation {
  const fail = (field: string, message: string): TriageValidation => ({ ok: false, field, message });
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return fail('body', 'Body must be a JSON object.');
  const b = body as Record<string, unknown>;

  if (typeof b.email !== 'string') return fail('email', 'email must be a string.');
  const email = b.email.replace(CONTROL_CHARS, '').replace(/\r\n?/g, '\n').trim();
  if (!email) return fail('email', 'email must not be empty.');
  if (email.length > TRIAGE_EMAIL_MAX) return fail('email', `email must be at most ${TRIAGE_EMAIL_MAX} characters.`);

  let locale: Locale = 'en';
  if (!isBlank(b.locale)) {
    const base = typeof b.locale === 'string' ? b.locale.trim().toLowerCase().split(/[-_]/)[0] : undefined;
    if (!isLocale(base)) return fail('locale', `locale must be one of ${LOCALES.join(', ')}.`);
    locale = base;
  }

  let sampleId: TriageSampleId | null = null;
  if (!isBlank(b.sampleId)) {
    if (typeof b.sampleId !== 'string' || !(TRIAGE_SAMPLE_IDS as readonly string[]).includes(b.sampleId)) {
      return fail('sampleId', `sampleId must be one of ${TRIAGE_SAMPLE_IDS.join(', ')}.`);
    }
    sampleId = b.sampleId as TriageSampleId;
  }
  return { ok: true, value: { email, locale, sampleId } };
}

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

/** Facts stated in the email (keys are omitted when the email does not mention them). */
export interface TriageExtracted {
  travelDates?: string;
  groupSize?: string;
  /** Destination countries, e.g. ["Georgia", "Armenia"]. */
  countries?: string[];
  interests?: string[];
  /** The sender's own words about budget / price level (never our prices). */
  budgetHints?: string;
  hotelCategory?: string;
  specialNeeds?: string;
}

export interface TriageDraftReply {
  /** ISO 639-1 code of the reply language (= the sender's language), e.g. "it". */
  language: string;
  subject: string;
  /** Plain text with line breaks, signed "Local Host team". Contains no prices. */
  body: string;
}

export interface TriageResult {
  /** ISO 639-1 code of the email's language, e.g. "pl" (see languageLabel()). */
  language: string;
  /** Sender's country (English name), or "Unknown". */
  market: string;
  senderType: SenderType;
  intent: TriageIntent;
  urgency: Urgency;
  urgencyReason: string;
  routeTo: TriageRoute;
  extracted: TriageExtracted;
  /** Two sentences for the team (in the notes language, English by default). */
  summary: string;
  /** What to ask the sender before the team can act (0–6 items). */
  missingInfo: string[];
  draftReply: TriageDraftReply;
}

/** Exactly what Claude returns (structured output: nulls / empty lists instead of missing keys). */
export interface TriageModelOutput extends Omit<TriageResult, 'extracted'> {
  extracted: {
    travelDates: string | null;
    groupSize: string | null;
    countries: string[];
    interests: string[];
    budgetHints: string | null;
    hotelCategory: string | null;
    specialNeeds: string | null;
  };
}

export interface TriageSampleInfo {
  /** Which prepared result was returned. */
  id: TriageSampleId;
  /** Short English label of the sample, e.g. "Italian agency — wine tour, 30 pax". */
  label: string;
  /** True when the posted email is exactly that sample; false = demo fallback for another email. */
  exact: boolean;
}

/** 200 response of POST /api/triage (identical shape in live and demo mode). */
export interface TriageResponse {
  mode: AiMode;
  /** Language of the staff notes. */
  locale: Locale;
  triage: TriageResult;
  /** Demo mode only, else null. */
  sample: TriageSampleInfo | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** "it" → "Italian" (or "italiano" with displayLocale "it"). Falls back to the code. */
export function languageLabel(code: string, displayLocale: string = 'en'): string {
  try {
    const names = new Intl.DisplayNames([displayLocale], { type: 'language' });
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

/** A mailto: link that opens the draft reply in the staff member's mail client. */
export function draftReplyMailto(reply: TriageDraftReply, to = ''): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(reply.subject)}&body=${encodeURIComponent(reply.body)}`;
}

// ---------------------------------------------------------------------------
// Browser: call the endpoint
// ---------------------------------------------------------------------------

export type TriageOutcome =
  | { ok: true; mode: AiMode; data: TriageResponse }
  | {
      ok: false;
      /** null when the request never reached the server (validation, network). */
      mode: AiMode | null;
      status: number;
      /** "bad_request" (see `field`), "rate_limited", "daily_cap", "refusal", "truncated", "upstream_*", "network", "aborted", "invalid_response". */
      error: string;
      field?: string;
      /** Server or validation message (English). */
      message?: string;
      retryAfter?: number;
      aborted: boolean;
    };

/** Validates and POSTs an email to /api/triage. Live triage takes ~10–30 s — show progress, allow cancel via `signal`. */
export async function triageEmail(
  request: TriageRequest,
  options: { signal?: AbortSignal; endpoint?: string } = {},
): Promise<TriageOutcome> {
  const check = validateTriageRequest(request);
  if (!check.ok) {
    return { ok: false, mode: null, status: 0, error: 'bad_request', field: check.field, message: check.message, aborted: false };
  }
  const r = await postAiJson<TriageResponse>(options.endpoint ?? TRIAGE_ENDPOINT, request, options.signal ? { signal: options.signal } : {});
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
  const t = r.data?.triage;
  if (!t || typeof t.summary !== 'string' || !t.draftReply || typeof t.draftReply.body !== 'string') {
    return { ok: false, mode: r.mode, status: r.status, error: 'invalid_response', aborted: false };
  }
  return { ok: true, mode: r.data.mode ?? r.mode, data: r.data };
}
