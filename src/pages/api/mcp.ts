/**
 * /api/mcp — "Local Host for AI assistants": a read-only MCP server.
 *
 * Travel agencies connect Claude (Settings → Connectors → Add custom connector →
 * https://www.localhost.ge/api/mcp) or any other MCP client, and their assistant
 * can then look up Local Host's experiences, places, direct flights, trade fairs,
 * sustainability commitments and contact details, or draft a trip-request email.
 * There is no Claude API key and no LLM call here: the server only serves the
 * catalog data that powers the website. Nothing is booked, sent or priced.
 *
 * Transport: MCP Streamable HTTP through the SDK's
 * WebStandardStreamableHTTPServerTransport (web-standard Request/Response) in
 * STATELESS mode: a new McpServer + transport per request, no Mcp-Session-Id,
 * plain JSON responses (enableJsonResponse), no SSE.
 *
 *   POST     one JSON-RPC message (or a batch of ≤ MAX_BATCH) → JSON, or 202 for notifications only
 *   GET      405 — no server-initiated SSE stream (the spec allows 405)
 *   DELETE   405 — stateless, there is no session to terminate (the spec allows 405)
 *   OPTIONS  CORS preflight (204)
 *   others   405
 *
 * Guards: Origin sanity check, per-IP rate limit (own in-memory buckets, separate
 * from the Claude-backed AI endpoints so MCP traffic never uses up visitors' AI
 * quota), 64 KB body limit, batch limit, zod input schemas, a cap on the size
 * of tool arguments, and sanitised free text.
 *
 * `createMcpServer()` is exported so /ai-lab/dev/mcp can list the very same tool
 * definitions at build time. Docs for owners and agencies: docs/MCP.md.
 */
import type { APIContext, APIRoute } from 'astro';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { CallToolResult, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { asText, clientIp, rateLimitHeaders, type RateLimitResult } from '../../lib/ai/http';
import {
  COMPANY,
  CONTACT,
  COUNTRIES,
  EXPERIENCES,
  SUSTAINABILITY,
  TRAVEL_TIMES,
  findExperience,
  researchData,
  type Experience,
} from '../../lib/ai/knowledge';
import { PLACES, findPlace, placesWhere } from '../../lib/ai/places';
import {
  COUNTRY_CODES,
  EXPERIENCE_IDS,
  type CountryCode,
  type ExperienceId,
  type Place,
} from '../../lib/ai/types';

export const prerender = false;

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

/** The production endpoint agencies paste into their MCP client. */
export const MCP_ENDPOINT = `${CONTACT.url}/api/mcp`;

export const MCP_SERVER_INFO = {
  name: 'local-host',
  title: 'Local Host — South Caucasus DMC',
  version: '1.0.0',
  description:
    'Read-only catalog of Local Host LLC, an inbound tour operator (DMC) in Tbilisi: experiences, places, direct flights, ' +
    'trade fairs, sustainability and contact for Georgia, Armenia and Azerbaijan.',
  websiteUrl: CONTACT.url,
  icons: [{ src: `${CONTACT.url}/favicon.svg`, mimeType: 'image/svg+xml' }],
};

/** Request limits (documented in docs/MCP.md). */
export const MCP_LIMITS = {
  maxBodyBytes: 64 * 1024,
  maxBatch: 20,
  perMinute: 60,
  perHour: 1000,
  maxToolInputElements: 64,
  notesMax: 1000,
} as const;

const SEASON_NOTICE = 'Direct connections vary by season — ask us for the current schedule.';
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
const MONTH_OPTIONS = [...MONTHS, 'flexible'] as const;

/** Sent to the client at `initialize`; MCP clients pass it to the model. */
const SERVER_INSTRUCTIONS = [
  `${COMPANY.name} ("Local Host") is an inbound tour operator / destination management company (DMC) in Tbilisi, Georgia, ` +
    `founded in ${COMPANY.founded}. It designs and operates group and individual journeys across Georgia, Armenia and Azerbaijan, ` +
    'mainly for travel agencies and tour operators.',
  'This server is read-only. It serves Local Host\'s own catalog data; it cannot book, hold, send or price anything.',
  'Guidance for assistants using it:',
  '- Never quote, estimate or compare prices. Local Host prepares tailored quotes: use draft_trip_request, then the agency emails it.',
  `- Flight and trade-fair data is researched and indicative. ${SEASON_NOTICE}`,
  '- Describe Local Host\'s sustainability status only with the Travelife Partner statement from get_sustainability_commitments.',
  '- Seasons, road times and opening periods are typical, not guaranteed. Visa and entry rules depend on nationality; check official sources.',
  '- Place ids come from list_places; get_place also accepts a plain place name.',
  `- Contact: ${CONTACT.email}, ${CONTACT.phone}, ${CONTACT.url}.`,
].join('\n');

const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter((s): s is string => !!s) : []);

