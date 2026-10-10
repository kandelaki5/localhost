#!/usr/bin/env node
/**
 * Builds src/data/caucasus-map.json: SVG path data for the South Caucasus map
 * (Georgia, Armenia, Azerbaijan + faint neighbour outlines, land/sea and big
 * lakes) in EXACTLY the projection of src/lib/ai/places.ts → project(), so
 * place dots from places.ts sit on the right spot of the shapes.
 *
 *   node scripts/build-map.mjs                      # rebuild the JSON
 *   node scripts/build-map.mjs --check              # rebuild + print size/verification only (no write)
 *   node scripts/build-map.mjs --resolution=50m     # coarser outlines from Natural Earth 1:50m (default 10m)
 *   node scripts/build-map.mjs --refresh-lakes=<ne_50m_lakes.geojson>
 *        # re-extract scripts/data/ne-50m-lakes-caucasus.geojson from a full download of
 *        # https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_lakes.geojson
 *
 * Data: Natural Earth 1:10m by default (public domain) — countries + land from the npm
 * package world-atlas@2 (TopoJSON), lakes from the vendored extract in
 * scripts/data/. Natural Earth's default admin-0 boundaries are used (the
 * internationally recognised borders of Georgia, Armenia and Azerbaijan).
 *
 * Projection: the frame constants are read from places.ts itself (transpiled
 * on the fly with the project's TypeScript), and the script fails if any of
 * the 51 places projects differently through d3 than through project().
 *
 * Dev dependencies: world-atlas, topojson-client, d3-geo (+ typescript).
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { feature } from 'topojson-client';
import { geoArea, geoPath, geoProjection } from 'd3-geo';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const OUT_FILE = path.join(ROOT, 'src/data/caucasus-map.json');
const LAKES_FILE = path.join(ROOT, 'scripts/data/ne-50m-lakes-caucasus.geojson');
const MAX_BYTES = 150 * 1024;

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes('--check');
/** Natural Earth scale: 10m (default: smooth coastlines, ~28 KB) or 50m (coarser, ~12 KB). */
const RESOLUTION = args.find((a) => a.startsWith('--resolution='))?.slice('--resolution='.length) ?? '10m';
if (RESOLUTION !== '50m' && RESOLUTION !== '10m') {
  console.error('--resolution must be 50m or 10m');
  process.exit(1);
}
/** Douglas–Peucker tolerance (viewBox units) for the focus countries: 0 at 50m, light at 10m. */
const FOCUS_TOLERANCE = RESOLUTION === '10m' ? 0.2 : 0;
const refreshLakes = args.find((a) => a.startsWith('--refresh-lakes='))?.slice('--refresh-lakes='.length);

// ---------------------------------------------------------------------------
// 1. Load the real projection from src/lib/ai/places.ts
// ---------------------------------------------------------------------------

async function loadPlacesModule() {
  const dir = mkdtempSync(path.join(tmpdir(), 'build-map-'));
  try {
    for (const name of ['types', 'places']) {
      const source = readFileSync(path.join(ROOT, `src/lib/ai/${name}.ts`), 'utf8');
      const { outputText } = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false },
      });
      writeFileSync(path.join(dir, `${name}.mjs`), outputText.replace(/from '\.\/types'/g, "from './types.mjs'"));
    }
    return await import(pathToFileURL(path.join(dir, 'places.mjs')).href);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const P = await loadPlacesModule();
const { MAP_BOUNDS, MAP_LAT0, MAP_SCALE, MAP_WIDTH, MAP_HEIGHT, MAP_VIEWBOX, PLACES, project } = P;

// Same constant expression as places.ts: KX = cos(lat0).
const KX = Math.cos((MAP_LAT0 * Math.PI) / 180);

/**
 * Equidistant cylindrical with standard parallel lat0, written as a d3 raw
 * projection: raw(λ, φ) = [λ·cos(lat0), φ] (radians). With scale k = S·180/π
 * and translate [−minLon·KX·S, maxLat·S] d3 yields
 *   x = (lon − minLon)·KX·S,  y = (maxLat − lat)·S   — i.e. project().
 */
