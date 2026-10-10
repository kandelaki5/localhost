/**
 * Compact, localised place info attached to AI results (Photo Match cards,
 * proposal maps). BROWSER-SAFE: depends only on places.ts / types.ts, so the
 * API routes and client code share exactly one definition.
 */
import { findPlace, project } from '../places';
import type { CountryCode, ExperienceId, Locale, PlaceId, PlaceType } from '../types';

export interface PlaceInfo {
  id: PlaceId;
  /** Name in the requested locale (exonyms where they exist, e.g. de "Tiflis"). */
  name: string;
  country: CountryCode;
  /** English region name, e.g. "Kakheti". */
  region: string;
  type: PlaceType;
  lat: number;
  lon: number;
  /** Position on the shared SVG map (`MAP_VIEWBOX` = "0 0 1000 675.3"), 1 decimal. */
  x: number;
  y: number;
  /** File name in `src/assets/photos/` when a company photo exists, else null. */
  photo: string | null;
  experiences: ExperienceId[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** PlaceInfo for a known id (undefined for unknown ids — safe for untrusted input). */
export function placeInfo(id: string, locale: Locale): PlaceInfo | undefined {
  const place = findPlace(id);
  if (!place) return undefined;
  const { x, y } = project(place.lat, place.lon);
  return {
    id: place.id,
    name: place.names[locale],
    country: place.country,
    region: place.region,
    type: place.type,
    lat: place.lat,
    lon: place.lon,
    x: round1(x),
    y: round1(y),
    photo: place.photo ?? null,
    experiences: [...place.experiences],
  };
}

/** PlaceInfo for every known id in `ids` (unknown ids are skipped), keyed by id, in first-seen order. */
export function placeInfoMap(ids: Iterable<string>, locale: Locale): Partial<Record<PlaceId, PlaceInfo>> {
  const out: Partial<Record<PlaceId, PlaceInfo>> = {};
  for (const id of ids) {
    if (id in out) continue;
    const info = placeInfo(id, locale);
    if (info) out[info.id] = info;
  }
  return out;
}
