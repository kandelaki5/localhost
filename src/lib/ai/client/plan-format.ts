/**
 * AI Trip Designer — the shared contract between POST /api/plan and the
 * browser module (`./plan.ts`). BROWSER-SAFE: no SDK, no secrets; imported by
 * the API route too, so request validation and the itinerary format are
 * defined in exactly one place.
 *
 *  - request types + `validatePlanRequest()` (strict, used by the server)
 *  - per-locale labels of the Markdown format ("## Day N — …", "Overnight: …")
 *  - the trailing machine-readable route tag `<route>["tbilisi",…]</route>`:
 *    `extractRoute()`, `visiblePlanText()` (hides a half-streamed tag)
 *  - `parsePlan()` → { intro, days[], why[], closing } for designed UIs
 *  - `guessRouteFromPlan()` → provisional place ids while the plan streams
 */
import { LOCALES, isLocale, normalizeLocale } from '../locales';
import { PLACES } from '../places';
import {
  COUNTRY_CODES,
  EXPERIENCE_IDS,
  isPlaceId,
  type CountryCode,
  type ExperienceId,
  type Locale,
  type PlaceId,
} from '../types';

// ---------------------------------------------------------------------------
// Request contract
// ---------------------------------------------------------------------------

export const PLAN_DAYS_MIN = 3;
export const PLAN_DAYS_MAX = 21;
export const PLAN_NOTES_MAX = 1500;
/** Max follow-up messages (assistant + user turns) after the initial request. */
export const PLAN_HISTORY_MAX_TURNS = 10;
/** Max chars of one previous plan sent back in `history` (assistant turn). */
export const PLAN_HISTORY_ASSISTANT_MAX = 24_000;
/** Max chars of one refinement request (user turn), same as notes. */
export const PLAN_HISTORY_USER_MAX = PLAN_NOTES_MAX;
/** Max place ids accepted from a route tag. */
export const PLAN_ROUTE_MAX = 40;

export const TRAVELLER_TYPES = ['solo', 'couple', 'family', 'friends', 'group', 'agency'] as const;
export type TravellerType = (typeof TRAVELLER_TYPES)[number];

export const PACES = ['relaxed', 'balanced', 'active'] as const;
export type Pace = (typeof PACES)[number];

/** One previous turn of a refinement conversation. */
export interface PlanTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Body of POST /api/plan. */
export interface PlanRequest {
  /** Answer language; defaults to the Accept-Language header, then English. */
  locale?: Locale;
  /** 1–3 of 'GE' | 'AM' | 'AZ'. */
  countries: CountryCode[];
  /** 0–6 experience ids (empty = "a balanced mix"). */
  interests: ExperienceId[];
  /** Whole number, 3–21. Day 1 = arrival, last day = departure. */
  days: number;
  /** "1"–"12", "2027-05", an English month name/abbreviation, or "flexible". */
  month?: string | number;
  travellers?: TravellerType;
  pace?: Pace;
  /** Free text, ≤ 1500 chars. */
  notes?: string;
  /**
   * Follow-up refinements: alternating turns that START with the previous
   * plan (assistant) and END with the visitor's change request (user), e.g.
   * [{role:'assistant', content: plan1}, {role:'user', content:'Make day 3 more relaxed'}].
   * ≤ 10 turns. The original form fields must be sent again unchanged.
   */
  history?: PlanTurn[];
}

/** The validated, normalised request. */
export interface PlanInput {
  /** Undefined when the client did not send one (server picks from Accept-Language). */
  locale: Locale | undefined;
  countries: CountryCode[];
  interests: ExperienceId[];
  days: number;
  /** 1–12, or undefined for "flexible". */
  month: number | undefined;
  year: number | undefined;
  travellers: TravellerType | undefined;
  pace: Pace | undefined;
  notes: string | undefined;
  history: PlanTurn[];
}

export type PlanValidation = { ok: true; value: PlanInput } | { ok: false; field: string; message: string };

export const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/**
 * Parses the optional travel month. Returns null for "no preference",
 * undefined for an invalid value.
 */