function rawProjection(lambda, phi) {
  return [lambda * KX, phi];
}
rawProjection.invert = (x, y) => [x / KX, y];

/** Margin (viewBox units) so clipped edges of neighbours fall outside the visible frame. */
const PAD = 12;

const projection = geoProjection(rawProjection)
  .scale((MAP_SCALE * 180) / Math.PI)
  .translate([-MAP_BOUNDS.minLon * KX * MAP_SCALE, MAP_BOUNDS.maxLat * MAP_SCALE])
  .precision(0) // straight lon/lat segments stay straight: no great-circle resampling
  .clipExtent([
    [-PAD, -PAD],
    [MAP_WIDTH + PAD, MAP_HEIGHT + PAD],
  ]);

// Verify against project() for every place (project() rounds to 0.1).
let worst = 0;
for (const place of PLACES) {
  const [x, y] = projection([place.lon, place.lat]);
  const ref = project(place.lat, place.lon);
  worst = Math.max(worst, Math.abs(x - ref.x), Math.abs(y - ref.y));
}
if (!(worst <= 0.051)) {
  console.error(`Projection mismatch with places.ts project(): max error ${worst.toFixed(4)} units`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Path serialisation (rounded to 0.1 unit, deduped, relative commands)
// ---------------------------------------------------------------------------

/** Collects projected rings through d3's path context interface. */
function ringsOf(object) {
  const rings = [];
  let ring = null;
  const context = {
    moveTo(x, y) {
      ring = [[x, y]];
      rings.push(ring);
    },
    lineTo(x, y) {
      ring?.push([x, y]);
    },
    closePath() {
      ring = null;
    },
    arc() {
      /* points are not rendered */
    },
  };
  geoPath(projection, context)(object);
  return rings;
}

const round1 = (v) => Math.round(v * 10); // integer tenths → exact arithmetic

/** Perpendicular distance from p to segment ab (in tenths). */
function segDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Douglas–Peucker on an open polyline of integer points. */
function simplifyLine(points, tolerance) {
  if (points.length <= 2 || tolerance <= 0) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let index = -1;
    let max = tolerance;
    for (let i = first + 1; i < last; i++) {
      const d = segDistance(points[i], points[first], points[last]);
      if (d > max) {
        max = d;
        index = i;
      }
    }
    if (index !== -1) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const fmt = (tenths) => {
  const s = (tenths / 10).toFixed(1).replace(/\.0$/, '');
  return s === '-0' ? '0' : s;
};
/** Joins two numbers SVG-style: "1.5-2" / "1.5,2" / "1 2". */
const pair = (a, b) => `${a}${b.startsWith('-') ? '' : ','}${b}`;

/**
 * Serialises rings → SVG path data. Tolerance is in viewBox units
 * (0 = only rounding + deduplication). Rings smaller than minArea (units²) are dropped.
 */
function toPathData(object, { tolerance = 0, minArea = 0 } = {}) {
  const parts = [];
  for (const raw of ringsOf(object)) {
    let pts = [];
    for (const [x, y] of raw) {
      const p = [round1(x), round1(y)];
      const prev = pts[pts.length - 1];
      if (!prev || prev[0] !== p[0] || prev[1] !== p[1]) pts.push(p);
    }
    if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
    if (pts.length < 3) continue;
    // Simplify the closed ring as a polyline from its first point back to it.
    pts = simplifyLine([...pts, pts[0]], tolerance * 10).slice(0, -1);
    if (pts.length < 3) continue;
    let area2 = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      area2 += a[0] * b[1] - b[0] * a[1];
    }
    if (Math.abs(area2) / 200 < minArea) continue; // tenths² → units²
    let d = `M${pair(fmt(pts[0][0]), fmt(pts[0][1]))}`;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0];
      const dy = pts[i][1] - pts[i - 1][1];
      if (dy === 0) d += `h${fmt(dx)}`;
      else if (dx === 0) d += `v${fmt(dy)}`;
      else d += `l${pair(fmt(dx), fmt(dy))}`;
    }
    parts.push(`${d}z`);
  }
  return parts.join('');
}

const roundPoint = ([x, y]) => ({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });

