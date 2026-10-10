/**
 * Shared types for the Local Host AI layer.
 *
 * Browser-safe: this module has no runtime dependencies and can be imported
 * from client scripts as well as from API routes.
 */

/** Site / answer languages. `en` is the default (served at `/`). */
export type Locale = 'en' | 'ka' | 'pl' | 'it' | 'de';

/** `live` = a real Claude call; `demo` = no API key, canned fixture output. */
export type AiMode = 'live' | 'demo';

/** ISO 3166-1 alpha-2 codes of the three countries Local Host operates in. */
export type CountryCode = 'GE' | 'AM' | 'AZ';
export const COUNTRY_CODES = ['GE', 'AM', 'AZ'] as const satisfies readonly CountryCode[];

/** The six experiences from the owner's template, in template order. */
export type ExperienceId = 'culture' | 'wine' | 'trekking' | 'gastronomy' | 'pilgrim' | 'leisure';
export const EXPERIENCE_IDS = [
  'culture',
  'wine',
  'trekking',
  'gastronomy',
  'pilgrim',
  'leisure',
] as const satisfies readonly ExperienceId[];

export type PlaceType =
  | 'city'
  | 'village'
  | 'monastery'
  | 'nature'
  | 'wine'
  | 'mountain'
  | 'resort'
  | 'heritage';

/**
 * Every place id known to the AI layer (see `places.ts`). Kept as a const
 * tuple so ids can be validated at runtime (`isPlaceId`) and the compiler
 * checks that `places.ts` has exactly one entry per id.
 */
export const PLACE_IDS = [
  // Georgia
  'tbilisi',
  'mtskheta',
  'uplistsikhe',
  'ananuri',
  'gudauri',
  'stepantsminda',
  'gergeti',
  'truso',
  'juta-chaukhi',
  'shatili',
  'tusheti',
  'jokolo',
  'telavi',
  'tsinandali',
  'kvareli',
  'lopota',
  'sighnaghi',
  'bodbe',
  'david-gareja',
  'kutaisi',
  'gelati',
  'prometheus-cave',
  'okatse-canyon',
  'martvili-canyon',
  'katskhi-pillar',
  'borjomi',
  'akhaltsikhe',
  'vardzia',
  'paravani-lake',
  'batumi',
  'adjara-mountains',
  'mestia',
  'ushguli',
  // Armenia
  'yerevan',
  'garni',
  'geghard',
  'khor-virap',
  'areni',
  'noravank',
  'tatev',
  'sevan',
  'dilijan',
  // Azerbaijan
  'baku',
  'gobustan',
  'yanar-dag',
  'shamakhi',
  'lahij',
  'gabala',
  'sheki',
  'khinalug',
  'ganja',
] as const;
export type PlaceId = (typeof PLACE_IDS)[number];

/** A name in every site language (exonyms where they exist, e.g. de: "Tiflis"). */
export type LocalizedText = Record<Locale, string>;

export interface Place {
  id: PlaceId;
  country: CountryCode;
  /** Administrative / historical region in English, e.g. "Kakheti". */
  region: string;
  /** WGS84 latitude, ~0.01° precision. */
  lat: number;
  /** WGS84 longitude, ~0.01° precision. */
  lon: number;
  names: LocalizedText;
  type: PlaceType;
  experiences: readonly ExperienceId[];
  /** File name in `src/assets/photos/` when a matching company photo exists. */
  photo?: string;
}

export function isExperienceId(value: unknown): value is ExperienceId {
  return typeof value === 'string' && (EXPERIENCE_IDS as readonly string[]).includes(value);
}

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && (COUNTRY_CODES as readonly string[]).includes(value);
}

export function isPlaceId(value: unknown): value is PlaceId {
  return typeof value === 'string' && (PLACE_IDS as readonly string[]).includes(value);
}