export function parseMonth(value: unknown): { month: number; year?: number } | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 1 && value <= 12 ? { month: value } : undefined;
  }
  if (typeof value !== 'string') return undefined;
  const v = value.trim().toLowerCase();
  if (v === '' || v === 'flexible' || v === 'any' || v === 'anytime') return null;
  if (/^\d{1,2}$/.test(v)) {
    const n = Number(v);
    return n >= 1 && n <= 12 ? { month: n } : undefined;
  }
  const ym = /^(\d{4})-(\d{2})$/.exec(v);
  if (ym) {
    const year = Number(ym[1]);
    const month = Number(ym[2]);
    return month >= 1 && month <= 12 && year >= 2000 && year <= 2100 ? { month, year } : undefined;
  }
  const index = MONTHS_EN.findIndex((name) => {
    const n = name.toLowerCase();
    return v === n || (v.length >= 3 && n.startsWith(v.replace(/\.$/, '')));
  });
  return index === -1 ? undefined : { month: index + 1 };
}

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function cleanText(value: string): string {
  return value.replace(CONTROL_CHARS, '').replace(/\r\n?/g, '\n').trim();
}

const fail = (field: string, message: string): PlanValidation => ({ ok: false, field, message });

/**
 * Strict validation of a POST /api/plan body. Unknown fields are ignored;
 * every known field must be well-formed (no silent clamping).
 */
export function validatePlanRequest(body: unknown): PlanValidation {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return fail('body', 'Body must be a JSON object.');
  const b = body as Record<string, unknown>;

  let locale: Locale | undefined;
  if (b.locale !== undefined && b.locale !== null && b.locale !== '') {
    // Accepts "it" and BCP-47 variants such as "it-IT" / "de_AT".
    const base = typeof b.locale === 'string' ? b.locale.trim().toLowerCase().split(/[-_]/)[0] : undefined;
    if (!isLocale(base)) return fail('locale', `locale must be one of ${LOCALES.join(', ')}.`);
    locale = normalizeLocale(base);
  }

  if (!Array.isArray(b.countries) || b.countries.length === 0) {
    return fail('countries', `countries must be a non-empty array of ${COUNTRY_CODES.join(', ')}.`);
  }
  const countries: CountryCode[] = [];
  for (const c of b.countries) {
    if (typeof c !== 'string' || !(COUNTRY_CODES as readonly string[]).includes(c)) {
      return fail('countries', `Unknown country "${String(c).slice(0, 20)}". Use ${COUNTRY_CODES.join(', ')}.`);
    }
    if (!countries.includes(c as CountryCode)) countries.push(c as CountryCode);
  }

  if (b.interests !== undefined && !Array.isArray(b.interests)) {
    return fail('interests', `interests must be an array of ${EXPERIENCE_IDS.join(', ')}.`);
  }
  const interests: ExperienceId[] = [];
  for (const i of (b.interests as unknown[] | undefined) ?? []) {
    if (typeof i !== 'string' || !(EXPERIENCE_IDS as readonly string[]).includes(i)) {
      return fail('interests', `Unknown interest "${String(i).slice(0, 20)}". Use ${EXPERIENCE_IDS.join(', ')}.`);
    }
    if (!interests.includes(i as ExperienceId)) interests.push(i as ExperienceId);
  }

  const daysRaw = typeof b.days === 'string' && /^\s*\d+\s*$/.test(b.days) ? Number(b.days) : b.days;
  if (typeof daysRaw !== 'number' || !Number.isInteger(daysRaw) || daysRaw < PLAN_DAYS_MIN || daysRaw > PLAN_DAYS_MAX) {
    return fail('days', `days must be a whole number from ${PLAN_DAYS_MIN} to ${PLAN_DAYS_MAX}.`);
  }

  const month = parseMonth(b.month);
  if (month === undefined) return fail('month', 'month must be 1–12, "YYYY-MM", an English month name, or "flexible".');

  let travellers: TravellerType | undefined;
  if (b.travellers !== undefined && b.travellers !== null && b.travellers !== '') {
    if (typeof b.travellers !== 'string' || !(TRAVELLER_TYPES as readonly string[]).includes(b.travellers)) {
      return fail('travellers', `travellers must be one of ${TRAVELLER_TYPES.join(', ')}.`);
    }
    travellers = b.travellers as TravellerType;
  }

  let pace: Pace | undefined;
  if (b.pace !== undefined && b.pace !== null && b.pace !== '') {
    if (typeof b.pace !== 'string' || !(PACES as readonly string[]).includes(b.pace)) {
      return fail('pace', `pace must be one of ${PACES.join(', ')}.`);
    }
    pace = b.pace as Pace;
  }

  let notes: string | undefined;
  if (b.notes !== undefined && b.notes !== null) {
    if (typeof b.notes !== 'string') return fail('notes', 'notes must be a string.');
    const cleaned = cleanText(b.notes);
    if (cleaned.length > PLAN_NOTES_MAX) return fail('notes', `notes must be at most ${PLAN_NOTES_MAX} characters.`);
    notes = cleaned || undefined;
  }

  const history: PlanTurn[] = [];
  if (b.history !== undefined && b.history !== null) {
    if (!Array.isArray(b.history)) return fail('history', 'history must be an array of {role, content}.');
    if (b.history.length > PLAN_HISTORY_MAX_TURNS) {
      return fail('history', `history may contain at most ${PLAN_HISTORY_MAX_TURNS} turns.`);
    }
    for (let i = 0; i < b.history.length; i++) {
      const turn = b.history[i] as { role?: unknown; content?: unknown } | null;
      const expected = i % 2 === 0 ? 'assistant' : 'user';
      if (typeof turn !== 'object' || turn === null || turn.role !== expected) {
        return fail('history', `history[${i}].role must be "${expected}" (turns alternate, starting with the previous plan).`);
      }
      if (typeof turn.content !== 'string' || !cleanText(turn.content)) {
        return fail('history', `history[${i}].content must be a non-empty string.`);
      }
      const content = cleanText(turn.content);
      const max = expected === 'assistant' ? PLAN_HISTORY_ASSISTANT_MAX : PLAN_HISTORY_USER_MAX;
      if (content.length > max) return fail('history', `history[${i}].content must be at most ${max} characters.`);
      history.push({ role: expected, content });
    }
    if (history.length > 0 && history[history.length - 1]?.role !== 'user') {
      return fail('history', 'history must end with the visitor\'s change request (role "user").');
    }
  }

  return {
    ok: true,
    value: {
      locale,
      countries,
      interests,
      days: daysRaw,
      month: month?.month,
      year: month?.year,
      travellers,
      pace,
      notes,
      history,
    },
  };
}