/** Removes URLs (and parentheses that only hold sources) from research notes. */
function stripUrls(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const cleaned = text
    .replace(/\s*\([^()]*(https?:|www\.)[^()]*\)/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned || undefined;
}

/** Tool result: pretty JSON for the model + the same object as structuredContent. */
function ok(data: Json): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], structuredContent: data };
}

/** Tool-level error (isError) — the model sees the message and can recover. */
function toolError(message: string): CallToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

const countryName = (code: CountryCode) => COUNTRIES[code].name.en;
const absolute = (path: string) => `${CONTACT.url}${path}`;

function osmUrl(p: Place): string {
  return `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=11/${p.lat}/${p.lon}`;
}

/** Great-circle distance in km. */
function distanceKm(a: Place, b: Place): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function normalizeKey(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Experiences & places
// ---------------------------------------------------------------------------

function placeRef(p: Place) {
  return { id: p.id, name: p.names.en, country: p.country };
}

function experienceSummary(e: Experience) {
  const places = e.places.map((id) => findPlace(id)).filter((p): p is Place => !!p);
  const countries = COUNTRY_CODES.filter((c) => places.some((p) => p.country === c));
  return {
    id: e.id,
    name: e.name.en,
    names: e.name,
    tagline: e.tagline,
    countries: countries.map((c) => ({ code: c, name: countryName(c) })),
    typicalSeasons: e.seasons,
    idealFor: e.idealFor,
  };
}

function experienceDetail(e: Experience) {
  const places = e.places.map((id) => findPlace(id)).filter((p): p is Place => !!p);
  return {
    ...experienceSummary(e),
    description: e.description,
    highlights: e.highlights,
    bestPlaces: places.map((p) => ({ ...placeRef(p), region: p.region })),
    nextStep: `For a programme and quote, use draft_trip_request or email ${CONTACT.email}.`,
  };
}

function placeSummary(p: Place) {
  return {
    id: p.id,
    name: p.names.en,
    country: p.country,
    region: p.region,
    type: p.type,
    experiences: [...p.experiences],
    lat: p.lat,
    lon: p.lon,
  };
}

const GENERIC_NAME_WORDS = new Set([
  'Mount', 'Mountain', 'Mountains', 'Lake', 'Valley', 'Church', 'Fortress', 'Canyon', 'Cave', 'Massif', 'Gorge',
  'Pillar', 'Monastery', 'Temple', 'Trinity', 'Old', 'City', 'National', 'Park',
]);

/** TRAVEL_TIMES lines that mention this place (by distinctive words of its English name). */
function travelTimesFor(p: Place): string[] {
  const words = p.names.en
    .split(/[^\p{L}]+/u)
    .filter((w) => w.length >= 4 && !GENERIC_NAME_WORDS.has(w));
  if (!words.length) return [];
  return TRAVEL_TIMES.filter((line) => words.some((w) => new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, 'u').test(line)));
}

