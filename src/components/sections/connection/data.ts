/**
 * Departure-board data for 05 · Connection (and the route captions of
 * 04 · Airlines). Everything is read from src/data/flights.json (research,
 * Oct 2026) — nothing here adds a route, an airline or a schedule.
 *
 * City *names* are copy and live in src/i18n/<lang>/connection.json under
 * `cities`, keyed by `cityKey()` of the researched English label
 * ("Paris-Beauvais" → "paris-beauvais").
 */
import flights from '../../../data/flights.json';

export type AirportCode = 'TBS' | 'KUT';

export interface Destination {
  city: string;
  iata: string;
  country: string;
  countryCode: string;
  airlines: string[];
  seasonal: boolean | null;
  confidence: string;
  source: string;
  airports?: string[];
  note?: string;
}

export interface Airport {
  code: AirportCode;
  city: string;
  name: string;
  url: string;
  destinations: Destination[];
}

export interface AirlineRecord {
  name: string;
  iata: string;
  servesTBS: boolean;
  servesKUT: boolean;
  routes: string[];
  confidence: string;
  note?: string;
}

export const AIRPORTS = flights.airports as unknown as Airport[];
export const AIRLINES = flights.airlines as unknown as AirlineRecord[];
/** "2026-10" — when the research was checked against the live schedules. */
export const UPDATED = flights.updated;

/** Board order: Tbilisi first (the tabs follow it). */
export const BOARD_ORDER: readonly AirportCode[] = ['TBS', 'KUT'];

/** Rows shown before "All 20 cities". */
export const VISIBLE_ROWS = 8;

/** Character slots per line of the city column (long names wrap to a 2nd line). */
export const CITY_SLOTS = 12;

export function airport(code: AirportCode): Airport {
  const a = AIRPORTS.find((x) => x.code === code);
  if (!a) throw new Error(`[connection] flights.json has no airport ${code}`);
  return a;
}

/** "Paris-Beauvais" → "paris-beauvais", "Wrocław" → "wroclaw", "Tel Aviv" → "tel-aviv". */
export function cityKey(city: string): string {
  return city
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Localised city name, falling back to the researched English label. */
export function cityName(cities: Record<string, string>, city: string): string {
  return cities[cityKey(city)] ?? city;
}

const GEORGIAN = /[Ⴀ-ჿᲐ-Ჿⴀ-⴯]/;

export function isGeorgian(text: string): boolean {
  return GEORGIAN.test(text);
}

/** Board casing: Latin and Polish/German/Italian letters go upper case; Mkhedruli has no case. */
export function boardCase(text: string, bcp47: string): string {
  return isGeorgian(text) ? text : text.toLocaleUpperCase(bcp47);
}

/**
 * Splits a board label into lines of at most `slots` characters, breaking at
 * spaces or after hyphens ("BRUSSELS-" / "CHARLEROI"); a single word longer
 * than a line is cut hard. Each line is padded with blanks to `slots`.
 */
export function boardLines(label: string, slots = CITY_SLOTS): string[][] {
  const words = label.match(/[^\s-]+-?|\s+/g) ?? [label];
  const lines: string[] = [];
  let line = '';
  for (const raw of words) {
    if (/^\s+$/.test(raw)) {
      if (line && line.length < slots) line += ' ';
      continue;
    }
    let word = raw;
    const candidate = line + word;
    if (candidate.length <= slots) {
      line = candidate;
      continue;
    }
    if (line.trim()) lines.push(line.trimEnd());
    while (word.length > slots) {
      lines.push(word.slice(0, slots));
      word = word.slice(slots);
    }
    line = word;
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines.map((l) => [...l.padEnd(slots, ' ')]);
}

/** IATA / clock characters, padded to `slots`. */
export function boardChars(text: string, slots: number): string[] {
  return [...text.padEnd(slots, ' ')].slice(0, slots);
}

/** Spin alphabet for the flap animation in each language (decorative only). */
export function glyphsFor(lang: string): string {
  const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  switch (lang) {
    case 'ka':
      return 'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ';
    case 'pl':
      return latin + 'ĄĆĘŁŃÓŚŹŻ';
    case 'de':
      return latin + 'ÄÖÜ';
    default:
      return latin;
  }
}

/** "2026-10" → "October 2026" in the page language. */
export function formatUpdated(bcp47: string): string {
  const [y, m] = UPDATED.split('-').map(Number);
  return new Intl.DateTimeFormat(bcp47, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, (m || 1) - 1, 15)),
  );
}