// ---------------------------------------------------------------------------
// Format labels (the model is told to use exactly these; drafts flagged for native review)
// ---------------------------------------------------------------------------

export interface PlanLabels {
  /** "Day" in "## Day 3 — Title". */
  day: string;
  /** "Overnight" in "Overnight: Telavi". */
  overnight: string;
  /** Heading "### Why this route". */
  why: string;
}

export const PLAN_LABELS: Readonly<Record<Locale, PlanLabels>> = {
  en: { day: 'Day', overnight: 'Overnight', why: 'Why this route' },
  ka: { day: 'დღე', overnight: 'ღამისთევა', why: 'რატომ ეს მარშრუტი' },
  pl: { day: 'Dzień', overnight: 'Nocleg', why: 'Dlaczego ta trasa' },
  it: { day: 'Giorno', overnight: 'Pernottamento', why: 'Perché questo itinerario' },
  de: { day: 'Tag', overnight: 'Übernachtung', why: 'Warum diese Route' },
};

const OVERNIGHT_LABELS = [...new Set(Object.values(PLAN_LABELS).map((l) => l.overnight))];

// ---------------------------------------------------------------------------
// Route tag
// ---------------------------------------------------------------------------

const ROUTE_OPEN = '<route>';
const ROUTE_TAG_RE = /(?:`{3}[a-z]*\s*)?<route>([\s\S]*?)<\/route>(?:\s*`{3})?/i;

export interface RouteExtraction {
  /** The plan without the route tag (trimmed at the end). */
  text: string;
  /** Valid place ids in visiting order (consecutive duplicates collapsed). */
  ids: PlaceId[];
  /** Ids the model produced that are not in places.ts (dropped). */
  invalid: string[];
  /** True when a complete <route>…</route> tag was found. */
  found: boolean;
}

/** Parses the JSON array inside a route tag and keeps only known place ids. */
export function parseRouteIds(inner: string): { ids: PlaceId[]; invalid: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(inner.trim());
  } catch {
    // Be lenient with quotes/whitespace: pull out anything id-shaped.
    parsed = inner.match(/[a-z][a-z-]*[a-z]/gi) ?? [];
  }
  const ids: PlaceId[] = [];
  const invalid: string[] = [];
  if (!Array.isArray(parsed)) return { ids, invalid };
  for (const raw of parsed) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim().toLowerCase();
    if (!isPlaceId(id)) {
      if (id && invalid.length < 20) invalid.push(id.slice(0, 40));
      continue;
    }
    if (ids[ids.length - 1] !== id) ids.push(id);
    if (ids.length >= PLAN_ROUTE_MAX) break;
  }
  return { ids, invalid };
}

