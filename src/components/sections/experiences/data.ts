/**
 * Experiences (#experiences): the data that is not copy.
 *
 * Names, place lists and seasons come from the AI knowledge base
 * (src/lib/ai/knowledge.ts EXPERIENCES, read-only), so the site and the AI
 * planner always describe the same six experiences. Only the photo, its crop,
 * the stamp tint and which of the knowledge-base places the card shows live
 * here. Copy (descriptions, alt text, captions) is in src/i18n/<lang>/experiences.json.
 *
 * Photos and focal points: docs/research/photo-plan.md §4 (primary picks).
 */
import { EXPERIENCES, type Experience } from '../../../lib/ai/knowledge';
import { placeName } from '../../../lib/ai/places';
import type { ExperienceId, Locale, PlaceId } from '../../../lib/ai/types';

export type Tint = 'green' | 'red';

/** A labelled stretch of months. `peak` = the best time, `open` = possible. */
export interface SeasonBand {
  /** Key in experiences.json → seasons. */
  kind: 'best' | 'harvest' | 'harvestTable' | 'highRoutes' | 'lowerRoutes' | 'beach' | 'ski';
  /** Months 1–12; `from` > `to` wraps over New Year (ski: 12 → 4). */
  from: number;
  to: number;
  level: 'peak' | 'open';
}

export interface Season {
  /** Possible in every month (draws a hairline under all twelve). */
  yearRound: boolean;
  bands: readonly SeasonBand[];
  /** Extra phrase after the bands, key in experiences.json → seasons. */
  note?: 'feasts';
}

export interface CardData {
  id: ExperienceId;
  photo: string;
  /** CSS object-position of the subject (photo plan). */
  focal: string;
  tint: Tint;
  /** Shown in this order; every id must be in the knowledge base's list for this experience. */
  places: readonly PlaceId[];
  /** Condensed from the knowledge base's `seasons` text — keep the two in step. */
  season: Season;
}

const CARDS: readonly CardData[] = [
  {
    id: 'culture',
    photo: 'tbilisi-1',
    // Plan: 45% 40%. Nudged left so Narikala's walls stay whole in the 4:5 crop.
    focal: '42% 40%',
    tint: 'green',
    places: ['tbilisi', 'vardzia', 'yerevan', 'baku'],
    // "Year-round. April–June and September–October are the most comfortable"
    season: {
      yearRound: true,
      bands: [
        { kind: 'best', from: 4, to: 6, level: 'peak' },
        { kind: 'best', from: 9, to: 10, level: 'peak' },
      ],
    },
  },
  {
    id: 'wine',
    photo: 'rtveli-harvest',
    focal: '60% 45%',
    tint: 'red',
    places: ['telavi', 'tsinandali', 'sighnaghi', 'areni'],
    // "Year-round tastings. Rtveli harvest typically mid-September to October"
    season: { yearRound: true, bands: [{ kind: 'harvest', from: 9, to: 10, level: 'peak' }] },
  },
  {
    id: 'trekking',
    photo: 'truso-valley',
    focal: '50% 55%',
    tint: 'green',
    places: ['mestia', 'ushguli', 'truso', 'khinalug'],
    // "High mountains roughly mid-June to late September … Lower routes May to October"
    season: {
      yearRound: false,
      bands: [
        { kind: 'highRoutes', from: 6, to: 9, level: 'peak' },
        { kind: 'lowerRoutes', from: 5, to: 10, level: 'open' },
      ],
    },
  },
  {
    id: 'gastronomy',
    photo: 'georgian-food',
    focal: '50% 70%',
    tint: 'red',
    places: ['kutaisi', 'batumi', 'yerevan', 'sheki'],
    // "Year-round. Late summer and autumn bring harvest produce, new wine and churchkhela-making"
    season: { yearRound: true, bands: [{ kind: 'harvestTable', from: 8, to: 11, level: 'peak' }] },
  },
  {
    id: 'pilgrim',
    photo: 'david-gareja',
    focal: '45% 65%',
    tint: 'green',
    places: ['mtskheta', 'david-gareja', 'khor-virap'],
    // "Year-round. Great feasts … are moving but busy; the team checks feast dates each year."
    season: { yearRound: true, bands: [], note: 'feasts' },
  },
  {
    id: 'leisure',
    photo: 'batumi',
    focal: '50% 55%',
    tint: 'red',
    places: ['batumi', 'borjomi', 'gudauri', 'sevan'],
    // "Beach season roughly June–September; ski season in Gudauri roughly December–April;
    //  spa towns, lakes and wine country from spring to autumn and beyond."
    season: {
      yearRound: true,
      bands: [
        { kind: 'beach', from: 6, to: 9, level: 'peak' },
        { kind: 'ski', from: 12, to: 4, level: 'peak' },
      ],
    },
  },
];

