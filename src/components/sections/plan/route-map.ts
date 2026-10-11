/**
 * Draws the planner's route on the night map (NightMap.astro) at runtime.
 *
 *  - draw(route) is called for every provisional route while the plan
 *    streams and once with the final route: it keeps the longest common
 *    prefix of stops already drawn and animates only what is new, one gently
 *    curved, glowing segment at a time, each stop popping in with its number.
 *  - finish() zooms the map to the route (an animated viewBox) and lays out
 *    the stop labels so they don't collide.
 *  - With prefers-reduced-motion everything is drawn and zoomed instantly.
 *
 * Coordinates come only from PlaceInfo.x/y of validated place ids; names go
 * into SVG <text> with textContent (docs/AI-ARCHITECTURE.md, rendering rules).
 * Sizes are "CSS px × --u" (viewBox units per CSS px), updated on resize and
 * on every zoom frame, so markers and labels keep their size while zooming.
 */
import type { PlaceInfo, PlanRoute } from '../../../lib/ai/client/plan';
import { MAP_HEIGHT, MAP_WIDTH } from '../../../lib/ai/places';
import type { CountryCode } from '../../../lib/ai/types';

const NS = 'http://www.w3.org/2000/svg';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Stop {
  id: string;
  n: number;
  x: number;
  y: number;
  el: SVGGElement;
  name: SVGTextElement;
}

