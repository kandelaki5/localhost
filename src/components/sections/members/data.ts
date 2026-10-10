/**
 * The five organisations from the owner's template ("Proud member of"),
 * joined with the researched URLs and native names in
 * src/data/research-orgs.json (read-only; see docs/research/organisations-awards-hosts.md).
 *
 * Grouped by country, as on the two pages of a passport spread.
 * Names in the page's language live in src/i18n/<lang>/members.json.
 *
 * LOGOS: the official logos are not in the repo yet (docs/CONTENT-TODO.md).
 * When they arrive, put them in src/assets/members/ and set `logo` below to
 * the imported image (e.g. `import gtaLogo from '../../../assets/members/gta.svg'`).
 * The permit then shows the logo in its photo box instead of the acronym.
 */
import type { ImageMetadata } from 'astro';
import research from '../../../data/research-orgs.json';

export type OrgId = 'gnta' | 'gta' | 'cebg' | 'pit' | 'sit';
export type OrgType = 'administration' | 'association' | 'bureau' | 'chamber' | 'regional';
export type Country = 'ge' | 'pl';

export interface Org {
  id: OrgId;
  acronym: string;
  country: Country;
  type: OrgType;
  url: string;
  domain: string;
  /** Name in the organisation's own language, and that language. */
  native: { text: string; lang: 'ka' | 'pl' } | null;
  /** Official logo (to follow). */
  logo?: ImageMetadata;
  /** Degrees, within ±2. */
  tilt: number;
}

interface MemberJson {
  id: string;
  acronym: string;
  nativeName: string | null;
  url: string;
}

const byId = new Map((research.members as MemberJson[]).map((m) => [m.id, m]));

// Template order within each country: GNTA · GTA · CEBG | PIT · ŚIT.
const LOOK: { id: OrgId; country: Country; type: OrgType; nativeLang: 'ka' | 'pl'; tilt: number }[] = [
  { id: 'gnta', country: 'ge', type: 'administration', nativeLang: 'ka', tilt: -1 },
  { id: 'gta', country: 'ge', type: 'association', nativeLang: 'ka', tilt: 0.75 },
  { id: 'cebg', country: 'ge', type: 'bureau', nativeLang: 'ka', tilt: -0.5 },
  { id: 'pit', country: 'pl', type: 'chamber', nativeLang: 'pl', tilt: 1 },
  { id: 'sit', country: 'pl', type: 'regional', nativeLang: 'pl', tilt: -1.25 },
];

/** "სსიპ" (LEPL) is a legal-form prefix, not part of the name people use. */
const tidy = (name: string) => name.replace(/^სსიპ\s+/, '');

export const ORGS: Org[] = LOOK.flatMap((look) => {
  const m = byId.get(look.id);
  if (!m) return [];
  return [
    {
      id: look.id,
      acronym: m.acronym,
      country: look.country,
      type: look.type,
      url: m.url,
      domain: new URL(m.url).hostname.replace(/^www\./, ''),
      native: m.nativeName ? { text: tidy(m.nativeName), lang: look.nativeLang } : null,
      tilt: look.tilt,
    },
  ];
});

export const COUNTRIES: { id: Country; iso3: string; native: { text: string; lang: 'ka' | 'pl' } }[] = [
  { id: 'ge', iso3: 'GEO', native: { text: 'საქართველო', lang: 'ka' } },
  { id: 'pl', iso3: 'POL', native: { text: 'Polska', lang: 'pl' } },
];

/**
 * Machine-readable-zone line for the permit (decorative): the English name in
 * MRZ alphabet, "<" as filler. "Georgian Tourism Association" →
 * "GEO<GTA<<GEORGIAN<TOURISM<ASSOCIATION<<<<…"
 */
export function mrz(iso3: string, acronym: string, englishName: string, length = 44): string {
  const clean = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/Ł/g, 'L')
      .replace(/ł/g, 'l')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '<')
      .replace(/^<|<$/g, '');
  return `${iso3}<${clean(acronym)}<<${clean(englishName)}`.padEnd(length, '<').slice(0, length);
}
