/**
 * B2B Proposal Builder — browser module + shared contract (BROWSER-SAFE: no
 * SDK, no secrets). A partner agency describes a group; POST /api/proposal
 * answers with a structured draft programme (no prices — pricing is prepared
 * by the Local Host team).
 *
 *   import { requestProposal } from '../lib/ai/client/proposal';
 *   const r = await requestProposal({ locale: 'it', groupSize: 25, month: 9, days: 8,
 *     countries: ['GE'], interests: ['culture', 'wine'], hotelCategory: '4*', pace: 'balanced' });
 *   if (!r.ok) showError(r.error, r.field);                 // field set for validation errors
 *   else render(r.data.proposal, r.data.places, r.data.pricingNote);
 *   if (r.ok && r.data.mode === 'demo') showBadge(r.data.sample?.notice);
 *
 * `validateProposalRequest()` is the single source of truth for the request
 * format: the API route uses it, and the browser runs it before sending.
 */
import { postAiJson } from '../client';
import { LOCALES, isLocale, normalizeLocale } from '../locales';
import {
  COUNTRY_CODES,
  EXPERIENCE_IDS,
  type AiMode,
  type CountryCode,
  type ExperienceId,
  type Locale,
  type PlaceId,
} from '../types';
import type { PlaceInfo } from './place-info';

export type { PlaceInfo } from './place-info';

export const PROPOSAL_ENDPOINT = '/api/proposal';

export const PROPOSAL_GROUP_MIN = 1;
export const PROPOSAL_GROUP_MAX = 200;
export const PROPOSAL_DAYS_MIN = 3;
export const PROPOSAL_DAYS_MAX = 21;
export const PROPOSAL_SPECIAL_REQUESTS_MAX = 1500;
export const PROPOSAL_AGENCY_MAX = 120;
export const PROPOSAL_MARKET_MAX = 80;

export const HOTEL_CATEGORIES = ['boutique', '3*', '4*', '5*', 'mixed'] as const;
export type HotelCategory = (typeof HOTEL_CATEGORIES)[number];

export const PROPOSAL_PACES = ['relaxed', 'balanced', 'active'] as const;
export type ProposalPace = (typeof PROPOSAL_PACES)[number];

/** Use a season when the exact month is not known yet ("flexible" = dates open). */
export const SEASONS = ['spring', 'summer', 'autumn', 'winter', 'flexible'] as const;
export type Season = (typeof SEASONS)[number];

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/** Body of POST /api/proposal. Send `month` or `season` (or both — month wins). */
export interface ProposalRequest {
  /** Answer language; defaults to the Accept-Language header, then English. */
  locale?: Locale;
  /** Agency / tour operator name (≤ 120 chars). */
  agency?: string;
  /** Source market, e.g. "Italy" (≤ 80 chars). */
  market?: string;
  /** Whole number, 1–200. */
  groupSize: number;
  /** 1–12. */
  month?: number;
  season?: Season;
  /** Whole number, 3–21. Day 1 = arrival, last day = departure. */
  days: number;
  /** 1–3 of 'GE' | 'AM' | 'AZ'. */
  countries: CountryCode[];
  /** 0–6 experience ids (empty = "a balanced mix"). */
  interests: ExperienceId[];
  hotelCategory: HotelCategory;
  pace: ProposalPace;
  /** Free text, ≤ 1500 chars. */
  specialRequests?: string;
}

/** The validated, normalised request (also echoed back in the response). */
export interface ProposalInput {
  /** Undefined when the client did not send one (server picks from Accept-Language). */
  locale: Locale | undefined;
  agency: string | null;
  market: string | null;
  groupSize: number;
  month: number | null;
  season: Season | null;
  days: number;
  countries: CountryCode[];
  interests: ExperienceId[];
  hotelCategory: HotelCategory;
  pace: ProposalPace;
  specialRequests: string | null;
}

export type ProposalValidation = { ok: true; value: ProposalInput } | { ok: false; field: string; message: string };

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const fail = (field: string, message: string): ProposalValidation => ({ ok: false, field, message });
const isBlank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

function wholeNumber(value: unknown): number | undefined {
  const n = typeof value === 'string' && /^\s*\d+\s*$/.test(value) ? Number(value) : value;
  return typeof n === 'number' && Number.isInteger(n) ? n : undefined;
}

