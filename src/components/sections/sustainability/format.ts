/**
 * Locale-aware formatting for the Sustainability section (Intl only: no
 * hand-written number or date formats).
 */
import { localeInfo, type Lang } from '../../../i18n';

const MINUS = '−';

/**
 * BCP 47 tag for formatting. English uses British conventions ("26 November
 * 2025"), matching the site's en_GB Open Graph locale and its European buyers.
 * (Requested as a shared change: docs/requests/sustainability.md.)
 */
function tag(lang: Lang): string {
  return lang === 'en' ? 'en-GB' : localeInfo(lang).bcp47;
}

/** ISO date (YYYY-MM-DD) → "26 November 2025" in the page's language. */
export function formatDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(tag(lang), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export interface PercentParts {
  /** Sign and number with a true minus sign (U+2212), e.g. "−10.1". */
  value: string;
  /** The percent sign with the locale's own spacing: "%" (en) or " %" (de). */
  unit: string;
  /** Both, for accessible names. */
  full: string;
}

/** −10.1 → { value: "−10.1", unit: "%" } (en) · { value: "−10,1", unit: " %" } (de). */
export function percentParts(change: number, lang: Lang): PercentParts {
  const parts = new Intl.NumberFormat(tag(lang), {
    style: 'percent',
    signDisplay: 'exceptZero',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).formatToParts(change / 100);
  const at = parts.findIndex((p) => p.type === 'percentSign');
  let value = '';
  let unit = '';
  parts.forEach((p, i) => {
    const isUnit = i === at || (p.type === 'literal' && Math.abs(i - at) === 1);
    if (isUnit) unit += p.value;
    else value += p.type === 'minusSign' ? MINUS : p.value;
  });
  return { value, unit, full: value + unit };
}

/** The later period as an index of the earlier one (= 100): −10.1 % → "89.9". */
export function indexValue(change: number, lang: Lang): string {
  return formatNumber(100 + change, lang, 1);
}

export function formatNumber(n: number, lang: Lang, fractionDigits = 0): string {
  return new Intl.NumberFormat(tag(lang), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

/** Bytes → kilobytes (rounded, as file managers show them), formatted for the locale. */
export function kilobytes(bytes: number, lang: Lang): string {
  return formatNumber(Math.round(bytes / 1024), lang);
}
