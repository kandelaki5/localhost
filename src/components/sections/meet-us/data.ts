/**
 * The six fairs from the owner's template, joined with the researched dates in
 * src/data/fairs.json (read-only; see docs/research/fairs.md). Only the visual
 * choices live here: stamp shape, ink and tilt. Copy (city names) is in
 * src/i18n/<lang>/meet-us.json.
 */
import fairsJson from '../../../data/fairs.json';
import type { Edition, FairDates } from './schedule';

export type StampShape = 'rect' | 'oval' | 'double' | 'arch' | 'dashed' | 'round';
export type StampInk = 'ink' | 'green';
export type Season = 'spring' | 'autumn';

export interface Fair extends FairDates {
  name: string;
  countryCode: string;
  url: string;
  /** Domain shown on the stamp, e.g. "itb.com". */
  domain: string;
  shape: StampShape;
  ink: StampInk;
  /** Degrees, within ±2. */
  tilt: number;
}

interface FairJson {
  id: string;
  name: string;
  countryCode: string;
  url: string;
  lastEdition: Edition | null;
  nextEdition: Edition | null;
}

const LOOK: Record<string, Pick<Fair, 'shape' | 'ink' | 'tilt'>> = {
  'bit-milano': { shape: 'rect', ink: 'ink', tilt: -1.5 },
  'bmt-napoli': { shape: 'oval', ink: 'green', tilt: 1.25 },
  'itb-berlin': { shape: 'double', ink: 'ink', tilt: -0.75 },
  'tt-warsaw': { shape: 'arch', ink: 'green', tilt: 1.5 },
  'ttg-rimini': { shape: 'dashed', ink: 'ink', tilt: -1.25 },
  'tour-salon': { shape: 'round', ink: 'green', tilt: 0.75 },
};

const domainOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');

export const FAIRS: Fair[] = (fairsJson as FairJson[])
  .filter((f) => f.id in LOOK)
  .map((f) => ({
    id: f.id,
    name: f.name,
    countryCode: f.countryCode,
    url: f.url,
    domain: domainOf(f.url),
    last: f.lastEdition,
    next: f.nextEdition,
    ...LOOK[f.id],
  }));

// ── The fair year ────────────────────────────────────────────────────────────
// The calendar is a cyclical Jan–Dec year: each fair sits at the day of the
// year its shown edition starts, whatever the year.

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const YEAR_DAYS = 365;

/** Day of the (non-leap) year, 0-based: "2027-02-09" → 39. */
export function dayOfYear(iso: string): number {
  const [, m, d] = iso.split('-').map(Number);
  return MONTH_DAYS.slice(0, m - 1).reduce((a, b) => a + b, 0) + Math.min(d, MONTH_DAYS[m - 1]) - 1;
}

/** Position on the year ruler (0–1) of the middle of a day. */
export const yearPosition = (iso: string) => (dayOfYear(iso) + 0.5) / YEAR_DAYS;

/** Month widths on the ruler, proportional to their days. */
export const MONTHS = MONTH_DAYS.map((days, i) => ({ index: i, days }));

/** Spring = January–June, autumn = July–December. */
export const seasonOf = (iso: string): Season => (Number(iso.slice(5, 7)) <= 6 ? 'spring' : 'autumn');
