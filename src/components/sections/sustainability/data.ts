/**
 * 09 · Sustainability — data that is not copy (dates, figures, files, URLs).
 * Copy lives in src/i18n/<lang>/sustainability.json.
 *
 * Sources
 *   - Travelife: public register entry for "Local Host LLC" (level Partner),
 *     see src/data/research-orgs.json → travelife and docs/research/organisations-awards-hosts.md §3.
 *   - Figures: Sustainability Policy (11 Aug 2025), "Environmental Protection".
 *   - Documents: public/assets/policies/*.pdf (titles and dates as printed on
 *     each PDF; page counts and sizes measured from the files).
 */
import type { ImageMetadata } from 'astro';

/** Travelife public register (EN). The official Partner logo, once supplied, links here too. */
export const TRAVELIFE_REGISTER_URL = 'https://consumers.travelife.info/?lang=en#register';

/** Register entry for Local Host LLC (ISO dates). */
export const TRAVELIFE = {
  firstApproval: '2025-11-26',
  validUntil: '2027-11-26',
} as const;

/**
 * Typeset stand-in for the official Travelife Partner logo (brand words stay
 * in English in every language). Replace with the logo file from Travelife's
 * communication toolkit when the owner sends it (docs/CONTENT-TODO.md).
 */
export const TRAVELIFE_BADGE = { name: 'Travelife', level: 'Partner' } as const;

/**
 * Certificate image. `null` renders the "certificate image to come" preview.
 * When the owner sends it: put it in src/components/sections/sustainability/
 * and set e.g. `import cert from './travelife-certificate.png'` → CERTIFICATE_IMAGE = cert.
 */
export const CERTIFICATE_IMAGE: ImageMetadata | null = null;

/** Office consumption, January–October 2025 vs the same period of 2024 (percent change). */
export const REDUCTIONS = [
  { key: 'energy', change: -10.1 },
  { key: 'gas', change: -36.3 },
] as const;

export type PolicyKey = 'sustainability' | 'report' | 'excursions' | 'accommodations' | 'inbound';

export interface PolicyFile {
  key: PolicyKey;
  /** Historical URL — keep (old links point here). Note the "accomodations" spelling. */
  href: string;
  /** Date printed on the document (ISO). */
  date: string;
  /** "effective" for policies, "published" for the report. */
  dateKind: 'effective' | 'published';
  pages: number;
  /** File size in bytes. */
  bytes: number;
}

export const POLICY_FILES: readonly PolicyFile[] = [
  { key: 'sustainability', href: '/assets/policies/sustainability.pdf', date: '2025-08-11', dateKind: 'effective', pages: 4, bytes: 204702 },
  { key: 'report', href: '/assets/policies/report.pdf', date: '2025-11-11', dateKind: 'published', pages: 3, bytes: 243254 },
  { key: 'excursions', href: '/assets/policies/excursions.pdf', date: '2025-08-11', dateKind: 'effective', pages: 2, bytes: 178204 },
  { key: 'accommodations', href: '/assets/policies/accomodations.pdf', date: '2025-08-11', dateKind: 'effective', pages: 2, bytes: 158240 },
  { key: 'inbound', href: '/assets/policies/inbound.pdf', date: '2025-08-11', dateKind: 'effective', pages: 3, bytes: 161746 },
];

/**
 * Verbatim lines from the Sustainability Policy (11 Aug 2025). Quoted exactly
 * as printed, in English, the language of the document — never edit or
 * translate them here; each language file carries its own marked translation.
 */
export const QUOTES = {
  /** "Environmental Protection" */
  landscapes:
    'We love the mountains of Svaneti, the landscapes of Samtskhe-Javakheti, the view on Caucasus Range from Telavi, the beauty of Martvili Canyon, the mystique of Paravani Lake and the authenticity of Adjara villages.',
  /** Closing line of four chapters. */
  partners: 'We expect commitment and further reinforcement of these values from all our partners and suppliers.',
} as const;

/** The compared periods (January–October of each year). */
export const PERIOD = { before: '2024', after: '2025' } as const;

/** The Sustainability Policy's date, for quote attributions. */
export const POLICY_DATE = '2025-08-11';

/** AI Lab · Policy Q&A (localised with localizePath). */
export const POLICY_QA_PATH = '/ai-lab/#policy-qa';

/** Photo next to the "We love the mountains of Svaneti…" quote (docs/research/photo-plan.md §6, alternate band). */
export const QUOTE_PHOTO = { name: 'svaneti-2', focal: '42% 62%' } as const;