/** Label anchor: centroid of the largest projected polygon of a feature (inside the frame). */
function labelPoint(geo) {
  const pathGen = geoPath(projection);
  const polygons =
    geo.geometry.type === 'MultiPolygon'
      ? geo.geometry.coordinates.map((coordinates) => ({ type: 'Polygon', coordinates }))
      : [geo.geometry];
  let best = null;
  let bestArea = 0;
  for (const polygon of polygons) {
    const area = pathGen.area(polygon);
    if (area > bestArea) {
      bestArea = area;
      best = polygon;
    }
  }
  return best ? roundPoint(pathGen.centroid(best)) : null;
}

function boundsOf(geo) {
  const [[x0, y0], [x1, y1]] = geoPath(projection).bounds(geo);
  const clamp = (v, max) => Math.round(Math.max(0, Math.min(max, v)) * 10) / 10;
  return { x: clamp(x0, MAP_WIDTH), y: clamp(y0, MAP_HEIGHT), width: Math.round((clamp(x1, MAP_WIDTH) - clamp(x0, MAP_WIDTH)) * 10) / 10, height: Math.round((clamp(y1, MAP_HEIGHT) - clamp(y0, MAP_HEIGHT)) * 10) / 10 };
}

// ---------------------------------------------------------------------------
// 2b. Winding fix
// ---------------------------------------------------------------------------

/**
 * d3-geo reads polygons on the sphere: an exterior ring wound the "wrong" way
 * means "the whole globe except this shape". A few tiny islands in Natural
 * Earth 1:10m land are wound that way, and clipping then adds a full-frame
 * ring that paints the seas as land. Any polygon covering more than a
 * hemisphere is therefore rewound (rings reversed) before projecting.
 */
function rewindGeometry(geometry) {
  if (!geometry) return geometry;
  const fixPolygon = (rings) => {
    const area = geoArea({ type: 'Polygon', coordinates: rings });
    return area > 2 * Math.PI ? rings.map((ring) => [...ring].reverse()) : rings;
  };
  if (geometry.type === 'Polygon') return { ...geometry, coordinates: fixPolygon(geometry.coordinates) };
  if (geometry.type === 'MultiPolygon') return { ...geometry, coordinates: geometry.coordinates.map(fixPolygon) };
  if (geometry.type === 'GeometryCollection') return { ...geometry, geometries: geometry.geometries.map(rewindGeometry) };
  return geometry;
}

/** Rewinds a Feature or every feature of a FeatureCollection (land-10m decodes to a collection). */
const rewindFeature = (f) =>
  f.type === 'FeatureCollection'
    ? { ...f, features: f.features.map(rewindFeature) }
    : { ...f, geometry: rewindGeometry(f.geometry) };

// ---------------------------------------------------------------------------
// 3. Lakes extract (vendored; optional refresh from a full Natural Earth file)
// ---------------------------------------------------------------------------

function inFrame(geometry, margin = 0.3) {
  let hit = false;
  const walk = (c) => {
    if (hit) return;
    if (typeof c[0] === 'number') {
      if (
        c[0] >= MAP_BOUNDS.minLon - margin &&
        c[0] <= MAP_BOUNDS.maxLon + margin &&
        c[1] >= MAP_BOUNDS.minLat - margin &&
        c[1] <= MAP_BOUNDS.maxLat + margin
      ) {
        hit = true;
      }
    } else c.forEach(walk);
  };
  walk(geometry.coordinates);
  return hit;
}

if (refreshLakes) {
  const full = JSON.parse(readFileSync(path.resolve(refreshLakes), 'utf8'));
  const r4 = (c) => (typeof c[0] === 'number' ? [Math.round(c[0] * 1e4) / 1e4, Math.round(c[1] * 1e4) / 1e4] : c.map(r4));
  const extract = {
    type: 'FeatureCollection',
    _source:
      'Natural Earth 1:50m lakes (ne_50m_lakes, v5.1.2), public domain — extract for the South Caucasus map frame; ' +
      'regenerate with: node scripts/build-map.mjs --refresh-lakes=<ne_50m_lakes.geojson>',
    features: full.features
      .filter((f) => f.geometry && inFrame(f.geometry))
      .map((f) => ({
        type: 'Feature',
        properties: { name: f.properties.name, featurecla: f.properties.featurecla },
        geometry: { type: f.geometry.type, coordinates: r4(f.geometry.coordinates) },
      })),
  };
  writeFileSync(LAKES_FILE, JSON.stringify(extract));
  console.log(`lakes extract: ${extract.features.map((f) => f.properties.name).join(', ')} → ${path.relative(ROOT, LAKES_FILE)}`);
}