export interface ExperienceCard extends CardData {
  /** 1-based position, for "Nº 01". */
  number: number;
  experience: Experience;
}

/** The six cards in template order, joined to the knowledge base. Throws at build time if they drift apart. */
export const EXPERIENCE_CARDS: readonly ExperienceCard[] = EXPERIENCES.map((experience, i) => {
  const card = CARDS.find((c) => c.id === experience.id);
  if (!card) throw new Error(`[experiences] no card data for "${experience.id}"`);
  const stray = card.places.filter((p) => !experience.places.includes(p));
  if (stray.length) {
    throw new Error(`[experiences] ${experience.id}: ${stray.join(', ')} not in the knowledge base's places`);
  }
  return { ...card, number: i + 1, experience };
});

export function placeNames(card: CardData, lang: Locale): string[] {
  return card.places.map((id) => placeName(id, lang));
}

/** 0 = not offered · 1 = possible · 2 = best — one value per month, January first. */
export function monthLevels(season: Season): number[] {
  const levels: number[] = Array.from({ length: 12 }, () => (season.yearRound ? 1 : 0));
  for (const band of season.bands) {
    const value = band.level === 'peak' ? 2 : 1;
    for (const m of monthsOf(band)) levels[m - 1] = Math.max(levels[m - 1], value);
  }
  return levels;
}

function monthsOf(band: SeasonBand): number[] {
  const out: number[] = [];
  for (let m = band.from; ; m = (m % 12) + 1) {
    out.push(m);
    if (m === band.to || out.length === 12) return out;
  }
}

/**
 * Month initials and short names in the page language, through Intl
 * (localeInfo(lang).bcp47). Rendered at build time, so every visitor sees
 * the same text.
 */
export function monthNames(bcp47: string): { narrow: string[]; short: string[] } {
  const narrow = new Intl.DateTimeFormat(bcp47, { month: 'narrow', timeZone: 'UTC' });
  const short = new Intl.DateTimeFormat(bcp47, { month: 'short', timeZone: 'UTC' });
  const dates = Array.from({ length: 12 }, (_, m) => new Date(Date.UTC(2026, m, 15)));
  return {
    narrow: dates.map((d) => narrow.format(d)),
    // Strip the abbreviation dot (de "Sept.", ka "აპრ.") — ranges read "Apr–Jun".
    short: dates.map((d) => short.format(d).replace(/\.$/, '')),
  };
}

/**
 * The visible season line, e.g. "Year-round · best Apr–Jun, Sep–Oct".
 * `labels` are the experiences.json → seasons strings ("best {months}").
 */
export function seasonLine(
  season: Season,
  labels: Record<string, string>,
  short: readonly string[],
  capitalise: (s: string) => string,
): string {
  const range = (b: SeasonBand) => (b.from === b.to ? short[b.from - 1] : `${short[b.from - 1]}–${short[b.to - 1]}`);
  const parts: string[] = [];
  if (season.yearRound) parts.push(labels.yearRound);
  const kinds = [...new Set(season.bands.map((b) => b.kind))];
  for (const kind of kinds) {
    const months = season.bands
      .filter((b) => b.kind === kind)
      .map(range)
      .join(', ');
    parts.push(labels[kind].replace('{months}', months));
  }
  if (season.note) parts.push(labels[season.note]);
  return parts.map((p, i) => (i === 0 ? capitalise(p) : p)).join(' · ');
}
