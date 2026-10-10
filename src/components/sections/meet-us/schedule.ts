/**
 * Which edition of each fair to show, and which fair is next.
 *
 * Pure functions on ISO dates ("2026-10-14"), shared by the build (MeetUs.astro)
 * and the client re-check (the <script> in MeetUs.astro), so the page renders
 * the right state at build time and stays right after the build date.
 * ISO day strings compare correctly as plain strings.
 */

export interface Edition {
  start: string;
  end: string;
}

export interface FairDates {
  id: string;
  last: Edition | null;
  next: Edition | null;
}

/**
 * now      — the edition is running today
 * next     — the first upcoming edition of all fairs
 * upcoming — a later upcoming edition
 * held     — every known edition is over; the next dates aren't published yet
 */
export type FairState = 'now' | 'next' | 'upcoming' | 'held';

export interface FairStatus {
  id: string;
  state: FairState;
  edition: Edition | null;
}

/** A Date as a local calendar day, "yyyy-mm-dd". */
export function isoDay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** "2026-10-14/2026-10-16" ⇄ Edition (the data-attribute format). */
export function encodeEdition(e: Edition | null | undefined): string {
  return e ? `${e.start}/${e.end}` : '';
}

export function decodeEdition(value: string | undefined): Edition | null {
  const [start, end] = (value ?? '').split('/');
  return start && end ? { start, end } : null;
}

/** The edition to show for one fair today, and whether it is on, coming or over. */
function current(f: FairDates, today: string): FairStatus {
  for (const e of [f.last, f.next]) {
    if (e && e.end >= today) return { id: f.id, state: e.start <= today ? 'now' : 'upcoming', edition: e };
  }
  return { id: f.id, state: 'held', edition: f.next ?? f.last };
}

/** Statuses for every fair, with the earliest upcoming one marked `next`. */
export function scheduleFairs(fairs: readonly FairDates[], today: string): FairStatus[] {
  const out = fairs.map((f) => current(f, today));
  let next: FairStatus | undefined;
  for (const s of out) {
    if (s.state === 'upcoming' && s.edition && (!next || s.edition.start < (next.edition?.start ?? ''))) next = s;
  }
  if (next) next.state = 'next';
  return out;
}

const DAY = 86_400_000;

/** Whole days from `today` to `iso` (both "yyyy-mm-dd"). */
export function daysUntil(iso: string, today: string): number {
  return Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / DAY);
}

const utc = (iso: string) => new Date(`${iso}T12:00:00Z`);

/** "14–16 Oct 2026" in the page's locale. */
export function formatRange(e: Edition, locale: string): string {
  const f = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return f.formatRange(utc(e.start), utc(e.end));
}

/** "11 Oct" in the page's locale. */
export function formatDay(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(utc(iso));
}

/** "in 4 days" / "tomorrow" / "in 5 months". */
export function formatRelative(days: number, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  return days < 45 ? rtf.format(days, 'day') : rtf.format(Math.round(days / 30.4), 'month');
}

/** True when a fair's name already says its city ("TTG Rimini" + "Rimini"), so it needn't be repeated. */
export function cityInName(name: string, city: string): boolean {
  const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const stem = norm(city).slice(0, 5);
  return stem.length > 2 && norm(name).includes(stem);
}
