/**
 * Locales supported by the site and the AI features.
 *
 * Browser-safe (no runtime dependencies). The BCP-47 tags match the sitemap
 * config in astro.config.mjs (en, ka-GE, pl-PL, it-IT, de-DE).
 */
import type { Locale } from './types';

export type { Locale };

export interface LocaleInfo {
  code: Locale;
  /** Language name in English, e.g. "Georgian". */
  english: string;
  /** Language name in the language itself, e.g. "ქართული". */
  native: string;
  /** BCP-47 tag for `lang`, `hreflang`, `Intl.*`. */
  bcp47: string;
  /** Text direction (all current locales are LTR; kept for completeness). */
  dir: 'ltr' | 'rtl';
}

export const DEFAULT_LOCALE: Locale = 'en';

/** In display order. */
export const LOCALES = ['en', 'ka', 'pl', 'it', 'de'] as const satisfies readonly Locale[];

export const LOCALE_INFO: Readonly<Record<Locale, LocaleInfo>> = {
  en: { code: 'en', english: 'English', native: 'English', bcp47: 'en', dir: 'ltr' },
  ka: { code: 'ka', english: 'Georgian', native: 'ქართული', bcp47: 'ka-GE', dir: 'ltr' },
  pl: { code: 'pl', english: 'Polish', native: 'Polski', bcp47: 'pl-PL', dir: 'ltr' },
  it: { code: 'it', english: 'Italian', native: 'Italiano', bcp47: 'it-IT', dir: 'ltr' },
  de: { code: 'de', english: 'German', native: 'Deutsch', bcp47: 'de-DE', dir: 'ltr' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Normalises anything (e.g. "de-AT", "KA", undefined) to a supported locale,
 * falling back to English.
 */
export function normalizeLocale(value: unknown): Locale {
  if (typeof value !== 'string') return DEFAULT_LOCALE;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : DEFAULT_LOCALE;
}

/**
 * Picks the best locale for a request: explicit value first (e.g. from the
 * JSON body), then the Accept-Language header, then English.
 */
export function pickLocale(explicit: unknown, request?: Request): Locale {
  if (isLocale(explicit)) return explicit;
  if (typeof explicit === 'string' && explicit.trim()) return normalizeLocale(explicit);
  const header = request?.headers.get('accept-language');
  if (header) {
    const ranked = header
      .split(',')
      .map((part) => {
        const [tag, ...params] = part.trim().split(';');
        const q = params.find((p) => p.trim().startsWith('q='));
        return { tag: tag ?? '', q: q ? Number(q.trim().slice(2)) || 0 : 1 };
      })
      .sort((a, b) => b.q - a.q);
    for (const { tag } of ranked) {
      const base = tag.toLowerCase().split(/[-_]/)[0];
      if (isLocale(base)) return base;
    }
  }
  return DEFAULT_LOCALE;
}

const EXTRA_GUIDANCE: Record<Locale, string> = {
  en: 'Use clear, warm British-or-international English that a non-native travel professional reads easily.',
  ka:
    'Write in natural, idiomatic modern Georgian using the Mkhedruli script (never Latin transliteration). ' +
    'Use the standard Georgian spellings of place names (e.g. მცხეთა, სიღნაღი, ერევანი, ბაქო).',
  pl:
    'Write in natural Polish with correct diacritics. Use Polish exonyms where they exist ' +
    '(e.g. Erywań, Achalciche, Tuszetia, Swanetia, Kachetia, Adżaria).',
  it:
    'Write in natural Italian. Use Italian exonyms where they exist ' +
    '(e.g. Erevan, Agiaria, Cachezia, Svanezia).',
  de:
    'Write in natural German (use "Sie"). Use German exonyms where they exist ' +
    '(e.g. Tiflis, Jerewan, Kachetien, Swanetien, Adscharien, Tuschetien).',
};

/**
 * One instruction block telling Claude which language to answer in. Put it in
 * the *volatile* part of the prompt (after the cached knowledge base), never
 * inside the cached system block, so all locales share one cache entry.
 */
export function languageInstruction(locale: Locale): string {
  const info = LOCALE_INFO[locale];
  const native = info.native === info.english ? '' : ` (${info.native})`;
  return (
    `Answer language: ${info.english}${native}, BCP-47 "${info.bcp47}". ` +
    `Write the entire visible answer in ${info.english}, even if the visitor's message or the knowledge base is in another language. ` +
    `Keep proper names of people and businesses as written in the knowledge base. ` +
    EXTRA_GUIDANCE[locale]
  );
}
