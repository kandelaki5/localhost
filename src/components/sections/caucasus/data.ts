/**
 * 01 · Caucasus — data that isn't copy: photos and crops for the triptych,
 * and the geometry of the schematic map (Fig. 4).
 *
 * Copy lives in src/i18n/<lang>/caucasus.json. Country names come from the AI
 * knowledge base (src/lib/ai/knowledge.ts → COUNTRIES), place coordinates from
 * src/lib/ai/places.ts, outlines from src/data/caucasus-map.json (Natural
 * Earth, public domain) — all read-only, so the map, the AI planner and the
 * cards always agree.
 */
import { findPlace, project, MAP_HEIGHT, MAP_WIDTH } from '../../../lib/ai/places';
import type { CountryCode, PlaceId } from '../../../lib/ai/types';
import credits from '../../../data/photo-credits.json';

// ---------------------------------------------------------------------------
// Triptych
// ---------------------------------------------------------------------------

export interface CardData {
  code: CountryCode;
  /** Roman plate number on the photo corner. */
  plate: string;
  /** Capital, marked on the card's locator. */
  capital: CityKey;
  /** File name in src/assets/photos (no extension). */
  photo: string;
  /** object-position — docs/research/photo-plan.md §3. */
  focal: string;
  /** Subject coordinates for the caption; omitted when the exact place is unverified. */
  coords?: [number, number];
  /** Openly licensed photo: credit line under the figure (+ /credits/). */
  credit?: { creator: string; license: string; licenseUrl: string; sourceUrl: string };
}

type CreditRow = { file: string; creator: string; license: string; licenseUrl?: string; sourceUrl?: string };

function creditFor(file: string): CardData['credit'] {
  const row = (credits as CreditRow[]).find((c) => c.file === file);
  if (!row?.licenseUrl || !row.sourceUrl) throw new Error(`[caucasus] no open-licence credit for ${file}`);
  // "Serouj Ourishian (Սէրուժ Ուրիշեան)" → keep only the Latin name in a caption.
  return { creator: row.creator.replace(/\s*\(.*\)$/, ''), license: row.license, licenseUrl: row.licenseUrl, sourceUrl: row.sourceUrl };
}

export const CARDS: readonly CardData[] = [
  {
    code: 'GE',
    plate: 'I',
    capital: 'tbilisi',
    // Not kazbegi-gergeti: the hero already uses it. The village is unverified
    // (looks like Ushguli) → no coordinates until Local Host confirms it.
    photo: 'svaneti-1',
    focal: '55% 62%',
  },
  {
    code: 'AM',
    plate: 'II',
    capital: 'yerevan',
    photo: 'armenia-khor-virap',
    focal: '36% 60%',
    coords: [39.8783, 44.5761], // Khor Virap (Wikipedia)
    credit: creditFor('armenia-khor-virap.jpg'),
  },
  {
    code: 'AZ',
    plate: 'III',
    capital: 'baku',
    photo: 'azerbaijan-baku',
    focal: '30% 55%',
    coords: [40.3667, 49.8333], // Icherisheher, Baku Old City (Wikipedia)
    credit: creditFor('azerbaijan-baku.jpg'),
  },
];

// ---------------------------------------------------------------------------
// Map — Fig. 4
// ---------------------------------------------------------------------------

export const W = MAP_WIDTH;
export const H = MAP_HEIGHT;

/** Map units → % of the plate (for the HTML label layer). */
export const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;

export type CityKey = 'tbilisi' | 'kutaisi' | 'batumi' | 'kazbegi' | 'yerevan' | 'sheki' | 'baku';

/**
 * Where a label sits relative to its dot: compass point (the label's anchor
 * side is the opposite one). Chosen so no label crosses a route line.
 */
export type Side = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

interface CityDef {
  key: CityKey;
  place: PlaceId;
  side: Side;
  capital?: boolean;
}

const CITY_DEFS: readonly CityDef[] = [
  { key: 'tbilisi', place: 'tbilisi', side: 'ne', capital: true },
  { key: 'kutaisi', place: 'kutaisi', side: 'n' },
  { key: 'batumi', place: 'batumi', side: 'se' },
  { key: 'kazbegi', place: 'stepantsminda', side: 'se' },
  { key: 'yerevan', place: 'yerevan', side: 'se', capital: true },
  { key: 'sheki', place: 'sheki', side: 'n' },
  { key: 'baku', place: 'baku', side: 'sw', capital: true },
];

export interface City extends CityDef {
  x: number;
  y: number;
  lat: number;
  lon: number;
}

export const CITIES: readonly City[] = CITY_DEFS.map((c) => {
  const place = findPlace(c.place);
  if (!place) throw new Error(`[caucasus] unknown place ${c.place}`);
  return { ...c, lat: place.lat, lon: place.lon, ...project(place.lat, place.lon) };
});

const city = (key: CityKey) => CITIES.find((c) => c.key === key)!;

/**
 * Road legs drawn from Tbilisi outward, with approximate drive times.
 * Source: TRAVEL_TIMES in src/lib/ai/knowledge.ts (planning estimates only).
 * `hours` is one value or a [min, max] range; `stage` 2 legs start where a
 * stage 1 leg ends (they draw after it).
 */
export interface Leg {
  from: CityKey;
  to: CityKey;
  hours: number | [number, number];
  border?: boolean;
  stage: 1 | 2;
  /** Mountain road: drawn dotted. */
  dotted?: boolean;
}