function placeDetail(p: Place) {
  const nearby = PLACES.filter((o) => o.id !== p.id)
    .map((o) => ({ o, km: distanceKm(p, o) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 5)
    .map(({ o, km }) => ({ ...placeRef(o), straightLineKm: Math.round(km) }));
  return {
    id: p.id,
    name: p.names.en,
    names: p.names,
    country: { code: p.country, name: countryName(p.country) },
    region: p.region,
    type: p.type,
    experiences: p.experiences.map((id) => {
      const e = findExperience(id);
      return { id, name: e.name.en, tagline: e.tagline };
    }),
    coordinates: {
      lat: p.lat,
      lon: p.lon,
      precision: 'Approximate (about 1 km) — fine for an overview map, not for navigation. Valleys and regions point at a representative spot.',
      openStreetMap: osmUrl(p),
    },
    nearby,
    nearbyNote: 'Straight-line distances, not road distances.',
    approxRoadTravelTimes: travelTimesFor(p),
    travelTimesNote: 'Approximate, for planning only — traffic, weather, road works and border queues change them.',
  };
}

/** Resolves an id or a (localised) name to a place, with suggestions on a miss. */
function resolvePlace(input: string): { place: Place } | { suggestions: Place[] } {
  const raw = input.trim().toLowerCase();
  const direct = findPlace(raw) ?? findPlace(raw.replace(/[\s_]+/g, '-'));
  if (direct) return { place: direct };
  const key = normalizeKey(input);
  if (!key) return { suggestions: [] };
  const names = (p: Place) => [p.id.replace(/-/g, ' '), ...Object.values(p.names)].map(normalizeKey);
  const exact = PLACES.filter((p) => names(p).some((n) => n === key || n.replace(/\s*\(.*$/, '') === key));
  if (exact.length === 1 && exact[0]) return { place: exact[0] };
  const partial = PLACES.filter((p) => names(p).some((n) => n.includes(key) || (key.length >= 4 && key.includes(n))));
  if (partial.length === 1 && partial[0]) return { place: partial[0] };
  return { suggestions: (exact.length ? exact : partial).slice(0, 8) };
}

// ---------------------------------------------------------------------------
// Flights (src/data/flights.json via researchData())
// ---------------------------------------------------------------------------

type AirportCode = 'TBS' | 'KUT';
const AIRPORT_CODES = ['TBS', 'KUT'] as const satisfies readonly AirportCode[];

function routeOut(r: Json) {
  const airports = strList(r.airports);
  const seasonal = r.seasonal === true ? true : r.seasonal === false ? false : null;
  return {
    city: str(r.city) ?? '?',
    iata: str(r.iata) ?? '?',
    ...(airports.length ? { airports } : {}),
    country: str(r.country) ?? '',
    countryCode: str(r.countryCode) ?? '',
    airlines: strList(r.airlines),
    seasonal,
    confidence: str(r.confidence) ?? 'unknown',
    ...(stripUrls(str(r.note)) ? { researchNote: stripUrls(str(r.note)) } : {}),
  };
}

/** Alternates the research explicitly marks as not operating are left out. */
const NOT_OPERATING = /\bnot flying\b|\bdo not show\b|\bsuspended\b/i;

function flightConnections(airport: AirportCode | undefined) {
  const data = researchData()['flights.json'];
  if (!isObj(data) || !Array.isArray(data.airports)) {
    return {
      notice: SEASON_NOTICE,
      airports: [],
      message: `Flight research is not available right now. Ask ${CONTACT.email} for the current direct connections.`,
    };
  }
  const note = str(data.note) ?? '';
  const about = note.split(/(?<=\.)\s+(?=')/)[0];
  const notice = /Always show: '([^']+)'/.exec(note)?.[1] ?? SEASON_NOTICE;

  const airports = data.airports
    .filter(isObj)
    .filter((a) => !airport || a.code === airport)
    .map((a) => {
      const code = str(a.code) ?? '?';
      const direct = (Array.isArray(a.destinations) ? a.destinations : []).filter(isObj).map(routeOut);
      const others = (Array.isArray(a.alternates) ? a.alternates : [])
        .filter(isObj)
        .filter((r) => !NOT_OPERATING.test(str(r.note) ?? ''))
        .map(routeOut);
      return {
        code,
        city: str(a.city) ?? '',
        name: str(a.name) ?? '',
        officialWebsite: str(a.url),
        directDestinations: direct,
        moreDirectRoutes: others,
        totalDirectRoutesListed: direct.length + others.length,
      };
    });

  const airlines = (Array.isArray(data.airlines) ? data.airlines : []).filter(isObj).map((l) => {
    const serves = AIRPORT_CODES.filter((c) => l[`serves${c}`] === true);
    return {
      name: str(l.name) ?? '?',
      iata: str(l.iata),
      serves,
      routes: strList(l.routes),
      confidence: str(l.confidence) ?? 'unknown',
      ...(stripUrls(str(l.note)) ? { researchNote: stripUrls(str(l.note)) } : {}),
    };
  });

  return {
    notice,
    dataUpdated: str(data.updated) ?? null,
    about: about && about.length <= 400 ? about : 'Direct scheduled passenger flights to Tbilisi (TBS) and Kutaisi (KUT), researched from the airports\' own schedules.',
    fieldGuide: {
      directDestinations: 'The 20 cities Local Host shows on its departure board for this airport, in priority order.',
      moreDirectRoutes: 'Further verified direct routes (routes the research marks as not operating are left out).',
      seasonal: 'false = also flew in winter 2025/26 and/or is filed for winter 2026/27; true = seasonal; null = unknown.',
      confidence: "Whether the route is flown: 'high' = seen in an official airport schedule in October 2026.",
      iata: 'Airport code, or a city code (LON, PAR, MIL, ROM) when several airports are used — listed in "airports".',
      researchNote: 'Details as seen when researched (days and frequencies change) — Local Host confirms the current schedule.',
    },
    airports,
    ownersAirlineList: {
      about: "The 12 airlines on the owner's website list, with the gateways they currently serve directly.",
      airlines: airport ? airlines.filter((l) => l.serves.includes(airport)) : airlines,
    },
  };
}

// ---------------------------------------------------------------------------
// Trade fairs (src/data/fairs.json via researchData())
// ---------------------------------------------------------------------------

interface Edition {
  start: string;
  end: string;
}

function edition(v: unknown): Edition | null {
  if (!isObj(v)) return null;
  const start = str(v.start);
  const end = str(v.end) ?? start;
  return start && end ? { start, end } : null;
}

function tradeFairs(now: Date) {
  const today = now.toISOString().slice(0, 10);
  const data = researchData()['fairs.json'];
  const list = Array.isArray(data) ? data.filter(isObj) : [];
  const fairs = list.map((f) => {
    const last = edition(f.lastEdition);
    const next = edition(f.nextEdition);
    const current = [last, next].find((e): e is Edition => !!e && e.end >= today);
    const status = !current
      ? 'next dates not announced yet'
      : current.start <= today
        ? 'on now'
        : 'upcoming';
    return {
      id: str(f.id) ?? '',
      name: str(f.name) ?? '',
      fullName: str(f.fullName),
      city: str(f.city) ?? '',
      country: str(f.country) ?? '',
      venue: str(f.venue),
      usualMonth: str(f.month),
      status,
      upcomingOrCurrentEdition: current ?? null,
      lastEdition: last,
      nextEdition: next,
      officialWebsite: str(f.url),
      confidence: str(f.confidence) ?? 'unknown',
      ...(stripUrls(str(f.note)) ? { researchNote: stripUrls(str(f.note)) } : {}),
    };
  });
  return {
    asOf: today,
    fairs,
    meetingNote:
      `These are the fairs on Local Host's "Meet us at" list. Dates are the organisers' published dates (indicative); ` +
      `email ${CONTACT.email} to check which editions the team attends and to book a meeting.`,
  };
}

// ---------------------------------------------------------------------------
// Sustainability — "Travelife Partner" wording only, never "certified"
// ---------------------------------------------------------------------------

const DEFAULT_TRAVELIFE_STATEMENT = 'Local Host is a Travelife Partner.';

/** Drops any string mentioning "certified" (the wording rule is absolute). */
function withoutCertified<T>(value: T): T {
  const bad = /certified/i;
  if (typeof value === 'string') return (bad.test(value) ? '' : value) as T;
  if (Array.isArray(value)) {
    return value.filter((v) => !(typeof v === 'string' && bad.test(v))).map((v) => withoutCertified(v)) as T;
  }
  if (isObj(value)) {
    const out: Json = {};
    for (const [k, v] of Object.entries(value)) out[k] = withoutCertified(v);
    return out as T;
  }
  return value;
}

const POLICY_DATES: Record<string, string> = {
  sustainability: 'effective 11 August 2025',
  report: 'dated 11 November 2025',
  excursions: 'effective 11 August 2025',
  accomodations: 'effective 11 August 2025',
  inbound: 'effective 11 August 2025',
};

const POLICIES = SUSTAINABILITY.policies.map((p) => {
  const id = p.href.split('/').pop()?.replace(/\.pdf$/, '') ?? p.title;
  return { id, title: p.title, date: POLICY_DATES[id], url: absolute(p.href), resource: `local-host://policies/${id}` };
});

function sustainability() {
  const orgs = researchData()['research-orgs.json'];
  const t = isObj(orgs) && isObj(orgs.travelife) ? orgs.travelife : undefined;
  const wording = str(t?.wording);
  const statement = wording && !/certified/i.test(wording) ? wording : DEFAULT_TRAVELIFE_STATEMENT;
  const data = {
    status: 'Travelife Partner',
    statement,
    recognisedSince: str(t?.firstApproval),
    validUntil: str(t?.validUntil),
    publicRegister: str(t?.registerUrl),
    wordingGuidance:
      'Refer to Local Host as a "Travelife Partner" and quote the statement above as written. Keep claims specific; ' +
      'do not describe trips as carbon-neutral.',
    framework: SUSTAINABILITY.framework,
    commitments: [...SUSTAINABILITY.commitments],
    placesWeLove: SUSTAINABILITY.placesWeLove,
    policies: POLICIES.map(({ title, date, url }) => ({ title, date, url })),
  };
  const clean = withoutCertified(data);
  if (JSON.stringify(clean) !== JSON.stringify(data)) console.warn('[mcp] sustainability: dropped text containing "certified"');
  return clean;
}

// ---------------------------------------------------------------------------
// Contact & trip-request draft
// ---------------------------------------------------------------------------

function contact() {
  return {
    company: CONTACT.company,
    type: COMPANY.type,
    founded: COMPANY.founded,
    operatesIn: COMPANY.region,
    address: CONTACT.address,
    phone: CONTACT.phone,
    email: CONTACT.email,
    website: CONTACT.url,
    forQuotesAndAvailability: `Email ${CONTACT.email} with countries, interests, trip length, travel month, group size and anything special. ` +
      'The Local Host team replies with a tailored programme and quote.',
    tip: 'draft_trip_request prepares that email (with a mailto: link) for you.',
  };
}

interface TripInput {
  countries: CountryCode[];
  interests?: ExperienceId[] | undefined;
  days: number;
  month?: (typeof MONTH_OPTIONS)[number] | undefined;
  groupSize?: number | undefined;
  notes?: string | undefined;
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

function draftTripRequest(input: TripInput) {
  const countries = unique(input.countries);
  const interests = unique(input.interests ?? []);
  const notes = input.notes !== undefined ? asText(input.notes, MCP_LIMITS.notesMax) : undefined;
  const month = input.month === 'flexible' ? 'Flexible' : input.month;
  const nights = Math.max(0, input.days - 1);
  const countryNames = countries.map(countryName);
  const interestNames = interests.map((id) => findExperience(id).name.en);

  // Places tied to the chosen experiences in the chosen countries (catalog data, not an itinerary).
  const pool = interests.length
    ? interests.flatMap((id) => findExperience(id).places)
    : placesWhere({ country: countries }).map((p) => p.id);
  const places = unique(pool)
    .map((id) => findPlace(id))
    .filter((p): p is Place => !!p && countries.includes(p.country))
    .slice(0, 10);

  const considerations = [
    'No prices are given here: the Local Host team prepares a tailored quote.',
    'Availability, flights and opening periods are confirmed by the team; nothing is booked by this request.',
    'Visa and entry rules depend on nationality and change — check official government sources; the team can advise.',
  ];
  if (countries.length > 1) {
    considerations.push(
      'Multi-country trips are usually routed through Georgia (e.g. Yerevan ↔ Tbilisi ↔ Baku); the team arranges all cross-border logistics.',
    );
  }
  if (interests.includes('trekking')) {
    considerations.push(
      'High-mountain routes run only with experienced local guides; passes and mountain roads are seasonal and weather-dependent.',
    );
  }

  const lines = [
    'Hello Local Host team,',
    '',
    'We would like to request a tailored programme:',
    '',
    `- Countries: ${countryNames.join(', ')}`,
    `- Interests: ${interestNames.length ? interestNames.join(', ') : 'open to suggestions'}`,
    `- Length: ${input.days} ${input.days === 1 ? 'day' : `days / ${nights} ${nights === 1 ? 'night' : 'nights'}`}`,
    `- Travel month: ${month ?? 'not decided yet'}`,
    `- Group size: ${input.groupSize !== undefined ? `${input.groupSize} ${input.groupSize === 1 ? 'traveller' : 'travellers'}` : 'to be confirmed'}`,
    ...(notes ? ['', 'Notes:', notes] : []),
    '',
    'Please send us a draft programme and a quote.',
    '',
    'Agency / company:',
    'Contact person:',
    'Country / market:',
    '',
    '(Drafted with the Local Host MCP connector — a request only, nothing has been booked.)',
  ];
  const body = lines.join('\n');
  const subjectParts = [
    `${input.days}-day trip request`,
    countryNames.join(' + '),
    interestNames.length ? interestNames.join(' & ') : undefined,
    month && month !== 'Flexible' ? month : undefined,
    input.groupSize !== undefined ? `${input.groupSize} pax` : undefined,
  ].filter(Boolean);
  const subject = subjectParts.join(' · ');
  const mailto =
    `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body.replace(/\n/g, '\r\n'))}`;

  return {
    status: 'draft — not sent',
    summary: {
      countries: countries.map((c) => ({ code: c, name: countryName(c) })),
      interests: interests.map((id) => ({ id, name: findExperience(id).name.en })),
      days: input.days,
      nights,
      month: month ?? null,
      groupSize: input.groupSize ?? null,
      notes: notes ?? null,
    },
    email: { to: CONTACT.email, subject, body },
    mailto,
    placesToConsider: places.map(placeRef),
    placesNote: 'Places associated with these experiences in Local Host\'s catalog — the team builds the actual route.',
    typicalSeasons: interests.map((id) => ({ experience: findExperience(id).name.en, seasons: findExperience(id).seasons })),
    considerations,
    nextStep:
      `Open the mailto link (or email ${CONTACT.email}) to send this request. The Local Host team will reply with a ` +
      'tailored programme and quote.',
  };
}

// ---------------------------------------------------------------------------
// The MCP server (one per request — stateless)
// ---------------------------------------------------------------------------

const PLACE_COUNTS = COUNTRY_CODES.map((c) => `${PLACES.filter((p) => p.country === c).length} in ${countryName(c)}`).join(', ');

/** Builds a fresh server with every tool and resource registered. */
export function createMcpServer(): McpServer {
  const server = new McpServer(MCP_SERVER_INFO, {
    instructions: SERVER_INSTRUCTIONS,
    maxToolInputElements: MCP_LIMITS.maxToolInputElements,
  });

  server.registerTool(
    'list_experiences',
    {
      title: 'List experiences',
      description:
        "List Local Host's six signature experiences — Culture, Wine, Trekking, Gastronomy, Pilgrim and Leisure — across " +
        'Georgia, Armenia and Azerbaijan, with a tagline, typical seasons, the countries involved and who each suits. ' +
        'Use get_experience for highlights and the best places.',
      annotations: READ_ONLY,
    },
    () =>
      ok({
        experiences: EXPERIENCES.map(experienceSummary),
        note: 'Seasons are typical, not guaranteed. Names are given in English, Georgian, Polish, Italian and German.',
      }),
  );

  server.registerTool(
    'get_experience',
    {
      title: 'Get experience',
      description:
        'Full details of one Local Host experience: description, highlights, best places (with place ids for get_place), ' +
        'typical seasons and ideal travellers.',
      inputSchema: {
        id: z.enum(EXPERIENCE_IDS).describe('Experience id: culture, wine, trekking, gastronomy, pilgrim or leisure.'),
      },
      annotations: READ_ONLY,
    },
    ({ id }) => ok(experienceDetail(findExperience(id))),
  );

  server.registerTool(
    'list_places',
    {
      title: 'List places',
      description:
        `List the places in Local Host's catalog (${PLACES.length}: ${PLACE_COUNTS}) with id, region, type, experiences ` +
        'and approximate coordinates. Optionally filter by country and/or experience. Use get_place for details.',
      inputSchema: {
        country: z
          .enum(COUNTRY_CODES)
          .optional()
          .describe('Only places in this country: GE = Georgia, AM = Armenia, AZ = Azerbaijan.'),
        experience: z.enum(EXPERIENCE_IDS).optional().describe('Only places that suit this experience.'),
      },
      annotations: READ_ONLY,
    },
    ({ country, experience }) => {
      const places = placesWhere({
        ...(country ? { country } : {}),
        ...(experience ? { experience } : {}),
      });
      return ok({
        filters: { country: country ?? null, experience: experience ?? null },
        count: places.length,
        places: places.map(placeSummary),
        note: 'Coordinates are approximate (about 1 km).',
      });
    },
  );

  server.registerTool(
    'get_place',
    {
      title: 'Get place',
      description:
        'Details of one place by its id from list_places (a plain name such as "Kazbegi" or "Yerevan" also works): names in ' +
        'English, Georgian, Polish, Italian and German, region, type, related experiences, approximate coordinates, the ' +
        'nearest other places and approximate road travel times for planning.',
      inputSchema: {
        id: z.string().min(1).max(80).describe('Place id from list_places, e.g. "sighnaghi", "mestia", "tatev"; or a place name.'),
      },
      annotations: READ_ONLY,
    },
    ({ id }) => {
      const found = resolvePlace(id);
      if ('place' in found) return ok(placeDetail(found.place));
      const hint = found.suggestions.length
        ? ` Did you mean: ${found.suggestions.map((p) => `${p.id} (${p.names.en})`).join(', ')}?`
        : ' Call list_places to see all ids.';
      return toolError(`Unknown place "${id.slice(0, 80)}".${hint}`);
    },
  );

  server.registerTool(
    'list_flight_connections',
    {
      title: 'List direct flight connections',
      description:
        "Direct scheduled flights into Georgia's two main gateways, Tbilisi (TBS) and Kutaisi (KUT): destination cities, " +
        'airlines, whether the route also flies in winter, and research confidence, plus which airlines on Local Host\'s list ' +
        `serve each airport. Researched in October 2026 from the airports' own schedules. ${SEASON_NOTICE}`,
      inputSchema: {
        airport: z
          .enum(AIRPORT_CODES)
          .optional()
          .describe('TBS = Tbilisi, KUT = Kutaisi. Omit for both.'),
      },
      annotations: READ_ONLY,
    },
    ({ airport }) => ok(flightConnections(airport)),
  );

  server.registerTool(
    'get_trade_fairs',
    {
      title: 'Get trade fairs',
      description:
        'The European travel trade fairs on Local Host\'s "Meet us at" list (BIT Milano, BMT Napoli, ITB Berlin, Tour Salon ' +
        'Poznań, TTG Rimini, TT Warsaw): city, venue, last and next known dates, and whether each is on now or upcoming. ' +
        'Email Local Host to arrange a meeting.',
      annotations: READ_ONLY,
    },
    () => ok(tradeFairs(new Date())),
  );

  server.registerTool(
    'get_sustainability_commitments',
    {
      title: 'Get sustainability commitments',
      description:
        "Local Host's sustainability status and commitments: the approved Travelife Partner statement, concrete measures from " +
        'its policies and its November 2025 report, and links to the five policy PDFs. Quote the statement as written.',
      annotations: READ_ONLY,
    },
    () => ok(sustainability()),
  );

  server.registerTool(
    'get_contact',
    {
      title: 'Get contact',
      description: 'How to reach Local Host LLC in Tbilisi — address, phone, email and website — and what to include in a quote request.',
      annotations: READ_ONLY,
    },
    () => ok(contact()),
  );

  server.registerTool(
    'draft_trip_request',
    {
      title: 'Draft trip request',
      description:
        'Prepare a structured trip request for the Local Host team: a summary, a ready-to-send email with a mailto: link to ' +
        `${CONTACT.email}, places and typical seasons for the chosen experiences. It does not send, book or price anything — ` +
        'the agency sends the email and the Local Host team replies with a tailored programme and quote.',
      inputSchema: {
        countries: z
          .array(z.enum(COUNTRY_CODES))
          .min(1)
          .max(3)
          .describe('Countries to visit: GE = Georgia, AM = Armenia, AZ = Azerbaijan. Multi-country trips are usually routed through Georgia.'),
        interests: z
          .array(z.enum(EXPERIENCE_IDS))
          .max(6)
          .optional()
          .describe('Experiences the group cares about: culture, wine, trekking, gastronomy, pilgrim, leisure.'),
        days: z.number().int().min(1).max(30).describe('Trip length in days (1–30).'),
        month: z
          .enum(MONTH_OPTIONS)
          .optional()
          .describe('Preferred travel month in English (e.g. "September"), or "flexible".'),
        groupSize: z.number().int().min(1).max(500).optional().describe('Number of travellers (1–500).'),
        notes: z
          .string()
          .max(MCP_LIMITS.notesMax)
          .optional()
          .describe(
            `Anything else for the team (max ${MCP_LIMITS.notesMax} characters): hotel level, pace, special interests, arrival airport, ` +
              "the group's market or language. No personal data such as passport numbers.",
          ),
      },
      annotations: READ_ONLY,
    },
    (args) => ok(draftTripRequest(args)),
  );

  // Resources: the five policy documents (links to the published PDFs).
  for (const policy of POLICIES) {
    server.registerResource(
      `policy-${policy.id}`,
      policy.resource,
      {
        title: policy.title,
        description: `${policy.title} of Local Host LLC${policy.date ? ` (${policy.date})` : ''} — link to the published PDF.`,
        mimeType: 'text/markdown',
      },
      (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: [
              `# ${policy.title} — Local Host LLC`,
              '',
              policy.date ? `Document ${policy.date}. English.` : 'English.',
              '',
              `PDF: ${policy.url}`,
              '',
              'For a structured summary of the commitments and the approved Travelife Partner statement, call the ' +
                'get_sustainability_commitments tool.',
            ].join('\n'),
          },
        ],
      }),
    );
  }

  return server;
}

// ---------------------------------------------------------------------------
// HTTP layer: CORS, rate limit, body, JSON-RPC errors
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version, Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining',
  'Access-Control-Max-Age': '86400',
};

