/**
 * i18n for localhost.ge
 *
 *   const lang = getLang(Astro);                 // 'en' | 'ka' | 'pl' | 'it' | 'de'
 *   const t = useStrings(lang, 'caucasus');      // src/i18n/<lang>/caucasus.json, merged over EN
 *   localizePath('/credits/', 'de')              // '/de/credits/'
 *   alternateLinks('/ka/credits/')               // hreflang list incl. x-default
 *
 * English is canonical. Every other language file is deep-merged over the
 * English one, so a missing key shows English (and warns in dev) instead of
 * breaking the page. Keys starting with "_" are notes and never rendered.
 */
import enCommon from './en/common.json';
import enHero from './en/hero.json';
import enCaucasus from './en/caucasus.json';
import enExperiences from './en/experiences.json';
import enHosts from './en/hosts.json';
import enAirlines from './en/airlines.json';
import enConnection from './en/connection.json';
import enMeetUs from './en/meet-us.json';
import enMembers from './en/members.json';
import enAwards from './en/awards.json';
import enSustainability from './en/sustainability.json';
import enSupport from './en/support.json';
import enPlan from './en/plan.json';
import enContact from './en/contact.json';
import enAiLab from './en/ai-lab.json';
import enCredits from './en/credits.json';

// ── Locales ────────────────────────────────────────────────────────────────

export const LOCALES = [
  { code: 'en', short: 'EN', native: 'English', english: 'English', bcp47: 'en', ogLocale: 'en_GB' },
  { code: 'ka', short: 'KA', native: 'ქართული', english: 'Georgian', bcp47: 'ka-GE', ogLocale: 'ka_GE' },
  { code: 'pl', short: 'PL', native: 'Polski', english: 'Polish', bcp47: 'pl-PL', ogLocale: 'pl_PL' },
  { code: 'it', short: 'IT', native: 'Italiano', english: 'Italian', bcp47: 'it-IT', ogLocale: 'it_IT' },
  { code: 'de', short: 'DE', native: 'Deutsch', english: 'German', bcp47: 'de-DE', ogLocale: 'de_DE' },
] as const;

export type Lang = (typeof LOCALES)[number]['code'];
export type LocaleInfo = (typeof LOCALES)[number];

export const DEFAULT_LANG: Lang = 'en';
export const LANGS: readonly Lang[] = LOCALES.map((l) => l.code);
/** Languages that live under a prefix (/ka/, /pl/ …) — for getStaticPaths. */
export const PREFIXED_LANGS: readonly Lang[] = LANGS.filter((l) => l !== DEFAULT_LANG);

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

export function localeInfo(lang: Lang): LocaleInfo {
  return LOCALES.find((l) => l.code === lang) ?? LOCALES[0];
}

/** Static paths for pages under src/pages/[lang]/. */
export function langStaticPaths() {
  return PREFIXED_LANGS.map((lang) => ({ params: { lang } }));
}

/**
 * The language of the page being rendered. Works in pages and components:
 * `const lang = getLang(Astro)`.
 */
export function getLang(astro: {
  params?: Record<string, string | undefined>;
  currentLocale?: string | undefined;
  url?: URL;
}): Lang {
  const fromParam = astro.params?.lang;
  if (isLang(fromParam)) return fromParam;
  if (isLang(astro.currentLocale)) return astro.currentLocale;
  if (astro.url) return stripLang(astro.url.pathname).lang;
  return DEFAULT_LANG;
}

// ── Strings ────────────────────────────────────────────────────────────────

const EN = {
  common: enCommon,
  hero: enHero,
  caucasus: enCaucasus,
  experiences: enExperiences,
  hosts: enHosts,
  airlines: enAirlines,
  connection: enConnection,
  'meet-us': enMeetUs,
  members: enMembers,
  awards: enAwards,
  sustainability: enSustainability,
  support: enSupport,
  plan: enPlan,
  contact: enContact,
  'ai-lab': enAiLab,
  credits: enCredits,
};

/** Every registered section and the shape of its strings (from the English file). */
export type Sections = typeof EN;
export type SectionName = keyof Sections;

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

const FILES = import.meta.glob<JsonObject>('./*/*.json', { eager: true, import: 'default' });

const cache = new Map<string, unknown>();
const warned = new Set<string>();

function warn(message: string) {
  if (!import.meta.env.DEV || warned.has(message)) return;
  warned.add(message);
  console.warn(`[i18n] ${message}`);
}