// ---------------------------------------------------------------------------
// 4. Build
// ---------------------------------------------------------------------------

const worldAtlasVersion = require('world-atlas/package.json').version;
const countriesTopo = require(`world-atlas/countries-${RESOLUTION}.json`);
const landTopo = require(`world-atlas/land-${RESOLUTION}.json`);

/** ISO 3166-1 numeric (world-atlas ids) → our codes. */
const FOCUS = { '268': 'GE', '051': 'AM', '031': 'AZ' };
const NEIGHBOURS = { '643': 'RU', '792': 'TR', '364': 'IR' };
const NAMES = {
  GE: { en: 'Georgia', ka: 'საქართველო', pl: 'Gruzja', it: 'Georgia', de: 'Georgien' },
  AM: { en: 'Armenia', ka: 'სომხეთი', pl: 'Armenia', it: 'Armenia', de: 'Armenien' },
  AZ: { en: 'Azerbaijan', ka: 'აზერბაიჯანი', pl: 'Azerbejdżan', it: 'Azerbaigian', de: 'Aserbaidschan' },
  RU: { en: 'Russia', ka: 'რუსეთი', pl: 'Rosja', it: 'Russia', de: 'Russland' },
  TR: { en: 'Turkey', ka: 'თურქეთი', pl: 'Turcja', it: 'Turchia', de: 'Türkei' },
  IR: { en: 'Iran', ka: 'ირანი', pl: 'Iran', it: 'Iran', de: 'Iran' },
  blackSea: { en: 'Black Sea', ka: 'შავი ზღვა', pl: 'Morze Czarne', it: 'Mar Nero', de: 'Schwarzes Meer' },
  caspianSea: { en: 'Caspian Sea', ka: 'კასპიის ზღვა', pl: 'Morze Kaspijskie', it: 'Mar Caspio', de: 'Kaspisches Meer' },
  'Lake Sevan': { en: 'Lake Sevan', ka: 'სევანის ტბა', pl: 'Jezioro Sewan', it: 'Lago Sevan', de: 'Sewansee' },
  'Lake Van': { en: 'Lake Van', ka: 'ვანის ტბა', pl: 'Jezioro Wan', it: 'Lago di Van', de: 'Vansee' },
  'Lake Urmia': { en: 'Lake Urmia', ka: 'ურმიის ტბა', pl: 'Jezioro Urmia', it: 'Lago di Urmia', de: 'Urmiasee' },
};

const countries = feature(countriesTopo, countriesTopo.objects.countries).features.map(rewindFeature);
const byId = new Map(countries.map((f) => [f.id, f]));

const focus = {};
for (const [id, code] of Object.entries(FOCUS)) {
  const f = byId.get(id);
  if (!f) throw new Error(`world-atlas: country ${id} (${code}) not found`);
  focus[code] = {
    name: NAMES[code],
    d: toPathData(f, { tolerance: FOCUS_TOLERANCE, minArea: 0 }),
    label: labelPoint(f),
    bounds: boundsOf(f),
  };
}

const neighbours = {};
for (const [id, code] of Object.entries(NEIGHBOURS)) {
  const f = byId.get(id);
  if (!f) throw new Error(`world-atlas: country ${id} (${code}) not found`);
  neighbours[code] = {
    name: NAMES[code],
    d: toPathData(f, { tolerance: 0.15, minArea: 0.5 }),
    label: labelPoint(f),
  };
}

// Any other country touching the frame would be listed here (none expected).
const others = countries
  .filter((f) => !FOCUS[f.id] && !NEIGHBOURS[f.id] && f.geometry && inFrame(f.geometry, 0))
  .map((f) => f.properties.name);
if (others.length) console.warn(`note: other countries inside the frame (not drawn): ${others.join(', ')}`);