const BASE_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

function withHeaders(response: Response, extra: Record<string, string> = {}): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries({ ...BASE_HEADERS, ...extra })) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function rpcError(status: number, code: number, message: string, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null }), {
    status,
    headers: { ...BASE_HEADERS, 'Content-Type': 'application/json', ...extra },
  });
}

const METHOD_NOT_ALLOWED_MESSAGE =
  'Method not allowed. This is the Local Host MCP endpoint for AI assistants: MCP clients send JSON-RPC requests with POST ' +
  `(stateless, JSON responses, no SSE stream or sessions). Add ${MCP_ENDPOINT} as a custom connector in your MCP client.`;

const methodNotAllowed = () => rpcError(405, -32000, METHOD_NOT_ALLOWED_MESSAGE, { Allow: 'POST, OPTIONS' });

// Per-IP sliding windows, in memory per serverless instance (best effort, like http.ts).
// Separate from the AI endpoints' buckets: MCP calls cost no Claude tokens.
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const MAX_TRACKED_IPS = 10_000;
const mcpHits = new Map<string, number[]>();

/** Consumes `cost` units for `ip` when allowed. Exported for tests. */
export function takeMcpRate(ip: string, cost = 1, now = Date.now()): RateLimitResult {
  const hits = (mcpHits.get(ip) ?? []).filter((t) => t > now - HOUR);
  const lastMinute = hits.filter((t) => t > now - MINUTE);
  if (lastMinute.length + cost > MCP_LIMITS.perMinute) {
    mcpHits.set(ip, hits);
    return {
      ok: false,
      reason: 'ip',
      limit: MCP_LIMITS.perMinute,
      remaining: Math.max(0, MCP_LIMITS.perMinute - lastMinute.length),
      retryAfter: Math.max(1, Math.ceil(((lastMinute[0] ?? now) + MINUTE - now) / 1000)),
    };
  }
  if (hits.length + cost > MCP_LIMITS.perHour) {
    mcpHits.set(ip, hits);
    return {
      ok: false,
      reason: 'ip',
      limit: MCP_LIMITS.perMinute,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil(((hits[0] ?? now) + HOUR - now) / 1000)),
    };
  }
  for (let i = 0; i < cost; i++) hits.push(now);
  mcpHits.delete(ip); // re-insert: Map order approximates recency for pruning
  mcpHits.set(ip, hits);
  while (mcpHits.size > MAX_TRACKED_IPS) {
    const oldest = mcpHits.keys().next().value;
    if (oldest === undefined) break;
    mcpHits.delete(oldest);
  }
  return { ok: true, limit: MCP_LIMITS.perMinute, remaining: Math.max(0, MCP_LIMITS.perMinute - lastMinute.length - cost) };
}