const FULL: Box = { x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT };
const RATIO = MAP_HEIGHT / MAP_WIDTH;
const EASE_DRAW = 'cubic-bezier(0.2, 0.7, 0.2, 1)';

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class RouteMap {
  private readonly svg: SVGSVGElement;
  private readonly layer: SVGGElement;
  private readonly segLayer: SVGGElement;
  private readonly stopLayer: SVGGElement;
  private readonly reduced: () => boolean;
  private vb: Box = { ...FULL };
  private drawn: PlaceInfo[] = [];
  /** segments[i] = the line into drawn[i] (null for the first stop or a zero-length hop). */
  private segments: (SVGPathElement | null)[] = [];
  /** How many of `drawn` are fully on the map (segment + stop); the rest are queued. */
  private rendered = 0;
  private stops = new Map<string, Stop>();
  private queue: Promise<void> = Promise.resolve();
  private generation = 0;
  private zoomFrame = 0;

  constructor(svg: SVGSVGElement, reduced: () => boolean) {
    this.svg = svg;
    this.reduced = reduced;
    const layer = svg.querySelector<SVGGElement>('[data-route]');
    if (!layer) throw new Error('[plan] map route layer missing');
    this.layer = layer;
    this.segLayer = document.createElementNS(NS, 'g');
    this.segLayer.setAttribute('class', 'rsegs');
    this.stopLayer = document.createElementNS(NS, 'g');
    this.stopLayer.setAttribute('class', 'rstops');
    this.layer.replaceChildren(this.segLayer, this.stopLayer);
    this.updateUnit();
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => {
        this.updateUnit();
        this.layoutLabels();
      }).observe(svg);
    }
  }

  /** Highlights the countries chosen on the stamps (idle state). */
  setCountries(codes: readonly CountryCode[]): void {
    const on = new Set<string>(codes);
    this.svg.querySelectorAll<SVGElement>('[data-country], [data-country-label]').forEach((el) => {
      const code = el.dataset.country ?? el.dataset.countryLabel ?? '';
      el.classList.toggle('is-on', on.has(code));
    });
  }

  /** Clears the route and zooms back out. */
  reset(): void {
    this.generation++;
    this.queue = Promise.resolve();
    this.drawn = [];
    this.segments = [];
    this.rendered = 0;
    this.stops.clear();
    this.segLayer.replaceChildren();
    this.stopLayer.replaceChildren();
    this.zoomTo({ ...FULL }, this.reduced() ? 0 : 900);
  }

  get stopCount(): number {
    return this.stops.size;
  }

  /** Incremental draw: keeps the common prefix, animates the rest. */
  draw(route: PlanRoute): void {
    const next = route.places;
    let prefix = 0;
    while (prefix < this.drawn.length && prefix < next.length && this.drawn[prefix]?.id === next[prefix]?.id) prefix++;

    if (prefix < this.drawn.length) {
      // The route changed behind the drawn part: cut it back. Queued work of
      // the old generation is dropped, so stops of the kept prefix that were
      // still waiting in the queue are cut too and re-queued below.
      this.generation++;
      this.queue = Promise.resolve();
      const keepCount = Math.min(prefix, this.rendered);
      this.segments.splice(keepCount).forEach((s) => s?.remove());
      this.drawn = this.drawn.slice(0, keepCount);
      this.rendered = keepCount;
      const keep = new Set<string>(this.drawn.map((p) => p.id));
      for (const [id, stop] of this.stops) {
        if (!keep.has(id)) {
          stop.el.remove();
          this.stops.delete(id);
        }
      }
      this.renumber();
      prefix = keepCount;
    }

    const added = next.slice(prefix);
    if (!added.length) return;
    const generation = this.generation;
    const per = Math.max(260, Math.min(620, 2200 / added.length));
    for (const place of added) {
      const from = this.drawn[this.drawn.length - 1];
      const slot = this.segments.length;
      this.drawn.push(place);
      this.segments.push(null);
      this.queue = this.queue.then(async () => {
        if (generation !== this.generation) return;
        if (from && (from.x !== place.x || from.y !== place.y)) await this.addSegment(from, place, per, slot);
        if (generation !== this.generation) return;
        this.addStop(place);
        this.rendered = slot + 1;
      });
    }
  }

  /** After the final route: wait for the drawing, then zoom to fit and place labels. */
  async finish(): Promise<void> {
    const generation = this.generation;
    await this.queue;
    if (generation !== this.generation || !this.drawn.length) return;
    await this.zoomTo(this.routeBox(), this.reduced() ? 0 : 1300);
  }

  /** Emphasises the stops of one itinerary day (null = none). */
  highlight(ids: readonly string[] | null): void {
    const hot = new Set(ids ?? []);
    for (const stop of this.stops.values()) {
      stop.el.classList.toggle('is-hot', hot.has(stop.id));
      stop.el.classList.toggle('is-dim', hot.size > 0 && !hot.has(stop.id));
    }
  }

  /** Stop numbers by place id (first visit), for the itinerary's day chips. */
  numbers(): Map<string, number> {
    return new Map([...this.stops.values()].map((s) => [s.id, s.n]));
  }

  // ------------------------------------------------------------------ drawing

  private addSegment(a: PlaceInfo, b: PlaceInfo, duration: number, slot: number): Promise<void> {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const bend = Math.min(len * 0.14, 34);
    const cx = (a.x + b.x) / 2 - (dy / len) * bend;
    const cy = (a.y + b.y) / 2 + (dx / len) * bend;
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('class', 'rseg');
    path.setAttribute('d', `M${a.x} ${a.y}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x} ${b.y}`);
    path.setAttribute('pathLength', '1');
    this.segLayer.append(path);
    this.segments[slot] = path;
    if (this.reduced() || typeof path.animate !== 'function') return Promise.resolve();
    const animation = path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
      duration,
      easing: EASE_DRAW,
      fill: 'backwards',
    });
    return animation.finished.then(
      () => undefined,
      () => undefined,
    );
  }

  private addStop(place: PlaceInfo): void {
    if (this.stops.has(place.id)) return;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'rstop');
    g.dataset.id = place.id;
    g.style.setProperty('transform', `translate(${place.x}px, ${place.y}px) scale(var(--u, 1.6))`);

    const halo = document.createElementNS(NS, 'circle');
    halo.setAttribute('class', 'rstop__halo');
    halo.setAttribute('r', '15');
    const ring = document.createElementNS(NS, 'circle');
    ring.setAttribute('class', 'rstop__ring');
    ring.setAttribute('r', '9');
    const no = document.createElementNS(NS, 'text');
    no.setAttribute('class', 'rstop__no');
    const name = document.createElementNS(NS, 'text');
    name.setAttribute('class', 'rstop__name');
    name.textContent = place.name;
    g.append(halo, ring, no, name);
    this.stopLayer.append(g);

    const stop: Stop = { id: place.id, n: this.stops.size + 1, x: place.x, y: place.y, el: g, name };
    no.textContent = String(stop.n);
    this.stops.set(place.id, stop);

    if (!this.reduced() && typeof ring.animate === 'function') {
      for (const el of [ring, no]) {
        el.animate(
          [
            { opacity: 0, transform: 'scale(0.2)' },
            { opacity: 1, transform: 'scale(1.18)', offset: 0.7 },
            { opacity: 1, transform: 'scale(1)' },
          ],
          { duration: 420, easing: 'ease-out' },
        );
      }
      name.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 120, fill: 'backwards' });
    }
    this.layoutLabels();
  }

  private renumber(): void {
    let n = 0;
    for (const stop of this.stops.values()) {
      stop.n = ++n;
      const label = stop.el.querySelector('.rstop__no');
      if (label) label.textContent = String(n);
    }
  }

  // ------------------------------------------------------------------ zoom

  private routeBox(): Box {
    const xs = this.drawn.map((p) => p.x);
    const ys = this.drawn.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const span = Math.max(maxX - minX, (maxY - minY) / RATIO);
    // Room for the labels (they extend to the right of each stop).
    let w = Math.max(span * 1.35 + 150, 300);
    let h = w * RATIO;
    if (maxY - minY + 110 > h) {
      h = maxY - minY + 110;
      w = h / RATIO;
    }
    w = Math.min(w, FULL.w);
    h = Math.min(h, FULL.h);
    const cx = (minX + maxX) / 2 + 22;
    const cy = (minY + maxY) / 2;
    const x = Math.min(Math.max(0, cx - w / 2), FULL.w - w);
    const y = Math.min(Math.max(0, cy - h / 2), FULL.h - h);
    return { x, y, w, h };
  }

  private zoomTo(target: Box, duration: number): Promise<void> {
    cancelAnimationFrame(this.zoomFrame);
    const from = { ...this.vb };
    if (duration <= 0) {
      this.setViewBox(target);
      this.layoutLabels();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const e = easeInOut(t);
        this.setViewBox({
          x: from.x + (target.x - from.x) * e,
          y: from.y + (target.y - from.y) * e,
          w: from.w + (target.w - from.w) * e,
          h: from.h + (target.h - from.h) * e,
        });
        if (t < 1) this.zoomFrame = requestAnimationFrame(step);
        else {
          this.layoutLabels();
          resolve();
        }
      };
      this.zoomFrame = requestAnimationFrame(step);
    });
  }

  private setViewBox(box: Box): void {
    this.vb = box;
    this.svg.setAttribute('viewBox', `${box.x.toFixed(2)} ${box.y.toFixed(2)} ${box.w.toFixed(2)} ${box.h.toFixed(2)}`);
    this.updateUnit();
  }

  private updateUnit(): void {
    const px = this.svg.getBoundingClientRect().width;
    if (px > 0) this.svg.style.setProperty('--u', (this.vb.w / px).toFixed(4));
  }

  // ------------------------------------------------------------------ labels

  /** Greedy label placement in screen pixels: right, left, above, below — else hidden. */
  private layoutLabels(): void {
    const rect = this.svg.getBoundingClientRect();
    if (!rect.width || !this.stops.size) return;
    const k = rect.width / this.vb.w;
    const frame: Box = { x: 2, y: 2, w: rect.width - 4, h: rect.height - 4 };
    const stops = [...this.stops.values()].map((s) => ({ s, sx: (s.x - this.vb.x) * k, sy: (s.y - this.vb.y) * k }));
    const taken: Box[] = stops.map(({ sx, sy }) => ({ x: sx - 10, y: sy - 10, w: 20, h: 20 }));
    for (const { s, sx, sy } of stops) {
      let width = 0;
      try {
        width = s.name.getComputedTextLength();
      } catch {
        width = (s.name.textContent ?? '').length * 6.5;
      }
      const h = 14;
      const options = [
        { x: 13, y: 4, anchor: 'start', box: { x: sx + 13, y: sy - 9, w: width, h } },
        { x: -13, y: 4, anchor: 'end', box: { x: sx - 13 - width, y: sy - 9, w: width, h } },
        { x: 0, y: -14, anchor: 'middle', box: { x: sx - width / 2, y: sy - 26, w: width, h } },
        { x: 0, y: 23, anchor: 'middle', box: { x: sx - width / 2, y: sy + 12, w: width, h } },
      ];
      const inside = (b: Box) => b.x >= frame.x && b.y >= frame.y && b.x + b.w <= frame.x + frame.w && b.y + b.h <= frame.y + frame.h;
      const fit = options.find((o) => inside(o.box) && !taken.some((t) => overlaps(o.box, t)));
      if (fit) {
        s.name.setAttribute('x', String(fit.x));
        s.name.setAttribute('y', String(fit.y));
        s.name.setAttribute('text-anchor', fit.anchor);
        s.name.removeAttribute('data-hidden');
        taken.push(fit.box);
      } else {
        s.name.setAttribute('x', '13');
        s.name.setAttribute('y', '4');
        s.name.setAttribute('text-anchor', 'start');
        s.name.setAttribute('data-hidden', '');
      }
    }
  }
}