/** Splits a complete plan into display text + validated route ids. */
export function extractRoute(full: string): RouteExtraction {
  const match = ROUTE_TAG_RE.exec(full);
  if (!match) {
    // An unterminated tag (e.g. truncated output) must not be shown either.
    const open = full.toLowerCase().lastIndexOf(ROUTE_OPEN);
    const text = open === -1 ? full : full.slice(0, open);
    return { text: text.trimEnd(), ids: [], invalid: [], found: false };
  }
  const { ids, invalid } = parseRouteIds(match[1] ?? '');
  const text = `${full.slice(0, match.index).trimEnd()}\n${full.slice(match.index + match[0].length).trim()}`.trimEnd();
  return { text, ids, invalid, found: true };
}

/**
 * Display text while the plan is still streaming: removes a complete route
 * tag, hides an open one, and holds back a trailing prefix such as "<rou".
 */
export function visiblePlanText(partial: string): string {
  if (ROUTE_TAG_RE.test(partial)) return extractRoute(partial).text;
  const lower = partial.toLowerCase();
  const open = lower.lastIndexOf(ROUTE_OPEN.slice(0, 6)); // "<route" (with or without ">")
  if (open !== -1) return partial.slice(0, open).replace(/`{3}[a-z]*\s*$/i, '').trimEnd();
  for (let k = Math.min(ROUTE_OPEN.length - 1, partial.length); k > 0; k--) {
    if (lower.endsWith(ROUTE_OPEN.slice(0, k))) return partial.slice(0, -k);
  }
  // Hold back a fence that may wrap the tag.
  return partial.replace(/\n`{1,3}[a-z]*$/i, '');
}

// ---------------------------------------------------------------------------
// Markdown structure
// ---------------------------------------------------------------------------

export interface PlanDay {
  number: number;
  title: string;
  bullets: string[];
  /** Text after "Overnight:" (may be "—" on the departure day), or undefined. */
  overnight: string | undefined;
}

export interface ParsedPlan {
  /** Everything before the first day heading (incl. a demo note line). */
  intro: string;
  days: PlanDay[];
  /** Heading text of the "Why this route" section, if present. */
  whyTitle: string | undefined;
  why: string[];
  /** Text after the why bullets (the invitation to send the plan). */
  closing: string;
}

const DAY_HEADING_RE = /^##(?!#)\s*[^\d\n]{0,30}?(\d{1,2})\s*(?:[—–:.-]\s*)?(.*)$/;
/** Any other heading after the days (normally "### Why this route"). */
const HEADING_RE = /^#{2,4}\s+(.+?)\s*#*\s*$/;
const BULLET_RE = /^\s*(?:[-*•]|\d+[.)])\s+(.+)$/;
const OVERNIGHT_RE = new RegExp(
  `^\\s*[*_]{0,2}(?:${OVERNIGHT_LABELS.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})[*_]{0,2}\\s*:\\s*[*_]{0,2}\\s*(.+?)\\s*[*_]{0,2}\\s*$`,
  'iu',
);

/** Removes the simplest inline Markdown (bold/italic/code) from a line. */
export function inlinePlain(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,;:!?]|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim();
}

/**
 * Parses the itinerary Markdown into a structure (tolerant: works on partial
 * streams and with any of the five label sets). The route tag is ignored.
 */