function rateLimited(result: RateLimitResult): Response {
  return rpcError(429, -32000, 'Too many requests. Please slow down and retry later.', rateLimitHeaders(result));
}

/** Origin is optional (server-side clients send none). When present it must at least be a well-formed origin. */
function hasInvalidOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (origin === null || origin === 'null') return false;
  try {
    new URL(origin);
    return false;
  } catch {
    return true;
  }
}

/**
 * The SDK transport requires `Accept: application/json, text/event-stream`. We always
 * answer with JSON, so clients that only accept JSON (or send no Accept at all) are
 * served too. Returns undefined when the client accepts neither.
 */
function normalizedAccept(accept: string | null): string | undefined {
  const value = (accept ?? '').toLowerCase();
  if (value.includes('application/json') && value.includes('text/event-stream')) return accept ?? undefined;
  if (!value.trim() || value.includes('application/json') || value.includes('*/*') || value.includes('application/*')) {
    return 'application/json, text/event-stream';
  }
  return undefined;
}

function isJsonContentType(value: string | null): boolean {
  return (value ?? '').split(';')[0]?.trim().toLowerCase() === 'application/json';
}

type BodyText = { ok: true; text: string } | { ok: false; status: number; message: string };

async function readBodyText(request: Request, maxBytes: number): Promise<BodyText> {
  const tooLarge: BodyText = { ok: false, status: 413, message: `Request body is larger than ${Math.round(maxBytes / 1024)} KB.` };
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) return tooLarge;
  if (!request.body) return { ok: false, status: 400, message: 'Parse error: empty body.' };
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
        return tooLarge;
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, message: 'Could not read the request body.' };
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder('utf-8').decode(bytes) };
}

