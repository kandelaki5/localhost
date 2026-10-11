/**
 * Route / pin maps on the shared South Caucasus base map (#lab-map symbol,
 * see MapSprite.astro). Pure geometry is shared with the server (RouteMap.astro);
 * buildMap() runs in the browser.
 *
 * Layout: a box with the exact aspect ratio of the fitted viewBox, holding
 *   - an <svg> with <use href="#lab-map"> and the route polyline, and
 *   - an <ol> of stops positioned in % over it (HTML, so pins and labels stay
 *     crisp and use the type tokens at any size).
 * Place names are set with textContent only. Coordinates come from places.ts
 * (PlaceInfo.x/y), never from model text.
 */
export const MAP_W = 1000;
export const MAP_H = 675.3;

export interface MapStop {
  x: number;
  y: number;
  name: string;
}

export type ViewBox = [number, number, number, number];

/** A viewBox around `points` with the given aspect ratio, padding and minimum width (map units). */
export function fitViewBox(points: readonly { x: number; y: number }[], aspect = 1.6, pad = 60, minW = 260): ViewBox {
  if (!points.length) return [0, 0, MAP_W, MAP_H];
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  let w = Math.max(maxX - minX + pad * 2, minW);
  let h = Math.max(maxY - minY + pad * 2, minW / aspect);
  if (w / h > aspect) h = w / aspect;
  else w = h * aspect;
  if (w > MAP_W) {
    w = MAP_W;
    h = w / aspect;
  }
  if (h > MAP_H + 40) {
    h = MAP_H + 40;
    w = Math.min(MAP_W + 40, h * aspect);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const x = Math.min(Math.max(cx - w / 2, -20), MAP_W + 20 - w);
  const y = Math.min(Math.max(cy - h / 2, -20), MAP_H + 20 - h);
  const r = (n: number) => Math.round(n * 10) / 10;
  return [r(x), r(y), r(w), r(h)];
}

export interface PlacedStop extends MapStop {
  /** Position in % of the box. */
  left: number;
  top: number;
  /** Show the name next to the pin (false when it would collide with an earlier label). */
  labelled: boolean;
  /** Put the label on the left of the pin (near the right edge). */
  flip: boolean;
}

/** Positions stops in % of the viewBox and hides labels that would overlap earlier ones. */
export function placeStops(stops: readonly MapStop[], vb: ViewBox): PlacedStop[] {
  const [vx, vy, vw, vh] = vb;
  const placed: PlacedStop[] = [];
  // A label runs about LABEL % of the width to the right of its pin (to the left when flipped).
  const LABEL = 24;
  const span = (left: number, flip: boolean): [number, number] => (flip ? [left - LABEL, left + 2] : [left - 2, left + LABEL]);
  for (const s of stops) {
    const left = ((s.x - vx) / vw) * 100;
    const top = ((s.y - vy) / vh) * 100;
    const flip = left > 68;
    const [a, b] = span(left, flip);
    const clash = placed.some((p) => {
      if (!p.labelled || Math.abs(p.top - top) >= 7) return false;
      const [c, d] = span(p.left, p.flip);
      return a < d && c < b;
    });
    placed.push({ ...s, left: round2(left), top: round2(top), labelled: !clash, flip });
  }
  return placed;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Unique stops in order (a route may pass the same place twice; the pin is drawn once). */
export function uniqueStops<T extends { x: number; y: number; name: string }>(stops: readonly T[]): T[] {
  const seen = new Set<string>();
  return stops.filter((s) => {
    const key = `${s.x},${s.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export interface BuildMapOptions {
  /** Accessible name of the map (the stops list is read out too). */
  label: string;
  aspect?: number;
  pad?: number;
  minW?: number;
  /** Number the pins (route order). */
  numbered?: boolean;
  /** Draw a line through the stops in order. */
  route?: boolean;
  className?: string;
}

/**
 * Builds a map box in the browser. `route` stops keep their order (repeats
 * allowed for the line); pins are drawn once per place.
 */
export function buildMap(route: readonly MapStop[], options: BuildMapOptions): HTMLElement {
  const stops = uniqueStops(route);
  const vb = fitViewBox(stops, options.aspect ?? 1.6, options.pad ?? 60, options.minW ?? 260);
  const box = document.createElement('figure');
  box.className = `lab-map${options.className ? ` ${options.className}` : ''}`;
  box.style.aspectRatio = `${vb[2]} / ${vb[3]}`;
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', options.label);

  const canvas = svg('svg', { viewBox: vb.join(' '), class: 'lab-map__svg', 'aria-hidden': 'true', focusable: 'false' });
  canvas.append(svg('use', { href: '#lab-map', width: String(MAP_W), height: String(MAP_H) }));
  if (options.route !== false && route.length > 1) {
    const pts = route.map((s) => `${s.x},${s.y}`).join(' ');
    canvas.append(
      svg('polyline', { points: pts, class: 'lab-map__glow', 'vector-effect': 'non-scaling-stroke' }),
      svg('polyline', { points: pts, class: 'lab-map__route', 'vector-effect': 'non-scaling-stroke' }),
    );
  }
  box.append(canvas);

  const list = document.createElement('ol');
  list.className = 'lab-map__stops';
  placeStops(stops, vb).forEach((s, i) => {
    const li = document.createElement('li');
    li.className = `lab-map__stop${s.labelled ? '' : ' lab-map__stop--quiet'}${s.flip ? ' lab-map__stop--flip' : ''}${
      i === 0 ? ' lab-map__stop--first' : ''
    }`;
    li.style.left = `${s.left}%`;
    li.style.top = `${s.top}%`;
    const pin = document.createElement('span');
    pin.className = 'lab-map__pin';
    pin.setAttribute('aria-hidden', 'true');
    if (options.numbered) pin.textContent = String(i + 1);
    const name = document.createElement('span');
    name.className = 'lab-map__name';
    name.textContent = s.name;
    li.append(pin, name);
    list.append(li);
  });
  box.append(list);
  return box;
}

/**
 * Starts the route-draw animation of an armed map (`.lab-map--armed`, see
 * lab.css). The route has `vector-effect: non-scaling-stroke`, so browsers
 * dash it in screen pixels: `pathLength="1"` would make the dash shorter than
 * the line whenever the map is zoomed in (the route stopped half-way). The
 * dash length is therefore measured in screen pixels here, and removed when
 * the animation ends so a later resize or print shows the whole line.
 */
export function drawRoute(map: HTMLElement): void {
  const canvas = map.querySelector<SVGSVGElement>('.lab-map__svg');
  const scale = Math.abs(canvas?.getScreenCTM()?.a ?? 1) || 1;
  const lines = [...map.querySelectorAll<SVGPolylineElement>('.lab-map__route, .lab-map__glow')];
  for (const line of lines) {
    line.removeAttribute('pathLength');
    line.style.setProperty('--len', String(Math.ceil(line.getTotalLength() * scale) + 8));
  }
  lines[0]?.addEventListener(
    'animationend',
    () => lines.forEach((line) => (line.style.strokeDasharray = 'none')),
    { once: true },
  );
  map.classList.add('is-drawing');
}