export function parsePlan(markdown: string): ParsedPlan {
  const text = extractRoute(markdown).text;
  const plan: ParsedPlan = { intro: '', days: [], whyTitle: undefined, why: [], closing: '' };
  const intro: string[] = [];
  const closing: string[] = [];
  let section: 'intro' | 'day' | 'why' | 'closing' = 'intro';
  let day: PlanDay | undefined;

  for (const line of text.split('\n')) {
    const dayMatch = DAY_HEADING_RE.exec(line);
    if (dayMatch) {
      day = { number: Number(dayMatch[1]), title: inlinePlain(dayMatch[2] ?? ''), bullets: [], overnight: undefined };
      plan.days.push(day);
      section = 'day';
      continue;
    }
    const heading = HEADING_RE.exec(line);
    if (heading && (section !== 'intro' || /^###(?!#)/.test(line))) {
      plan.whyTitle = inlinePlain(heading[1] ?? '');
      section = 'why';
      continue;
    }
    if (section === 'intro') {
      intro.push(line);
      continue;
    }
    if (section === 'day' && day) {
      const overnight = OVERNIGHT_RE.exec(line);
      if (overnight) {
        day.overnight = inlinePlain(overnight[1] ?? '');
        continue;
      }
      const bullet = BULLET_RE.exec(line);
      if (bullet) day.bullets.push(inlinePlain(bullet[1] ?? ''));
      else if (line.trim() && day.bullets.length) {
        day.bullets[day.bullets.length - 1] += ` ${inlinePlain(line)}`;
      }
      continue;
    }
    if (section === 'why') {
      const bullet = BULLET_RE.exec(line);
      if (bullet) {
        plan.why.push(inlinePlain(bullet[1] ?? ''));
        continue;
      }
      if (!line.trim()) continue;
      if (plan.why.length) section = 'closing';
      else continue;
    }
    closing.push(line);
  }
  plan.intro = intro.join('\n').trim();
  plan.closing = closing.join('\n').trim();
  return plan;
}

// ---------------------------------------------------------------------------
// Provisional route from place names (while streaming, before the tag arrives)
// ---------------------------------------------------------------------------

const GENERIC_WORDS =
  /\b(fortress|monastery|church|trinity|temple|valley|canyon|lake|cave|rock art|massif|gorge|mountain|castle)\b/gi;

let nameIndex: { name: string; id: PlaceId }[] | null = null;

/** Lower-case aliases (all five languages, parentheticals, English stems) → id; longest first. */
function placeNameIndex(): { name: string; id: PlaceId }[] {
  if (nameIndex) return nameIndex;
  const seen = new Map<string, PlaceId>();
  const add = (alias: string, id: PlaceId) => {
    const a = alias.trim().toLowerCase();
    if (a.length >= 4 && !seen.has(a)) seen.set(a, id);
  };
  for (const place of PLACES) {
    for (const name of Object.values(place.names)) {
      add(name, place.id);
      const paren = /^(.*?)\s*\((.+)\)\s*$/.exec(name);
      if (paren) {
        add(paren[1] ?? '', place.id);
        add(paren[2] ?? '', place.id);
      }
    }
    const stem = place.names.en.replace(/\(.*?\)/g, '').replace(GENERIC_WORDS, '').replace(/\s+/g, ' ').trim();
    for (const part of stem.split('&')) add(part, place.id);
    add(place.id.replace(/-/g, ' '), place.id);
  }
  nameIndex = [...seen.entries()].map(([name, id]) => ({ name, id })).sort((a, b) => b.name.length - a.name.length);
  return nameIndex;
}

const LETTER = /\p{L}/u;

/** Place ids mentioned in `text`, in order of appearance (no overlapping matches). */
export function findPlaceMentions(text: string): PlaceId[] {
  const lower = text.toLowerCase();
  const taken: [number, number][] = [];
  const hits: { pos: number; id: PlaceId }[] = [];
  for (const { name, id } of placeNameIndex()) {
    let from = 0;
    for (;;) {
      const pos = lower.indexOf(name, from);
      if (pos === -1) break;
      from = pos + name.length;
      const before = pos > 0 ? lower[pos - 1] ?? '' : '';
      const after = lower[pos + name.length] ?? '';
      // Allow Georgian/Polish case endings after the name (e.g. "თბილისში", "Tbilisi-ში").
      const boundaryOk = !LETTER.test(before) && (!LETTER.test(after) || /[ა-ჿ]/.test(after));
      if (!boundaryOk) continue;
      if (taken.some(([s, e]) => pos < e && pos + name.length > s)) continue;
      taken.push([pos, pos + name.length]);
      hits.push({ pos, id });
    }
  }
  return hits.sort((a, b) => a.pos - b.pos).map((h) => h.id);
}

/**
 * Best-effort route from day titles + "Overnight:" lines, for drawing the map
 * while the plan is still streaming. The final `<route>` tag replaces it.
 */
export function guessRouteFromPlan(markdown: string): PlaceId[] {
  const ids: PlaceId[] = [];
  for (const day of parsePlan(markdown).days) {
    for (const id of [...findPlaceMentions(day.title), ...findPlaceMentions(day.overnight ?? '')]) {
      if (ids[ids.length - 1] !== id) ids.push(id);
    }
  }
  return ids.slice(0, PLAN_ROUTE_MAX);
}
