/**
 * The home page's sections, in nav order. Single source for section ids,
 * running-head numbers, nav grouping and which sections sit on the night
 * surface. See docs/ARCHITECTURE.md before changing anything here: ids are
 * public URLs (#caucasus …) and the contract with every section agent.
 */

export type NavKey =
  | 'caucasus'
  | 'experiences'
  | 'hosts'
  | 'gettingHere'
  | 'meetUs'
  | 'sustainability'
  | 'contact';

export interface SectionInfo {
  /** DOM id and URL fragment. */
  id: string;
  /** i18n file name: src/i18n/<lang>/<key>.json */
  key: string;
  /** Running-head number (01–12). The hero is 0. */
  number: number;
  /** Nav item that lights up while this section is in view. */
  nav: NavKey | null;
  /** Sections that render on the dark night surface. */
  surface: 'paper' | 'night';
}

export const SECTIONS = [
  { id: 'top', key: 'hero', number: 0, nav: null, surface: 'paper' },
  { id: 'caucasus', key: 'caucasus', number: 1, nav: 'caucasus', surface: 'paper' },
  { id: 'experiences', key: 'experiences', number: 2, nav: 'experiences', surface: 'paper' },
  { id: 'hosts', key: 'hosts', number: 3, nav: 'hosts', surface: 'paper' },
  { id: 'airlines', key: 'airlines', number: 4, nav: 'gettingHere', surface: 'paper' },
  { id: 'connection', key: 'connection', number: 5, nav: 'gettingHere', surface: 'night' },
  { id: 'meet-us', key: 'meet-us', number: 6, nav: 'meetUs', surface: 'paper' },
  { id: 'members', key: 'members', number: 7, nav: 'meetUs', surface: 'paper' },
  { id: 'awards', key: 'awards', number: 8, nav: 'meetUs', surface: 'paper' },
  { id: 'sustainability', key: 'sustainability', number: 9, nav: 'sustainability', surface: 'paper' },
  { id: 'support', key: 'support', number: 10, nav: 'sustainability', surface: 'paper' },
  { id: 'plan', key: 'plan', number: 11, nav: null, surface: 'night' },
  { id: 'contact', key: 'contact', number: 12, nav: 'contact', surface: 'paper' },
] as const satisfies readonly SectionInfo[];

export type SectionId = (typeof SECTIONS)[number]['id'];

/** Main navigation, in order. `target` is the section the link scrolls to. */
export const NAV: readonly { key: NavKey; target: SectionId }[] = [
  { key: 'caucasus', target: 'caucasus' },
  { key: 'experiences', target: 'experiences' },
  { key: 'hosts', target: 'hosts' },
  { key: 'gettingHere', target: 'airlines' },
  { key: 'meetUs', target: 'meet-us' },
  { key: 'sustainability', target: 'sustainability' },
  { key: 'contact', target: 'contact' },
];

/** Section ids that light up a nav item, e.g. gettingHere → airlines + connection. */
export function sectionsForNav(key: NavKey): string[] {
  return SECTIONS.filter((s) => s.nav === key).map((s) => s.id);
}

export function sectionById(id: string): SectionInfo | undefined {
  return SECTIONS.find((s) => s.id === id);
}

// Georgian alphabetic numerals (the traditional number system): units,
// tens and hundreds. ჱ (8), ჲ (60), ჳ, ჴ, ჵ … are archaic letters kept for numbers.
const UNITS = ['', 'ა', 'ბ', 'გ', 'დ', 'ე', 'ვ', 'ზ', 'ჱ', 'თ'];
const TENS = ['', 'ი', 'კ', 'ლ', 'მ', 'ნ', 'ჲ', 'ო', 'პ', 'ჟ'];
const HUNDREDS = ['', 'რ', 'ს', 'ტ', 'ჳ', 'ფ', 'ქ', 'ღ', 'ყ', 'შ'];

/** 1 → ა, 4 → დ, 11 → ია, 12 → იბ. Supports 1–999. */
export function georgianNumeral(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 999) return '';
  return HUNDREDS[Math.floor(n / 100)] + TENS[Math.floor((n % 100) / 10)] + UNITS[n % 10];
}

/** 4 → "04" */
export function latinNumber(n: number): string {
  return String(n).padStart(2, '0');
}
