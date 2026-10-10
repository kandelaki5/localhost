/**
 * Build-time data for the Plan section (#plan): the night map's geometry,
 * simplified country outlines for the country stamps, graticule lines and
 * the place dots. Runs in Astro frontmatter only (nothing here is shipped to
 * the browser), so the 29 KB map file is read once at build time and only
 * the shapes the page needs are inlined, rounded and simplified.
 */
import map from '../../../data/caucasus-map.json';
import { MAP_BOUNDS, PLACES, project } from '../../../lib/ai/places';
import type { CountryCode } from '../../../lib/ai/types';

type Point = [number, number];

// ---------------------------------------------------------------------------
// Path parsing + simplification (Ramer–Douglas–Peucker)
// ---------------------------------------------------------------------------

/**
 * Turns the map's path data (M, l, h, v, z — absolute M, relative others,
 * plus their absolute forms for safety) into closed rings of absolute points.
 */
function rings(d: string): Point[][] {
  const out: Point[][] = [];
  const tokens = d.match(/[MmLlHhVvZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  let ring: Point[] = [];
  let x = 0;
  let y = 0;
  let cmd = '';
  let i = 0;
  const num = () => Number(tokens[i++]);
  const close = () => {
    if (ring.length > 2) out.push(ring);
    ring = [];
  };
  while (i < tokens.length) {
    const t = tokens[i] ?? '';
    if (/[A-Za-z]/.test(t)) {
      cmd = t;
      i++;
      if (cmd === 'z' || cmd === 'Z') {
        close();
        continue;
      }
    }
    switch (cmd) {
      case 'M':
        close();
        x = num();
        y = num();
        ring.push([x, y]);
        cmd = 'L';
        break;
      case 'm':
        close();
        x += num();
        y += num();
        ring.push([x, y]);
        cmd = 'l';
        break;
      case 'L':
        x = num();
        y = num();
        ring.push([x, y]);
        break;
      case 'l':
        x += num();
        y += num();
        ring.push([x, y]);
        break;
      case 'H':
        x = num();
        ring.push([x, y]);
        break;
      case 'h':
        x += num();
        ring.push([x, y]);
        break;
      case 'V':
        y = num();
        ring.push([x, y]);
        break;
      case 'v':
        y += num();
        ring.push([x, y]);
        break;
      default:
        i++; // unknown token: skip
    }
  }
  close();
  return out;
}

function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function rdp(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  const first = points[0] as Point;
  const last = points[points.length - 1] as Point;
  let index = 0;
  let max = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const dist = segmentDistance(points[i] as Point, first, last);
    if (dist > max) {
      max = dist;
      index = i;
    }
  }
  if (max <= tolerance) return [first, last];
  const left = rdp(points.slice(0, index + 1), tolerance);
  const right = rdp(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Simplified, absolute path data. Rings smaller than `minArea` (tiny islets)
 * are dropped; `offset` shifts every point (used to re-origin a shape at 0,0).
 */
export function simplifyPath(d: string, tolerance: number, options: { minExtent?: number; offset?: Point } = {}): string {
  const [ox, oy] = options.offset ?? [0, 0];
  const parts: string[] = [];
  for (const ring of rings(d)) {
    const xs = ring.map((p) => p[0]);
    const ys = ring.map((p) => p[1]);
    const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (extent < (options.minExtent ?? 0)) continue;
    // Split the closed ring in two halves so RDP keeps its shape.
    const mid = Math.floor(ring.length / 2);
    const simplified = [
      ...rdp(ring.slice(0, mid + 1), tolerance).slice(0, -1),
      ...rdp([...ring.slice(mid), ring[0] as Point], tolerance).slice(0, -1),
    ];
    if (simplified.length < 3) continue;
    parts.push(`M${simplified.map(([x, y]) => `${r1(x - ox)} ${r1(y - oy)}`).join('L')}Z`);
  }
  return parts.join('');
}

// ---------------------------------------------------------------------------
// The night map
// ---------------------------------------------------------------------------

export const MAP_W = map.width;
export const MAP_H = map.height;

const COUNTRY_ORDER: readonly CountryCode[] = ['GE', 'AM', 'AZ'];

/** Base map shapes, simplified to ≈ 0.35 units (well under a pixel at full view). */
export const nightMap = {
  land: simplifyPath(map.land, 0.35),
  countries: COUNTRY_ORDER.map((code) => ({
    code,
    d: simplifyPath(map.countries[code].d, 0.35),
    label: map.countries[code].label,
    names: map.countries[code].name,
  })),
  lakes: map.lakes.map((lake) => ({ d: simplifyPath(lake.d, 0.35), names: lake.name, label: lake.label })),
  neighbours: Object.values(map.neighbours).map((n) => ({ names: n.name, label: n.label })),
  seas: map.labels.seas.map((s) => ({ names: s.name, x: s.x, y: s.y })),
};

/** Lines of longitude/latitude every whole degree, with their edge labels. */
export function graticule() {
  const lines: { d: string; label: string; x: number; y: number; axis: 'lat' | 'lon' }[] = [];
  for (let lon = Math.ceil(MAP_BOUNDS.minLon); lon <= Math.floor(MAP_BOUNDS.maxLon); lon++) {
    const { x } = project(MAP_BOUNDS.maxLat, lon);
    lines.push({ d: `M${x} 0V${MAP_H}`, label: `${lon}°E`, x, y: MAP_H - 10, axis: 'lon' });
  }
  for (let lat = Math.ceil(MAP_BOUNDS.minLat); lat <= Math.floor(MAP_BOUNDS.maxLat); lat++) {
    const { y } = project(lat, MAP_BOUNDS.minLon);
    lines.push({ d: `M0 ${y}H${MAP_W}`, label: `${lat}°N`, x: 8, y: y - 6, axis: 'lat' });
  }
  return lines;
}

/** Every known place as a faint dot (the "stations" a route can visit). */
export const placeDots = PLACES.map((p) => ({ id: p.id, country: p.country, ...project(p.lat, p.lon) }));

/** Tbilisi, where the Local Host office is (city centre; not the street address). */
export const OFFICE = project(41.69, 44.8);

// ---------------------------------------------------------------------------
// Country stamps: each country's outline, re-origined into its own viewBox
// ---------------------------------------------------------------------------

export function countryOutline(code: CountryCode) {
  const country = map.countries[code];
  const { x, y, width, height } = country.bounds;
  return {
    d: simplifyPath(country.d, 1.6, { minExtent: 14, offset: [x, y] }),
    viewBox: `0 0 ${r1(width)} ${r1(height)}`,
    width,
    height,
    /** Top-left of the country's bounding box in map units (subtract it from project() points). */
    origin: [x, y] as const,
  };
}
