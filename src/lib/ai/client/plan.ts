/**
 * AI Trip Designer — headless browser module (BROWSER-SAFE: no SDK, no
 * secrets, no knowledge base). Talks to POST /api/plan and turns the stream
 * into display text, a validated route and a structured plan.
 *
 *   import { planTrip, refinePlan, buildMailto, planErrorMessage } from '../lib/ai/client/plan';
 *
 *   const outcome = await planTrip(
 *     { locale: 'en', countries: ['GE'], interests: ['culture', 'wine'], days: 7, month: '2027-05' },
 *     {
 *       onText: (markdown) => render(markdown),          // route tag + [[markers]] already stripped
 *       onRoute: ({ places, final }) => drawRoute(places), // provisional while streaming, then final
 *       onDone: (result) => { if (result.mode === 'demo') showBadge(); mail.href = buildMailto(result); },
 *       onError: (err) => showMessage(err.message),     // localised; err.partialText kept for retries
 *       signal: controller.signal,                       // abort → resolves {ok:false, aborted:true}, no onError
 *     },
 *   );
 *   // later: refinePlan(result, 'Make day 3 more relaxed', callbacks)
 *
 * Stream status markers (see markers.ts):
 *   [[refusal]]    → onText('') + onError({code:'refusal'}) — the partial text is discarded
 *   [[truncated]]  → onDone with result.truncated = true (route guessed from the text)
 *   [[error:code]] → onError({code, partialText})
 */
import { postAiStream } from '../client';
import { LOCALE_INFO, normalizeLocale } from '../locales';
import { placeName } from '../places';
import type { AiMode, CountryCode, ExperienceId, Locale, PlaceId } from '../types';
import {
  PLAN_ENDPOINT,
  PLAN_HISTORY_ASSISTANT_MAX,
  PLAN_HISTORY_MAX_TURNS,
  PLAN_HISTORY_TOTAL_MAX,
  PLAN_HISTORY_USER_MAX,
  PLAN_LABELS,
  MONTHS_EN,
  extractRoute,
  guessRouteFromPlan,
  parseMonth,
  parsePlan,
  visiblePlanText,
  type Pace,
  type ParsedPlan,
  type PlanRequest,
  type PlanTurn,
  type TravellerType,
} from './plan-format';
import { placeInfo, type PlaceInfo } from './place-info';

export * from './plan-format';
export type { PlaceInfo } from './place-info';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlanRoute {
  /** Validated place ids in visiting order (consecutive duplicates collapsed). */
  ids: PlaceId[];
  /** Localised names + map coordinates (`MAP_VIEWBOX`) for each id, same order. */
  places: PlaceInfo[];
  /** false while streaming (guessed from day titles / overnight lines), true at the end. */
  final: boolean;
}

export interface PlanResult {
  mode: AiMode;
  locale: Locale;
  /** The request as sent (handy for refinements and the email). */
  request: PlanRequest;
  /** Display Markdown: no route tag, no status marker. */
  text: string;
  /** Full answer including the route tag — send this back as the assistant turn in `history`. */
  raw: string;
  route: PlaceId[];
  places: PlaceInfo[];
  /** "tag" = from the model's <route> tag; "guess" = recovered from the text (tag missing, e.g. truncated). */
  routeSource: 'tag' | 'guess';
  /** Ids the model put in the tag that are not in places.ts (dropped). */
  invalidRouteIds: string[];
  /** Structured view: intro, days[{number,title,bullets,overnight}], why[], closing. */
  plan: ParsedPlan;
  /** The answer hit the output limit; the text is usable but incomplete. */
  truncated: boolean;
  /** Demo mode: the ready-made sample shown instead of a plan for this request. */
  sample: PlanSample | null;
}

/** The trip a demo sample covers (from the X-AI-Sample-Trip header). */
export interface PlanSample {
  countries: CountryCode[];
  interests: ExperienceId[];
  days: number;
  /** Language the sample is written in. */
  locale: Locale;
}

export interface PlanError {
  /** Server code (e.g. "rate_limited", "refusal", "upstream_overloaded", "bad_request"), "network" or "aborted". */
  code: string;
  /** Localised, user-facing message (see planErrorMessage). */
  message: string;
  /** English detail from the server (e.g. which field was invalid), if any. */
  detail?: string;
  /** HTTP status (0 = no response). */
  status: number;
  mode: AiMode;
  /** Seconds to wait before retrying (rate limits), if the server said so. */
  retryAfter?: number;
  /** Text streamed before a mid-stream error (empty on refusal: it must not be shown). */
  partialText: string;
  refusal: boolean;
}

