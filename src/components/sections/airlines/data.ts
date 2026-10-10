/**
 * 04 · Airlines — the typography wall.
 *
 * The owner's twelve names (template order), with the one change from
 * docs/DESIGN.md: Air France no longer flies to Tbilisi itself, so its slot
 * reads "Transavia · Air France–KLM". Example routes are *picked* here but
 * *checked* against src/data/flights.json at build time: a pick that the
 * research does not list throws, so the wall can never imply a route.
 */
import { AIRLINES, AIRPORTS, cityKey, type AirportCode } from '../connection/data';

export interface WallRoute {
  /** Key into connection.json `cities` (localised city name). */
  city: string;
  /** Airport code shown beside the city. */
  code: string;
}

export interface WallGroup {
  airport: AirportCode;
  routes: WallRoute[];
  /** Further routes to this airport that the research lists. */
  more: number;
}

export interface WallEntry {
  id: string;
  /** Name on the wall, as the owner wrote it (correct casing). */
  label: string;
  /** Small group name after the label (the Air France slot). */
  group?: string;
  /** Full airline name for the caption. */
  full: string;
  italic: boolean;
  groups: WallGroup[];
}

interface Pick {
  id: string;
  label: string;
  group?: string;
  full: string;
  /** Name in flights.json `airlines[]`, or airline names to find in the board destinations. */
  source: { airline: string } | { destinations: string[] };
  /** [airport, code] pairs, in display order. */
  picks: [AirportCode, string][];
  /** Show "+ n more" (only where every listed route is verified). */
  countMore?: boolean;
}

const PICKS: Pick[] = [
  { id: 'turkish', label: 'Turkish', full: 'Turkish Airlines', source: { airline: 'Turkish Airlines' }, picks: [['TBS', 'IST']] },
  {
    id: 'georgian',
    label: 'Georgian',
    full: 'Georgian Airways',
    source: { airline: 'Georgian Airways' },
    picks: [
      ['TBS', 'AMS'],
      ['TBS', 'BER'],
      ['TBS', 'CDG'],
      ['TBS', 'FCO'],
    ],
  },
  { id: 'airbaltic', label: 'airBaltic', full: 'airBaltic', source: { airline: 'airBaltic' }, picks: [['TBS', 'RIX']] },
  {
    id: 'transavia',
    label: 'Transavia',
    group: 'Air France–KLM',
    full: 'Transavia',
    source: { destinations: ['Transavia', 'Transavia France'] },
    picks: [
      ['TBS', 'ORY'],
      ['TBS', 'AMS'],
    ],
  },
  { id: 'aegean', label: 'Aegean', full: 'Aegean Airlines', source: { airline: 'Aegean Airlines' }, picks: [['TBS', 'ATH']] },
  {
    id: 'pegasus',
    label: 'Pegasus',
    full: 'Pegasus Airlines',
    source: { airline: 'Pegasus Airlines' },
    picks: [
      ['TBS', 'SAW'],
      ['TBS', 'AYT'],
      ['KUT', 'SAW'],
    ],
  },
  {
    id: 'wizz',
    label: 'Wizz Air',
    full: 'Wizz Air',
    source: { airline: 'Wizz Air' },
    picks: [
      ['KUT', 'WAW'],
      ['KUT', 'BER'],
      ['KUT', 'MXP'],
      ['KUT', 'BVA'],
    ],
    countMore: true,
  },
  {
    id: 'easyjet',
    label: 'easyJet',
    full: 'easyJet',
    source: { airline: 'easyJet' },
    picks: [
      ['TBS', 'LTN'],
      ['TBS', 'MXP'],
      ['TBS', 'GVA'],
    ],
  },
  { id: 'lufthansa', label: 'Lufthansa', full: 'Lufthansa', source: { airline: 'Lufthansa' }, picks: [['TBS', 'MUC']] },
  { id: 'lot', label: 'LOT', full: 'LOT Polish Airlines', source: { airline: 'LOT Polish Airlines' }, picks: [['TBS', 'WAW']] },
  { id: 'austrian', label: 'Austrian', full: 'Austrian Airlines', source: { airline: 'Austrian Airlines' }, picks: [['TBS', 'VIE']] },
  { id: 'british', label: 'British', full: 'British Airways', source: { airline: 'British Airways' }, picks: [['TBS', 'LHR']] },
];

/** Every route the research lists for an airline: { airport, code, city }. */
function researchedRoutes(source: Pick['source']): { airport: AirportCode; code: string; city: string }[] {
  if ('airline' in source) {
    const record = AIRLINES.find((a) => a.name === source.airline);
    if (!record) throw new Error(`[airlines] flights.json has no airline "${source.airline}"`);
    return record.routes.flatMap((route) => {
      // "Milan-Bergamo (BGY) → TBS", "Forlì (FRL) → TBS (listed, status unclear)"
      const m = route.match(/^(.+?) \(([A-Z]{3})\) → (TBS|KUT)(.*)$/);
      // skip unparseable routes, domestic ones and those the research marks unclear
      if (!m || /unclear|domestic/i.test(m[4])) return [];
      return [{ airport: m[3] as AirportCode, code: m[2], city: m[1] }];
    });
  }
  // From the board destinations: the city's own code plus each listed airport.
  return AIRPORTS.flatMap((ap) =>
    ap.destinations
      .filter((d) => d.airlines.some((a) => source.destinations.includes(a)))
      .flatMap((d) => [d.iata, ...(d.airports ?? [])].map((code) => ({ airport: ap.code, code, city: d.city }))),
  );
}

/** "Milan-Bergamo" → "milan"; keeps researched compound airports ("paris-beauvais"). */
function cityFor(place: string, known: Record<string, string>): string {
  const full = cityKey(place);
  if (full in known) return full;
  return cityKey(place.split('-')[0] ?? place);
}

export function wallEntries(cities: Record<string, string>): WallEntry[] {
  return PICKS.map((pick, i) => {
    const routes = researchedRoutes(pick.source);
    const airports = [...new Set(pick.picks.map(([ap]) => ap))];
    const groups: WallGroup[] = airports.map((airport) => {
      const picked = pick.picks
        .filter(([ap]) => ap === airport)
        .map(([, code]) => {
          const found = routes.find((r) => r.airport === airport && r.code === code);
          if (!found) {
            throw new Error(`[airlines] ${pick.full}: ${code} → ${airport} is not in src/data/flights.json`);
          }
          return { city: cityFor(found.city, cities), code };
        });
      const listed = new Set(routes.filter((r) => r.airport === airport).map((r) => r.code));
      return { airport, routes: picked, more: pick.countMore ? Math.max(0, listed.size - picked.length) : 0 };
    });
    return { id: pick.id, label: pick.label, group: pick.group, full: pick.full, italic: i % 2 === 1, groups };
  });
}