const landFeature = rewindFeature(feature(landTopo, landTopo.objects.land));
const land = toPathData(landFeature, { tolerance: 0.15, minArea: 0.5 });
// Sea = padded frame minus land (render with fill-rule="evenodd").
const frame = `M${-PAD},${-PAD}H${MAP_WIDTH + PAD}V${Math.round((MAP_HEIGHT + PAD) * 10) / 10}H${-PAD}z`;
const sea = frame + land;

const lakesSource = JSON.parse(readFileSync(LAKES_FILE, 'utf8'));
const lakes = lakesSource.features
  .filter((f) => inFrame(f.geometry, 0))
  .map(rewindFeature)
  .map((f) => {
    const d = toPathData(f, { tolerance: 0.1, minArea: 0.3 });
    return d ? { name: NAMES[f.properties.name] ?? { en: f.properties.name }, d, label: labelPoint(f) } : null;
  })
  .filter(Boolean)
  .sort((a, b) => a.name.en.localeCompare(b.name.en));

const proj = ([lon, lat]) => roundPoint(projection([lon, lat]));
const seaLabels = [
  { id: 'blackSea', name: NAMES.blackSea, ...proj([40.55, 42.35]) },
  { id: 'caspianSea', name: NAMES.caspianSea, ...proj([50.05, 39.55]) },
];

// Not used for drawing: Nakhchivan is part of Azerbaijan (an exclave) and is included in AZ's path.
const output = {
  meta: {
    description:
      'South Caucasus base map for the Local Host website. SVG path data in the viewBox below; plot places with project() from src/lib/ai/places.ts (same projection).',
    source: `Natural Earth 1:${RESOLUTION} (public domain) via world-atlas@${worldAtlasVersion} (countries, land) and ne_50m_lakes v5.1.2 (lakes).`,
    license: 'Public domain (Natural Earth). No attribution required; "Made with Natural Earth" is appreciated.',
    generatedBy: 'node scripts/build-map.mjs — do not edit by hand',
    projection:
      'Equidistant cylindrical, standard parallel 41.05°N: x = (lon − 39.8)·cos(41.05°)·S, y = (43.8 − lat)·S, S = 1000 / (10.8·cos 41.05°). Identical to places.ts project().',
    bounds: MAP_BOUNDS,
    notes:
      'countries = Georgia, Armenia, Azerbaijan (Natural Earth default admin-0 boundaries; Azerbaijan includes the Nakhchivan exclave). ' +
      'neighbours = parts of Russia, Turkey and Iran inside the frame (clipped ~12 units outside it, so clip edges stay invisible). ' +
      'land = all land in the frame (coastlines of the Black Sea and the Caspian); sea = frame minus land, render with fill-rule="evenodd". ' +
      'Paths use relative commands rounded to 0.1 unit.',
  },
  viewBox: MAP_VIEWBOX,
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  countries: focus,
  neighbours,
  land,
  sea,
  seaFillRule: 'evenodd',
  lakes,
  labels: { seas: seaLabels },
};

const json = `${JSON.stringify(output)}\n`;
const bytes = Buffer.byteLength(json);
const summary = [
  `projection check: 51 places, max |d3 − project()| = ${worst.toFixed(3)} units`,
  `countries: ${Object.entries(focus).map(([c, v]) => `${c} ${(v.d.length / 1024).toFixed(1)}KB`).join(', ')}`,
  `neighbours: ${Object.entries(neighbours).map(([c, v]) => `${c} ${(v.d.length / 1024).toFixed(1)}KB`).join(', ')}`,
  `land ${(land.length / 1024).toFixed(1)}KB, lakes: ${lakes.map((l) => l.name.en).join(', ')}`,
  `total ${(bytes / 1024).toFixed(1)} KB (limit ${MAX_BYTES / 1024} KB)`,
];
console.log(summary.join('\n'));
if (bytes > MAX_BYTES) {
  console.error('caucasus-map.json is over the size budget — raise the simplification tolerance.');
  process.exit(1);
}
if (!CHECK_ONLY) {
  writeFileSync(OUT_FILE, json);
  console.log(`wrote ${path.relative(ROOT, OUT_FILE)}`);
}