export type PlanOutcome =
  | { ok: true; result: PlanResult }
  | { ok: false; aborted: boolean; error: PlanError };

export interface PlanCallbacks {
  /** Display Markdown so far (route tag and markers stripped). Called with '' on refusal. */
  onText?: (markdown: string) => void;
  /** Route updates: provisional while streaming (only when it changes), then once with final: true. */
  onRoute?: (route: PlanRoute) => void;
  onDone?: (result: PlanResult) => void;
  /** Demo mode: which sample is coming, as soon as the answer starts. */
  onSample?: (sample: PlanSample) => void;
  /** Not called when the request was aborted through `signal`. */
  onError?: (error: PlanError) => void;
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Localised UI strings (drafts — native review pending for ka/pl/it/de)
// ---------------------------------------------------------------------------

export type PlanMessageKey =
  | 'refusal'
  | 'rate_limited'
  | 'daily_cap'
  | 'busy'
  | 'network'
  | 'bad_request'
  | 'generic'
  | 'truncated'
  | 'demo';

export const PLAN_MESSAGES: Readonly<Record<Locale, Record<PlanMessageKey, string>>> = {
  en: {
    refusal: "Sorry, we can't plan this request. Please rephrase it, or write to the Local Host team at info@localhost.ge.",
    rate_limited: "You've designed several trips in a short time. Please wait a few minutes and try again.",
    daily_cap: "The trip designer has reached today's limit. Please try again tomorrow, or write to info@localhost.ge.",
    busy: 'The AI planner is busy right now. Please try again in a minute.',
    network: 'The connection was interrupted. Please check your internet connection and try again.',
    bad_request: 'Please check your choices in the form and try again.',
    generic: 'Something went wrong. Please try again, or write to info@localhost.ge.',
    truncated: 'This plan was cut short. Try fewer days or shorter notes — or send it to the team as it is.',
    demo: 'Demo — sample itinerary',
  },
  ka: {
    refusal: 'სამწუხაროდ, ამ მოთხოვნისთვის გეგმას ვერ შევადგენთ. გთხოვთ, სხვაგვარად ჩამოაყალიბოთ ან მოგვწეროთ: info@localhost.ge.',
    rate_limited: 'მოკლე დროში რამდენიმე მოგზაურობა დაგეგმეთ. გთხოვთ, რამდენიმე წუთი მოიცადოთ და თავიდან სცადოთ.',
    daily_cap: 'მარშრუტის დამგეგმავმა დღევანდელ ლიმიტს მიაღწია. გთხოვთ, ხვალ სცადოთ ან მოგვწეროთ: info@localhost.ge.',
    busy: 'AI დამგეგმავი ახლა დაკავებულია. გთხოვთ, ერთ წუთში სცადოთ.',
    network: 'კავშირი გაწყდა. შეამოწმეთ ინტერნეტკავშირი და თავიდან სცადეთ.',
    bad_request: 'გთხოვთ, შეამოწმოთ ფორმაში არჩეული პარამეტრები და თავიდან სცადოთ.',
    generic: 'რაღაც შეცდომა მოხდა. გთხოვთ, თავიდან სცადოთ ან მოგვწეროთ: info@localhost.ge.',
    truncated: 'გეგმა ბოლომდე ვერ დაიწერა. სცადეთ ნაკლები დღე ან უფრო მოკლე შენიშვნები — ან გამოგვიგზავნეთ ისე, როგორც არის.',
    demo: 'დემო — მარშრუტის ნიმუში',
  },
  pl: {
    refusal: 'Niestety nie możemy przygotować planu dla tej prośby. Spróbuj ją sformułować inaczej albo napisz do zespołu Local Host: info@localhost.ge.',
    rate_limited: 'W krótkim czasie zaplanowano kilka podróży. Odczekaj kilka minut i spróbuj ponownie.',
    daily_cap: 'Planer podróży osiągnął dzisiejszy limit. Spróbuj jutro albo napisz na info@localhost.ge.',
    busy: 'Planer AI jest teraz zajęty. Spróbuj ponownie za minutę.',
    network: 'Połączenie zostało przerwane. Sprawdź internet i spróbuj ponownie.',
    bad_request: 'Sprawdź wybrane opcje w formularzu i spróbuj ponownie.',
    generic: 'Coś poszło nie tak. Spróbuj ponownie albo napisz na info@localhost.ge.',
    truncated: 'Plan został ucięty. Wybierz mniej dni lub skróć uwagi — albo wyślij go zespołowi w tej postaci.',
    demo: 'Demo — przykładowy plan',
  },
  it: {
    refusal: 'Purtroppo non possiamo pianificare questa richiesta. Provate a riformularla oppure scrivete al team di Local Host: info@localhost.ge.',
    rate_limited: 'Avete creato diversi viaggi in poco tempo. Attendete qualche minuto e riprovate.',
    daily_cap: 'Il pianificatore ha raggiunto il limite di oggi. Riprovate domani oppure scrivete a info@localhost.ge.',
    busy: 'Il pianificatore AI è occupato in questo momento. Riprovate tra un minuto.',
    network: 'La connessione si è interrotta. Controllate la connessione a internet e riprovate.',
    bad_request: 'Controllate le scelte nel modulo e riprovate.',
    generic: 'Qualcosa è andato storto. Riprovate oppure scrivete a info@localhost.ge.',
    truncated: "Il programma è stato interrotto. Provate con meno giorni o note più brevi, oppure inviatelo al team così com'è.",
    demo: 'Demo — itinerario di esempio',
  },
  de: {
    refusal: 'Leider können wir für diese Anfrage keinen Plan erstellen. Bitte formulieren Sie sie anders oder schreiben Sie dem Local-Host-Team: info@localhost.ge.',
    rate_limited: 'Sie haben in kurzer Zeit mehrere Reisen geplant. Bitte warten Sie einige Minuten und versuchen Sie es erneut.',
    daily_cap: 'Der Reiseplaner hat sein heutiges Limit erreicht. Bitte versuchen Sie es morgen erneut oder schreiben Sie an info@localhost.ge.',
    busy: 'Der KI-Planer ist gerade ausgelastet. Bitte versuchen Sie es in einer Minute erneut.',
    network: 'Die Verbindung wurde unterbrochen. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    bad_request: 'Bitte prüfen Sie Ihre Angaben im Formular und versuchen Sie es erneut.',
    generic: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut oder schreiben Sie an info@localhost.ge.',
    truncated: 'Der Plan wurde abgeschnitten. Wählen Sie weniger Tage oder kürzere Anmerkungen — oder senden Sie ihn so an das Team.',
    demo: 'Demo — Beispielroute',
  },
};

/** Maps an error code (server, marker or client) to a message key. */
export function planMessageKey(code: string): PlanMessageKey {
  switch (code) {
    case 'refusal':
    case 'rate_limited':
    case 'daily_cap':
    case 'network':
    case 'bad_request':
    case 'truncated':
      return code;
    case 'upstream_rate_limited':
    case 'upstream_overloaded':
    case 'upstream_timeout':
      return 'busy';
    case 'invalid_json':
    case 'payload_too_large':
    case 'unsupported_media_type':
      return 'bad_request';
    default:
      return 'generic';
  }
}

/** Localised user-facing message for an error code. */
export function planErrorMessage(code: string, locale: Locale): string {
  return PLAN_MESSAGES[normalizeLocale(locale)][planMessageKey(code)];
}

// ---------------------------------------------------------------------------
// planTrip / refinePlan
// ---------------------------------------------------------------------------

/** PlaceInfo for each id, in order (unknown ids skipped). */
export function routePlaces(ids: readonly string[], locale: Locale): PlaceInfo[] {
  const out: PlaceInfo[] = [];
  for (const id of ids) {
    const info = placeInfo(id, locale);
    if (info) out.push(info);
  }
  return out;
}

/** "GE,AM;trekking,pilgrim;10;en" → PlanSample (null if it does not parse). */
export function parseSampleTrip(header: string | null): PlanSample | null {
  if (!header) return null;
  const [c = '', i = '', d = '', l = ''] = header.split(';');
  const countries = c.split(',').filter((x): x is CountryCode => x in COUNTRY_LABELS.en);
  const interests = i.split(',').filter((x): x is ExperienceId => x in EXPERIENCE_LABELS.en);
  const days = Number(d);
  if (!countries.length || !Number.isInteger(days) || days < 1) return null;
  return { countries, interests, days, locale: normalizeLocale(l) };
}

/** POSTs the form to /api/plan and streams the itinerary. Never throws. */
export async function planTrip(params: PlanRequest, callbacks: PlanCallbacks = {}): Promise<PlanOutcome> {
  const { onText, onRoute, onDone, onSample, onError, signal } = callbacks;
  const locale = normalizeLocale(params.locale);
  const request: PlanRequest = { ...params, locale };

  let shown: string | null = null;
  let routeKey = '';
  const emitRoute = (ids: PlaceId[], final: boolean) => {
    const key = `${final ? 'F' : 'P'}:${ids.join(',')}`;
    if (key === routeKey || (!final && ids.length === 0)) return;
    routeKey = key;
    onRoute?.({ ids, places: routePlaces(ids, locale), final });
  };
  const show = (markdown: string) => {
    if (markdown === shown) return;
    shown = markdown;
    onText?.(markdown);
  };

  let sample: PlanSample | null = null;
  const r = await postAiStream(PLAN_ENDPOINT, request, {
    ...(signal ? { signal } : {}),
    onHeaders: (headers) => {
      sample = parseSampleTrip(headers.get('x-ai-sample-trip'));
      if (sample) onSample?.(sample);
    },
    onText: (visible) => {
      const markdown = visiblePlanText(visible);
      show(markdown);
      if (markdown) emitRoute(guessRouteFromPlan(markdown), false);
    },
  });

  if (r.aborted) {
    return { ok: false, aborted: true, error: makeError('aborted', r, locale, visiblePlanText(r.text)) };
  }
  if (r.refusal) {
    show('');
    const error = makeError('refusal', r, locale, '');
    onError?.(error);
    return { ok: false, aborted: false, error };
  }
  if (!r.ok || r.error) {
    const error = makeError(r.error ?? 'generic', r, locale, visiblePlanText(r.text));
    onError?.(error);
    return { ok: false, aborted: false, error };
  }

  const { text, ids, invalid } = extractRoute(r.text);
  const fromTag = ids.length > 0;
  const route = fromTag ? ids : guessRouteFromPlan(text);
  show(text);
  emitRoute(route, true);
  const result: PlanResult = {
    mode: r.mode,
    locale,
    request,
    text,
    raw: r.text.trim(),
    route,
    places: routePlaces(route, locale),
    routeSource: fromTag ? 'tag' : 'guess',
    invalidRouteIds: invalid,
    plan: parsePlan(text),
    truncated: r.truncated,
    sample,
  };
  onDone?.(result);
  return { ok: true, result };
}

function makeError(
  code: string,
  r: { status: number; mode: AiMode; message?: string; retryAfter?: number },
  locale: Locale,
  partialText: string,
): PlanError {
  return {
    code,
    message: planErrorMessage(code, locale),
    ...(r.message ? { detail: r.message } : {}),
    status: r.status,
    mode: r.mode,
    ...(r.retryAfter !== undefined ? { retryAfter: r.retryAfter } : {}),
    partialText,
    refusal: code === 'refusal',
  };
}

/** Cuts text to `max` chars at a line (or word) boundary. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const at = Math.max(cut.lastIndexOf('\n'), cut.lastIndexOf(' '));
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).trimEnd()}…`;
}

/**
 * The `history` for a refinement: earlier turns + the previous plan
 * (assistant) + the visitor's change (user). Oldest plan/change pairs are
 * dropped to stay within 10 turns and 48,000 characters.
 */
export function refinementHistory(previous: Pick<PlanResult, 'raw' | 'request'>, change: string): PlanTurn[] {
  let raw = previous.raw;
  if (raw.length > PLAN_HISTORY_ASSISTANT_MAX) {
    // Keep the route tag at the end so the model still sees the format.
    const tag = /<route>[\s\S]*?<\/route>\s*$/i.exec(raw)?.[0] ?? '';
    raw = `${clip(raw.slice(0, raw.length - tag.length), PLAN_HISTORY_ASSISTANT_MAX - tag.length - 2)}\n${tag}`.trim();
  }
  const turns: PlanTurn[] = [
    ...(previous.request.history ?? []),
    { role: 'assistant', content: raw },
    { role: 'user', content: clip(change.trim(), PLAN_HISTORY_USER_MAX) },
  ];
  const size = (list: PlanTurn[]) => list.reduce((n, t) => n + t.content.length, 0);
  while (turns.length > 2 && (turns.length > PLAN_HISTORY_MAX_TURNS || size(turns) > PLAN_HISTORY_TOTAL_MAX)) {
    turns.splice(0, 2);
  }
  return turns;
}

/** Re-plans with a change request ("Make day 3 more relaxed"), keeping the original form fields. */
export function refinePlan(previous: PlanResult, change: string, callbacks: PlanCallbacks = {}): Promise<PlanOutcome> {
  return planTrip({ ...previous.request, history: refinementHistory(previous, change) }, callbacks);
}

// ---------------------------------------------------------------------------
// "Send this plan to Local Host" — mailto link
// ---------------------------------------------------------------------------

export const PLAN_EMAIL = 'info@localhost.ge';
/** Max characters of subject + body (before URL encoding) — long mailto links break in some mail clients. */
export const MAILTO_MAX_CHARS = 1800;

const COUNTRY_LABELS: Readonly<Record<Locale, Record<CountryCode, string>>> = {
  en: { GE: 'Georgia', AM: 'Armenia', AZ: 'Azerbaijan' },
  ka: { GE: 'საქართველო', AM: 'სომხეთი', AZ: 'აზერბაიჯანი' },
  pl: { GE: 'Gruzja', AM: 'Armenia', AZ: 'Azerbejdżan' },
  it: { GE: 'Georgia', AM: 'Armenia', AZ: 'Azerbaigian' },
  de: { GE: 'Georgien', AM: 'Armenien', AZ: 'Aserbaidschan' },
};

/** Same names as the knowledge base / site (src/lib/ai/knowledge.ts EXPERIENCES). */
const EXPERIENCE_LABELS: Readonly<Record<Locale, Record<ExperienceId, string>>> = {
  en: { culture: 'Culture', wine: 'Wine', trekking: 'Trekking', gastronomy: 'Gastronomy', pilgrim: 'Pilgrim', leisure: 'Leisure' },
  ka: { culture: 'კულტურა', wine: 'ღვინო', trekking: 'ლაშქრობა', gastronomy: 'გასტრონომია', pilgrim: 'მომლოცველობა', leisure: 'დასვენება' },
  pl: { culture: 'Kultura', wine: 'Wino', trekking: 'Trekking', gastronomy: 'Gastronomia', pilgrim: 'Pielgrzymki', leisure: 'Wypoczynek' },
  it: { culture: 'Cultura', wine: 'Vino', trekking: 'Trekking', gastronomy: 'Gastronomia', pilgrim: 'Pellegrinaggi', leisure: 'Relax' },
  de: { culture: 'Kultur', wine: 'Wein', trekking: 'Trekking', gastronomy: 'Gastronomie', pilgrim: 'Pilgerreisen', leisure: 'Erholung' },
};

const TRAVELLER_LABELS: Readonly<Record<Locale, Record<TravellerType, string>>> = {
  en: { solo: 'Solo traveller', couple: 'Couple', family: 'Family', friends: 'Friends', group: 'Group', agency: 'Travel agency' },
  ka: { solo: 'მარტო მოგზაური', couple: 'წყვილი', family: 'ოჯახი', friends: 'მეგობრები', group: 'ჯგუფი', agency: 'ტურისტული სააგენტო' },
  pl: { solo: 'Podróż solo', couple: 'Para', family: 'Rodzina', friends: 'Przyjaciele', group: 'Grupa', agency: 'Biuro podróży' },
  it: { solo: 'Viaggiatore singolo', couple: 'Coppia', family: 'Famiglia', friends: 'Amici', group: 'Gruppo', agency: 'Agenzia di viaggi' },
  de: { solo: 'Alleinreisend', couple: 'Paar', family: 'Familie', friends: 'Freunde', group: 'Gruppe', agency: 'Reisebüro' },
};

const PACE_LABELS: Readonly<Record<Locale, Record<Pace, string>>> = {
  en: { relaxed: 'Relaxed', balanced: 'Balanced', active: 'Active' },
  ka: { relaxed: 'მშვიდი', balanced: 'დაბალანსებული', active: 'აქტიური' },
  pl: { relaxed: 'Spokojne', balanced: 'Zrównoważone', active: 'Aktywne' },
  it: { relaxed: 'Rilassato', balanced: 'Equilibrato', active: 'Attivo' },
  de: { relaxed: 'Entspannt', balanced: 'Ausgewogen', active: 'Aktiv' },
};

interface MailText {
  subject: string;
  intro: string;
  countries: string;
  interests: string;
  length: string;
  days: string;
  month: string;
  flexible: string;
  travellers: string;
  pace: string;
  route: string;
  notes: string;
  plan: string;
  /** Demo mode: intro for an email that carries the visitor's choices only. */
  demo: string;
  shortened: string;
  moreDays: string;
  footer: string;
}

const MAIL_TEXT: Readonly<Record<Locale, MailText>> = {
  en: {
    subject: 'Trip plan request: {summary}',
    intro:
      'Hello Local Host team,\n\nI designed this trip with the trip designer on localhost.ge. Could you please confirm the details and send me a tailored proposal?',
    countries: 'Countries', interests: 'Interests', length: 'Length', days: '{n} days', month: 'Travel month',
    flexible: 'flexible', travellers: 'Travellers', pace: 'Pace', route: 'Route', notes: 'My notes', plan: 'Draft itinerary',
    demo:
      'Hello Local Host team,\n\nI filled in the trip designer on localhost.ge. It showed me a sample itinerary because the AI planner isn’t live yet, so here are my own choices. Could you please send me a tailored proposal?',
    shortened: '(Shortened for email — I can send the full plan on request.)',
    moreDays: '… and {n} more days',
    footer: 'Name:\nPreferred dates:\nNumber of travellers:\n\nThank you!',
  },
  ka: {
    subject: 'მოგზაურობის გეგმის მოთხოვნა: {summary}',
    intro:
      'გამარჯობა, Local Host-ის გუნდო!\n\nეს მოგზაურობა localhost.ge-ზე, მარშრუტის დამგეგმავით შევადგინე. გთხოვთ, დამიდასტუროთ დეტალები და გამომიგზავნოთ ინდივიდუალური შეთავაზება.',
    countries: 'ქვეყნები', interests: 'ინტერესები', length: 'ხანგრძლივობა', days: '{n} დღე', month: 'მოგზაურობის თვე',
    flexible: 'მოქნილი', travellers: 'მოგზაურები', pace: 'ტემპი', route: 'მარშრუტი', notes: 'ჩემი შენიშვნები', plan: 'მარშრუტის პროექტი',
    demo:
      'გამარჯობა, Local Host-ის გუნდო!\n\nlocalhost.ge-ზე მარშრუტის დამგეგმავი შევავსე. AI დამგეგმავი ჯერ არ მუშაობს, ამიტომ მარშრუტის ნიმუში მაჩვენა — ქვემოთ ჩემს არჩევანს გიგზავნით. გთხოვთ, გამომიგზავნოთ ინდივიდუალური შეთავაზება.',
    shortened: '(ელფოსტისთვის შემოკლებულია — სრულ გეგმას მოთხოვნისთანავე გამოგიგზავნით.)',
    moreDays: '… და კიდევ {n} დღე',
    footer: 'სახელი:\nსასურველი თარიღები:\nმოგზაურთა რაოდენობა:\n\nგმადლობთ!',
  },
  pl: {
    subject: 'Prośba o plan podróży: {summary}',
    intro:
      'Dzień dobry, zespole Local Host,\n\nprzygotowałem/-am tę podróż w planerze na stronie localhost.ge. Proszę o potwierdzenie szczegółów i indywidualną ofertę.',
    countries: 'Kraje', interests: 'Zainteresowania', length: 'Długość', days: '{n} dni', month: 'Miesiąc podróży',
    flexible: 'elastyczny', travellers: 'Podróżni', pace: 'Tempo', route: 'Trasa', notes: 'Moje uwagi', plan: 'Wstępny plan',
    demo:
      'Dzień dobry, zespole Local Host,\n\nwypełniłem/-am planer podróży na stronie localhost.ge. Pokazał przykładowy plan, bo planer AI nie jest jeszcze aktywny, dlatego przesyłam moje wybory. Proszę o indywidualną ofertę.',
    shortened: '(Skrócone na potrzeby e-maila — pełny plan mogę przesłać na życzenie.)',
    moreDays: '… i jeszcze {n} dni',
    footer: 'Imię i nazwisko:\nPreferowane terminy:\nLiczba podróżnych:\n\nDziękuję!',
  },
  it: {
    subject: 'Richiesta di programma di viaggio: {summary}',
    intro:
      'Buongiorno team di Local Host,\n\nho creato questo viaggio con il pianificatore sul sito localhost.ge. Potreste confermare i dettagli e inviarmi una proposta su misura?',
    countries: 'Paesi', interests: 'Interessi', length: 'Durata', days: '{n} giorni', month: 'Mese del viaggio',
    flexible: 'flessibile', travellers: 'Viaggiatori', pace: 'Ritmo', route: 'Itinerario', notes: 'Le mie note', plan: 'Bozza del programma',
    demo:
      "Buongiorno team di Local Host,\n\nho compilato il pianificatore sul sito localhost.ge. Mi ha mostrato un itinerario di esempio perché il pianificatore AI non è ancora attivo, quindi vi invio le mie scelte. Potreste inviarmi una proposta su misura?",
    shortened: "(Versione ridotta per l'email — posso inviare il programma completo su richiesta.)",
    moreDays: '… e altri {n} giorni',
    footer: 'Nome:\nDate preferite:\nNumero di viaggiatori:\n\nGrazie!',
  },
  de: {
    subject: 'Anfrage Reiseplan: {summary}',
    intro:
      'Hallo Local-Host-Team,\n\nich habe diese Reise mit dem Reiseplaner auf localhost.ge zusammengestellt. Könnten Sie bitte die Details bestätigen und mir ein individuelles Angebot senden?',
    countries: 'Länder', interests: 'Interessen', length: 'Dauer', days: '{n} Tage', month: 'Reisemonat',
    flexible: 'flexibel', travellers: 'Reisende', pace: 'Tempo', route: 'Route', notes: 'Meine Anmerkungen', plan: 'Entwurf des Reiseplans',
    demo:
      'Hallo Local-Host-Team,\n\nich habe den Reiseplaner auf localhost.ge ausgefüllt. Er hat mir eine Beispielroute gezeigt, weil der KI-Planer noch nicht aktiv ist – hier deshalb meine eigenen Angaben. Könnten Sie mir bitte ein individuelles Angebot senden?',
    shortened: '(Für die E-Mail gekürzt — den vollständigen Plan sende ich gerne auf Anfrage.)',
    moreDays: '… und {n} weitere Tage',
    footer: 'Name:\nWunschtermine:\nAnzahl der Reisenden:\n\nVielen Dank!',
  },
};

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

function monthLabel(value: unknown, locale: Locale, t: MailText): string {
  const parsed = parseMonth(value);
  if (!parsed) return t.flexible;
  let name: string = MONTHS_EN[parsed.month - 1] ?? String(parsed.month);
  try {
    name = new Intl.DateTimeFormat(LOCALE_INFO[locale].bcp47, { month: 'long', timeZone: 'UTC' }).format(
      new Date(Date.UTC(2026, parsed.month - 1, 15)),
    );
  } catch {
    /* keep English */
  }
  return parsed.year ? `${name} ${parsed.year}` : name;
}

/** What buildMailto needs; a PlanResult fits. */
export interface MailtoSource {
  /** Display Markdown of the plan (a route tag, if present, is ignored). */
  text: string;
  locale: Locale;
  request?: Partial<PlanRequest>;
  route?: readonly PlaceId[];
  mode?: AiMode;
}

export interface MailtoOptions {
  /** Travel month as the page shows it ("მაისი 2027"); default: formatted here. */
  monthName?: string;
  /** Max characters of subject + body before URL encoding (default 1800). */
  maxChars?: number;
  /** Recipient (default info@localhost.ge). */
  to?: string;
}

/** Subject + plain-text body for the email (exported for previews/tests). */
export function buildEmail(source: MailtoSource, options: MailtoOptions = {}): { subject: string; body: string } {
  const maxChars = options.maxChars ?? MAILTO_MAX_CHARS;
  const locale = normalizeLocale(source.locale);
  const t = MAIL_TEXT[locale];
  const labels = PLAN_LABELS[locale];
  const req = source.request ?? {};
  const plan = parsePlan(source.text);
  const route = source.route?.length ? [...source.route] : extractRoute(source.text).ids;

  const countries = (req.countries ?? []).map((c) => COUNTRY_LABELS[locale][c]).filter(Boolean);
  const days = req.days ?? (plan.days.length || undefined);
  const summary = [countries.join(' & '), days ? fill(t.days, { n: days }) : ''].filter(Boolean).join(', ');
  const subject = fill(t.subject, { summary: summary || 'localhost.ge' });

  const fields: string[] = [];
  if (countries.length) fields.push(`${t.countries}: ${countries.join(', ')}`);
  if (req.interests?.length) fields.push(`${t.interests}: ${req.interests.map((i) => EXPERIENCE_LABELS[locale][i]).join(', ')}`);
  if (days) fields.push(`${t.length}: ${fill(t.days, { n: days })}`);
  if (source.request) fields.push(`${t.month}: ${(req.month && options.monthName) || monthLabel(req.month, locale, t)}`);
  if (req.travellers) fields.push(`${t.travellers}: ${TRAVELLER_LABELS[locale][req.travellers]}`);
  if (req.pace) fields.push(`${t.pace}: ${PACE_LABELS[locale][req.pace]}`);
  if (req.notes?.trim()) fields.push(`${t.notes}: ${clip(req.notes.trim().replace(/\s+/g, ' '), 300)}`);

  const footer = ['', '—', t.footer];
  // Demo mode: the itinerary on screen is a ready-made sample, not this
  // visitor's trip — send their own choices only, with an honest intro.
  if (source.mode === 'demo') {
    return { subject, body: [t.demo, '', ...fields, ...footer].join('\n').replace(/\n{3,}/g, '\n\n') };
  }
  const head = [t.intro, '', ...fields];
  const routeLine = route.length ? `${t.route}: ${route.map((id) => placeName(id, locale)).join(' → ')}` : '';

  const dayHeading = (d: ParsedPlan['days'][number], titleMax = 200) =>
    `${labels.day} ${d.number} — ${clip(d.title, titleMax)}`;
  const full = (withWhy: boolean) => {
    const out: string[] = [];
    for (const d of plan.days) {
      out.push('', dayHeading(d));
      for (const b of d.bullets) out.push(`- ${b}`);
      if (d.overnight) out.push(`${labels.overnight}: ${d.overnight}`);
    }
    if (withWhy && plan.why.length) out.push('', `${plan.whyTitle ?? labels.why}:`, ...plan.why.map((w) => `- ${w}`));
    return out;
  };
  const compact = (titleMax: number) =>
    plan.days.map((d) => `${dayHeading(d, titleMax)}${d.overnight && d.overnight !== '—' ? ` (${labels.overnight}: ${d.overnight})` : ''}`);

  const assemble = (itinerary: string[], withRoute: boolean, shortened: boolean) =>
    [
      ...head,
      ...(withRoute && routeLine ? ['', routeLine] : []),
      '',
      `${t.plan}:`,
      ...itinerary,
      ...(shortened ? ['', t.shortened] : []),
      ...footer,
    ]
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
  const fits = (body: string) => subject.length + body.length <= maxChars;

  // Richest version that fits, then progressively shorter ones.
  const candidates = [
    () => assemble(full(true), true, false),
    () => assemble(full(false), true, false),
    () => assemble(compact(200), true, true),
    () => assemble(compact(200), false, true),
    () => assemble(compact(60), false, true),
  ];
  for (const candidate of candidates) {
    const body = candidate();
    if (fits(body)) return { subject, body };
  }
  // Keep as many days as fit, then say how many were left out.
  const lines = compact(48);
  for (let keep = lines.length - 1; keep >= 1; keep--) {
    const body = assemble([...lines.slice(0, keep), fill(t.moreDays, { n: lines.length - keep })], false, true);
    if (fits(body)) return { subject, body };
  }
  // Last resort (e.g. a huge custom intro): hard cut at a line boundary.
  return { subject, body: clip(assemble([], false, true), Math.max(200, maxChars - subject.length)) };
}

/**
 * mailto:info@localhost.ge link with a localised subject and a plain-text
 * summary of the plan (subject + body ≤ 1800 characters, shortened
 * day by day rather than cut mid-sentence).
 */
export function buildMailto(plan: MailtoSource, options: MailtoOptions = {}): string {
  const { subject, body } = buildEmail(plan, options);
  // Everything is percent-encoded, so plan text cannot add mail headers (cc, bcc…).
  const encode = (s: string) => encodeURIComponent(s.replace(/\r?\n/g, '\r\n'));
  const to = options.to && /^[^\s@,;?&]+@[^\s@,;?&]+$/.test(options.to) ? options.to : PLAN_EMAIL;
  return `mailto:${to}?subject=${encode(subject.replace(/[\r\n]+/g, ' '))}&body=${encode(body)}`;
}