/** Compact log label, e.g. "initialize(claude-ai),tools/call(get_place)". No arguments or IPs are logged. */
function describeMessages(messages: readonly unknown[]): string {
  const safe = (s: unknown) => (typeof s === 'string' ? s.replace(/[^\w ./-]/g, '').slice(0, 40) : '');
  return messages
    .map((m) => {
      if (!isObj(m)) return '?';
      const method = typeof m.method === 'string' ? safe(m.method) : 'result' in m || 'error' in m ? 'response' : '?';
      const params = isObj(m.params) ? m.params : undefined;
      if (method === 'tools/call') return `${method}(${safe(params?.name)})`;
      if (method === 'initialize' && params && isObj(params.clientInfo)) return `${method}(${safe(params.clientInfo.name)})`;
      return method;
    })
    .join(',');
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export const POST: APIRoute = async (context: APIContext) => {
  const started = Date.now();
  const { request } = context;

  if (hasInvalidOrigin(request)) return rpcError(403, -32000, 'Forbidden: invalid Origin header.');

  const ip = clientIp(context);
  let rate = takeMcpRate(ip, 1);
  if (!rate.ok) return rateLimited(rate);
  const limitHeaders = rateLimitHeaders(rate);

  const accept = normalizedAccept(request.headers.get('accept'));
  if (!accept) return rpcError(406, -32000, 'Not Acceptable: the client must accept application/json.', limitHeaders);
  if (!isJsonContentType(request.headers.get('content-type'))) {
    return rpcError(415, -32000, 'Unsupported Media Type: Content-Type must be application/json.', limitHeaders);
  }

  const body = await readBodyText(request, MCP_LIMITS.maxBodyBytes);
  if (!body.ok) return rpcError(body.status, body.status === 413 ? -32000 : -32700, body.message, limitHeaders);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.text);
  } catch {
    return rpcError(400, -32700, 'Parse error: invalid JSON.', limitHeaders);
  }
  const messages = Array.isArray(parsed) ? parsed : [parsed];
  if (messages.length === 0 || messages.length > MCP_LIMITS.maxBatch) {
    return rpcError(400, -32600, `Invalid Request: a batch must hold 1–${MCP_LIMITS.maxBatch} messages.`, limitHeaders);
  }
  if (messages.length > 1) {
    rate = takeMcpRate(ip, messages.length - 1);
    if (!rate.ok) return rateLimited(rate);
  }

  // Hand the already-parsed body to the SDK transport with a normalised Accept header.
  const headers = new Headers(request.headers);
  headers.set('accept', accept);
  headers.delete('content-length');
  const forwarded = new Request(request.url, { method: 'POST', headers });

  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
    maxRequestBodySize: MCP_LIMITS.maxBodyBytes,
  });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(forwarded, { parsedBody: parsed });
    console.info(`[mcp] ${describeMessages(messages)} → ${response.status} ${Date.now() - started}ms`);
    return withHeaders(response, rateLimitHeaders(rate));
  } catch (err) {
    console.error('[mcp] request failed:', err);
    return rpcError(500, -32603, 'Internal server error.', rateLimitHeaders(rate));
  } finally {
    await server.close().catch(() => undefined);
  }
};

export const GET: APIRoute = () => methodNotAllowed();
export const DELETE: APIRoute = () => methodNotAllowed();
export const OPTIONS: APIRoute = () => new Response(null, { status: 204, headers: BASE_HEADERS });
export const ALL: APIRoute = () => methodNotAllowed();