export const LEGS: readonly Leg[] = [
  { from: 'tbilisi', to: 'kazbegi', hours: 3, stage: 1, dotted: true },
  { from: 'tbilisi', to: 'kutaisi', hours: 3.5, stage: 1 },
  { from: 'kutaisi', to: 'batumi', hours: 2.5, stage: 2 },
  { from: 'tbilisi', to: 'yerevan', hours: [5, 6], border: true, stage: 1 },
  { from: 'tbilisi', to: 'sheki', hours: [5, 6], border: true, stage: 1 },
  { from: 'sheki', to: 'baku', hours: 5, stage: 2 },
];

export const ROUTES = LEGS.map((leg) => {
  const a = city(leg.from);
  const b = city(leg.to);
  return { ...leg, d: `M${a.x},${a.y} L${b.x},${b.y}`, length: Math.hypot(b.x - a.x, b.y - a.y) };
});

/** Labels placed by hand in map units — checked so that no label of a
 *  neighbouring country ever falls inside GE/AM/AZ (see the section README
 *  note in Caucasus.astro). Anchor = label centre unless `align` says otherwise. */
export interface MapLabel {
  x: number;
  y: number;
  align?: 'start' | 'center' | 'end';
}

const at = (lat: number, lon: number, align?: MapLabel['align']): MapLabel => ({ ...project(lat, lon), align });

export const SEA_LABELS = {
  blackSea: at(42.58, 39.93, 'start'),
  caspianSea: at(42.05, 49.55, 'center'),
} as const;

export const COUNTRY_LABELS: Record<CountryCode, MapLabel> = {
  GE: at(41.78, 43.35),
  AM: at(40.76, 44.21),
  AZ: at(40.08, 47.55),
};

/** Neighbours: deep inside their own territory, well clear of the borders. */
export const NEIGHBOUR_LABELS = {
  RU: at(43.5, 45.15),
  TR: at(40.35, 41.45),
  IR: at(38.56, 46.95),
} as const;

/** "Greater Caucasus": along the ridge, on its northern (Russian) side, east of Kazbegi. */
export const RANGE_LABEL = { ...at(42.32, 46.62), angle: 33 };

// ── Greater Caucasus as a row of tick-mark peaks ────────────────────────────

/** The main ridge, west → east (approximate watershed, schematic). */
const RIDGE: readonly [number, number][] = [
  [43.64, 40.05],
  [43.48, 40.8],
  [43.3, 41.55],
  [43.16, 42.3],
  [43.02, 43.0],
  [42.86, 43.7],
  [42.75, 44.2],
  [42.7, 44.65],
  [42.6, 45.1],
  [42.38, 45.7],
  [42.0, 46.35],
  [41.62, 46.98],
  [41.27, 47.75],
  [41.02, 48.45],
  [40.78, 49.05],
  [40.62, 49.45],
];

/** Summits that lift the ticks around them: [lat, lon, strength]. */
const SUMMITS: readonly [number, number, number][] = [
  [43.35, 42.44, 1], // Elbrus
  [43.0, 43.11, 0.85], // Shkhara
  [42.7, 44.52, 0.85], // Kazbek
  [42.57, 45.31, 0.55], // Tebulosmta
  [41.22, 47.86, 0.7], // Bazarduzu
];

// Deterministic PRNG (mulberry32) so every build draws the same ridge.
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Tick {
  d: string;
  /** 0–1 along the ridge, west → east (for the staggered draw-in). */
  t: number;
}

function buildTicks(): Tick[] {
  const pts = RIDGE.map(([lat, lon]) => project(lat, lon));
  const summits = SUMMITS.map(([lat, lon, s]) => ({ ...project(lat, lon), s }));
  const kazbegi = city('kazbegi');
  const rand = rng(41);
  const STEP = 13;
  const LIFT = 5; // sit just north of the line, so the ticks never merge with the border
  const r = (n: number) => Math.round(n * 10) / 10;
  // Cumulative length at each vertex.
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = cum[cum.length - 1];
  const ticks: Tick[] = [];
  for (let dist = STEP / 2, seg = 1; dist < total; dist += STEP) {
    while (cum[seg] < dist) seg++;
    const a = pts[seg - 1];
    const b = pts[seg];
    const u = (dist - cum[seg - 1]) / (cum[seg] - cum[seg - 1]);
    const x = a.x + (b.x - a.x) * u + (rand() - 0.5) * 2.4;
    const y = a.y + (b.y - a.y) * u + (rand() - 0.5) * 2.4;
    const jitter = rand();
    // Leave a pass for the road to Kazbegi (the Darial / Military Road).
    if (Math.hypot(x - kazbegi.x, y - kazbegi.y) < 15) continue;
    let lift = 0;
    for (const m of summits) lift += m.s * Math.max(0, 1 - Math.hypot(x - m.x, y - m.y) / 70) ** 1.4;
    // Both ends of the range taper off.
    const along = dist / total;
    const taper = Math.max(0, Math.min(1, along / 0.06, (1 - along) / 0.12));
    const h = (5.5 + lift * 12 + jitter * 3) * (0.45 + 0.55 * taper);
    const half = Math.min(5.2, h * 0.62);
    const base = y - LIFT;
    ticks.push({ d: `M${r(x - half)},${r(base)} L${r(x)},${r(base - h)} L${r(x + half)},${r(base)}`, t: along });
  }
  return ticks;
}

export const TICKS = buildTicks();

// ── Graticule, scale bar ────────────────────────────────────────────────────

export const GRATICULE = {
  lons: [42, 44, 46, 48, 50].map((lon) => ({ lon, x: project(41, lon).x })),
  lats: [39, 40, 41, 42, 43].map((lat) => ({ lat, y: project(lat, 44).y })),
};

/** 100 km bar in the Caspian corner (1° of latitude ≈ 111.2 km). */
const KM_100 = project(41, 45).y - project(41 + 100 / 111.2, 45).y;
export const SCALE_BAR = { x: 868, y: 652, length: Math.round(KM_100 * 10) / 10 };