function optionalText(value: unknown, field: string, max: number): { ok: true; value: string | null } | { ok: false; v: ProposalValidation } {
  if (isBlank(value)) return { ok: true, value: null };
  if (typeof value !== 'string') return { ok: false, v: fail(field, `${field} must be a string.`) };
  const cleaned = value.replace(CONTROL_CHARS, '').replace(/\r\n?/g, '\n').trim();
  if (cleaned.length > max) return { ok: false, v: fail(field, `${field} must be at most ${max} characters.`) };
  return { ok: true, value: cleaned || null };
}

function idList<const T extends string>(value: unknown, allowed: readonly T[], field: string): T[] | ProposalValidation {
  if (!Array.isArray(value)) return fail(field, `${field} must be an array of ${allowed.join(', ')}.`);
  const out: T[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !(allowed as readonly string[]).includes(item)) {
      return fail(field, `Unknown ${field} value "${String(item).slice(0, 20)}". Use ${allowed.join(', ')}.`);
    }
    if (!out.includes(item as T)) out.push(item as T);
  }
  return out;
}

/**
 * Strict validation of a POST /api/proposal body. Unknown fields are ignored;
 * every known field must be well-formed (no silent clamping).
 */
export function validateProposalRequest(body: unknown): ProposalValidation {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return fail('body', 'Body must be a JSON object.');
  const b = body as Record<string, unknown>;

  let locale: Locale | undefined;
  if (!isBlank(b.locale)) {
    const base = typeof b.locale === 'string' ? b.locale.trim().toLowerCase().split(/[-_]/)[0] : undefined;
    if (!isLocale(base)) return fail('locale', `locale must be one of ${LOCALES.join(', ')}.`);
    locale = normalizeLocale(base);
  }

  const agency = optionalText(b.agency, 'agency', PROPOSAL_AGENCY_MAX);
  if (!agency.ok) return agency.v;
  const market = optionalText(b.market, 'market', PROPOSAL_MARKET_MAX);
  if (!market.ok) return market.v;

  const groupSize = wholeNumber(b.groupSize);
  if (groupSize === undefined || groupSize < PROPOSAL_GROUP_MIN || groupSize > PROPOSAL_GROUP_MAX) {
    return fail('groupSize', `groupSize must be a whole number from ${PROPOSAL_GROUP_MIN} to ${PROPOSAL_GROUP_MAX}.`);
  }

  let month: number | null = null;
  if (!isBlank(b.month)) {
    const m = wholeNumber(b.month);
    if (m === undefined || m < 1 || m > 12) return fail('month', 'month must be a whole number from 1 to 12.');
    month = m;
  }
  let season: Season | null = null;
  if (!isBlank(b.season)) {
    if (typeof b.season !== 'string' || !(SEASONS as readonly string[]).includes(b.season)) {
      return fail('season', `season must be one of ${SEASONS.join(', ')}.`);
    }
    season = b.season as Season;
  }
  if (month === null && season === null) return fail('month', 'Send month (1–12) or season.');

  const days = wholeNumber(b.days);
  if (days === undefined || days < PROPOSAL_DAYS_MIN || days > PROPOSAL_DAYS_MAX) {
    return fail('days', `days must be a whole number from ${PROPOSAL_DAYS_MIN} to ${PROPOSAL_DAYS_MAX}.`);
  }

  const countries = idList(b.countries, COUNTRY_CODES, 'countries');
  if (!Array.isArray(countries)) return countries;
  if (countries.length === 0) return fail('countries', `countries must contain at least one of ${COUNTRY_CODES.join(', ')}.`);

  const interests = idList(isBlank(b.interests) ? [] : b.interests, EXPERIENCE_IDS, 'interests');
  if (!Array.isArray(interests)) return interests;

  if (typeof b.hotelCategory !== 'string' || !(HOTEL_CATEGORIES as readonly string[]).includes(b.hotelCategory)) {
    return fail('hotelCategory', `hotelCategory must be one of ${HOTEL_CATEGORIES.join(', ')}.`);
  }
  if (typeof b.pace !== 'string' || !(PROPOSAL_PACES as readonly string[]).includes(b.pace)) {
    return fail('pace', `pace must be one of ${PROPOSAL_PACES.join(', ')}.`);
  }

  const specialRequests = optionalText(b.specialRequests, 'specialRequests', PROPOSAL_SPECIAL_REQUESTS_MAX);
  if (!specialRequests.ok) return specialRequests.v;

  return {
    ok: true,
    value: {
      locale,
      agency: agency.value,
      market: market.value,
      groupSize,
      month,
      season,
      days,
      countries,
      interests,
      hotelCategory: b.hotelCategory as HotelCategory,
      pace: b.pace as ProposalPace,
      specialRequests: specialRequests.value,
    },
  };
}

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