function isObject(v: unknown): v is JsonObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Deep-merges `local` over `base` (English). Missing keys keep English. */
function merge(base: Json, local: Json | undefined, path: string, file: string): Json {
  if (local === undefined || local === null || local === '') {
    if (path) warn(`${file} is missing "${path}" — showing English.`);
    return base;
  }
  if (Array.isArray(base)) {
    if (!Array.isArray(local)) {
      warn(`${file} "${path}" should be a list — showing English.`);
      return base;
    }
    if (local.length !== base.length) warn(`${file} "${path}" has ${local.length} items, English has ${base.length}.`);
    return local.map((item, i) => (i < base.length ? merge(base[i], item, `${path}[${i}]`, file) : item));
  }
  if (isObject(base)) {
    if (!isObject(local)) {
      warn(`${file} "${path}" should be an object — showing English.`);
      return base;
    }
    const out: JsonObject = {};
    for (const key of Object.keys(base)) {
      if (key.startsWith('_')) continue;
      out[key] = merge(base[key], local[key], path ? `${path}.${key}` : key, file);
    }
    for (const key of Object.keys(local)) {
      if (!key.startsWith('_') && !(key in base)) warn(`${file} has "${path ? `${path}.` : ''}${key}", which English doesn't — ignored.`);
    }
    return out;
  }
  return local;
}

/**
 * Strings for one section in one language: src/i18n/<lang>/<section>.json
 * deep-merged over src/i18n/en/<section>.json.
 */
export function useStrings<S extends SectionName>(lang: Lang, section: S): Sections[S];
export function useStrings<T = Record<string, unknown>>(lang: Lang, section: string): T;
export function useStrings(lang: Lang, section: string): unknown {
  const key = `${lang}/${section}`;
  if (cache.has(key)) return cache.get(key);

  const base = FILES[`./en/${section}.json`];
  if (!base) {
    throw new Error(`[i18n] src/i18n/en/${section}.json does not exist. English is the canonical source — create it first.`);
  }
  let result: unknown = base;
  if (lang !== DEFAULT_LANG) {
    const local = FILES[`./${lang}/${section}.json`];
    if (!local) {
      warn(`src/i18n/${lang}/${section}.json is missing — showing English.`);
    } else {
      result = merge(base, local, '', `${lang}/${section}.json`);
    }
  }
  cache.set(key, result);
  return result;
}

/**
 * The language a section's strings are actually in: `lang` when
 * src/i18n/<lang>/<key>.json exists, otherwise 'en' (the fallback).
 * Put it on the section root as `lang` so English fallback text gets
 * English typography on a Georgian page:
 *   <section lang={contentLang(lang, 'hosts') !== lang ? 'en' : undefined}>
 */
export function contentLang(lang: Lang, section: string): Lang {
  return lang === DEFAULT_LANG || FILES[`./${lang}/${section}.json`] ? lang : DEFAULT_LANG;
}

// ── Paths ──────────────────────────────────────────────────────────────────

const SITE = (import.meta.env.SITE as string | undefined) ?? 'https://www.localhost.ge';

/** Paths that are never localised (files, API routes, build assets). */
function isUnlocalised(pathname: string): boolean {
  return (
    /\.[a-z0-9]{2,5}$/i.test(pathname) ||
    /^\/(api|assets|_astro|og|brand|fonts)(\/|$)/.test(pathname)
  );
}

/** '/ka/credits/' → { lang: 'ka', path: '/credits/' } */
export function stripLang(pathname: string): { lang: Lang; path: string } {
  const m = pathname.match(/^\/([a-z]{2})(\/.*|$)/);
  if (m && isLang(m[1]) && m[1] !== DEFAULT_LANG) return { lang: m[1], path: m[2] || '/' };
  return { lang: DEFAULT_LANG, path: pathname || '/' };
}

function withTrailingSlash(pathname: string): string {
  if (pathname.endsWith('/') || isUnlocalised(pathname)) return pathname;
  return `${pathname}/`;
}

/**
 * The same page in another language. Keeps query and hash; leaves external
 * URLs, mailto:/tel:, in-page anchors and file paths (PDFs …) untouched.
 *   localizePath('/', 'ka')            → '/ka/'
 *   localizePath('/de/credits', 'it')  → '/it/credits/'
 *   localizePath('/#plan', 'pl')       → '/pl/#plan'
 */
export function localizePath(path: string, lang: Lang): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//') || path.startsWith('#')) return path;
  const m = path.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
  let pathname = m?.[1] || '/';
  const query = m?.[2] ?? '';
  const hash = m?.[3] ?? '';
  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  if (isUnlocalised(pathname)) return path;
  const bare = withTrailingSlash(stripLang(pathname).path);
  const localized = lang === DEFAULT_LANG ? bare : `/${lang}${bare}`;
  return localized + query + hash;
}

/** Absolute URL on the production site. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE).href;
}

export interface AlternateLink {
  lang: Lang | 'x-default';
  hreflang: string;
  href: string;
}

/** <link rel="alternate" hreflang> entries for a page, x-default last (→ English). */
export function alternateLinks(path: string): AlternateLink[] {
  const links: AlternateLink[] = LOCALES.map((l) => ({
    lang: l.code,
    hreflang: l.bcp47,
    href: absoluteUrl(localizePath(path, l.code)),
  }));
  links.push({ lang: 'x-default', hreflang: 'x-default', href: absoluteUrl(localizePath(path, DEFAULT_LANG)) });
  return links;
}