export interface ProposalDay {
  /** 1..N, in order. */
  day: number;
  title: string;
  /** Place-index ids visited or slept at that day, in order (known ids only). */
  placeIds: PlaceId[];
  activities: string[];
  /** Included meals, e.g. "Breakfast, dinner" (absent when none are planned). */
  meals?: string;
  /** Where the group sleeps + accommodation type; "—" on the departure day. */
  overnight: string;
}

/** The proposal document (the structured output, cleaned). Contains no prices. */
export interface ProposalDocument {
  title: string;
  subtitle: string;
  summary: string;
  highlights: string[];
  days: ProposalDay[];
  included: string[];
  notIncluded: string[];
  sustainability: string[];
  nextSteps: string[];
  disclaimer: string;
}

/** Exactly what Claude returns (structured output) — also the fixture format. */
export interface ProposalModelOutput extends Omit<ProposalDocument, 'days'> {
  days: { day: number; title: string; placeIds: string[]; activities: string[]; meals: string | null; overnight: string }[];
}

export interface ProposalSampleInfo {
  /** Which demo proposal answered. */
  id: string;
  /** Localised "Demo — …" label to show next to the result. */
  notice: string;
  /** The brief the sample was written for (it may differ from the visitor's). */
  brief: ProposalInput;
}

/** 200 response of POST /api/proposal (identical shape in live and demo mode). */
export interface ProposalResponse {
  mode: AiMode;
  /** Language the proposal is written in. */
  locale: Locale;
  proposal: ProposalDocument;
  /** Always present, localised: pricing is prepared by the Local Host team. Show it near the programme. */
  pricingNote: string;
  /** Unique place ids in route order (for maps). */
  route: PlaceId[];
  /** Localised details for every place in `route` (name, country, map x/y…). */
  places: Partial<Record<PlaceId, PlaceInfo>>;
  /** The visitor's validated brief. */
  request: ProposalInput;
  /** Demo mode only, else null. */
  sample: ProposalSampleInfo | null;
}

// ---------------------------------------------------------------------------
// Browser: call the endpoint
// ---------------------------------------------------------------------------

export type ProposalOutcome =
  | { ok: true; mode: AiMode; data: ProposalResponse }
  | {
      ok: false;
      /** null when the request never reached the server (validation, network). */
      mode: AiMode | null;
      status: number;
      /** "bad_request" (see `field`), "rate_limited", "daily_cap", "refusal", "truncated", "upstream_*", "network", "aborted", "invalid_response". */
      error: string;
      /** Invalid request field (client-side or server-side validation). */
      field?: string;
      /** Server or validation message (English); prefer your own localised copy per code. */
      message?: string;
      retryAfter?: number;
      aborted: boolean;
    };

/**
 * Validates the brief, POSTs it to /api/proposal and returns the proposal.
 * Live generation can take up to a minute — show progress and allow cancel
 * via `signal`.
 */
export async function requestProposal(
  brief: ProposalRequest,
  options: { signal?: AbortSignal; endpoint?: string } = {},
): Promise<ProposalOutcome> {
  const check = validateProposalRequest(brief);
  if (!check.ok) {
    return { ok: false, mode: null, status: 0, error: 'bad_request', field: check.field, message: check.message, aborted: false };
  }
  const r = await postAiJson<ProposalResponse>(
    options.endpoint ?? PROPOSAL_ENDPOINT,
    brief,
    options.signal ? { signal: options.signal } : {},
  );
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
  if (!data?.proposal || !Array.isArray(data.proposal.days) || typeof data.pricingNote !== 'string') {
    return { ok: false, mode: r.mode, status: r.status, error: 'invalid_response', aborted: false };
  }
  return { ok: true, mode: data.mode ?? r.mode, data };
}
