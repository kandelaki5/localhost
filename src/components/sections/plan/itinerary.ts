/**
 * Typesets the streamed itinerary Markdown as DOM nodes — never innerHTML.
 * Model output is untrusted text: every string goes in through textContent /
 * createTextNode, only a fixed set of elements is created (p, h4, ul, li,
 * strong, em, code), and links keep their text but never their URL
 * (docs/AI-ARCHITECTURE.md, "Rendering rules for the UI").
 *
 * The format (see lib/ai/client/plan-format.ts): an intro, "## Day N — Title"
 * blocks with bullets and an "Overnight: …" line, "### Why this route" with
 * bullets, and a closing line. In demo mode the first paragraph is an italic
 * note. While streaming, update() is called with the whole text so far; a
 * keyed reconciler patches only the blocks that changed, so finished days
 * stay put (and keep their entrance animation) while the last one grows.
 */
import { PLAN_LABELS, findPlaceMentions } from '../../../lib/ai/client/plan';
import type { Locale } from '../../../lib/ai/types';
import { georgianNumeral } from '../../../lib/sections';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

type DayItem = { kind: 'li' | 'p' | 'overnight'; text: string; label?: string };

interface DayBlock {
  kind: 'day';
  number: number;
  label: string;
  title: string;
  items: DayItem[];
}

interface SectionBlock {
  kind: 'section';
  title: string;
  items: string[];
}

type Block = { kind: 'note' | 'intro' | 'closing'; text: string } | { kind: 'list'; items: string[] } | DayBlock | SectionBlock;

const LOCALES = Object.keys(PLAN_LABELS) as Locale[];
const DAY_LABELS = LOCALES.map((l) => PLAN_LABELS[l].day.toLowerCase());
const OVERNIGHT_WORDS = [...new Set(LOCALES.map((l) => PLAN_LABELS[l].overnight))];
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const HEADING_RE = /^(#{1,6})\s+(.*?)\s*#*$/;
const DAY_RE = /^[*_]{0,2}\s*([^\d\n]{0,30}?)\s*(\d{1,2})(?!\d)\s*(?:[—–:.\-|]\s*)?(.*?)[*_]{0,2}$/u;
const BULLET_RE = /^(?:[-*•+]|\d{1,2}[.)])\s+(.*)$/;
const OVERNIGHT_RE = new RegExp(
  `^[*_]{0,2}(${OVERNIGHT_WORDS.map(escapeRe).join('|')})[*_]{0,2}\\s*:\\s*[*_]{0,2}\\s*(.*?)\\s*[*_]{0,2}$`,
  'iu',
);

/** Strips the simplest wrapping emphasis from a title. */
const bare = (s: string) => s.replace(/^[*_]{1,2}(.*?)[*_]{1,2}$/, '$1').trim();

function parse(markdown: string): Block[] {
  const blocks: Block[] = [];
  let day: DayBlock | null = null;
  let section: SectionBlock | null = null;
  let blank = true;
  let seenDay = false;

  for (const raw of markdown.split('\n')) {
    const line = raw.trim();
    if (!line) {
      blank = true;
      continue;
    }
    const heading = HEADING_RE.exec(line);
    if (heading) {
      const level = heading[1]?.length ?? 2;
      const text = heading[2] ?? '';
      const dm = level <= 3 ? DAY_RE.exec(text) : null;
      const label = (dm?.[1] ?? '').trim();
      const knownLabel = DAY_LABELS.includes(label.toLowerCase());
      if (dm && (knownLabel || (level === 2 && label.length <= 12))) {
        day = { kind: 'day', number: Number(dm[2]), label, title: bare(dm[3] ?? ''), items: [] };
        blocks.push(day);
        section = null;
        seenDay = true;
      } else {
        section = { kind: 'section', title: bare(text), items: [] };
        blocks.push(section);
        day = null;
      }
      blank = false;
      continue;
    }

    const bullet = BULLET_RE.exec(line);
    if (day) {
      const overnight = OVERNIGHT_RE.exec(line);
      const last = day.items[day.items.length - 1];
      if (overnight) {
        // The departure day has "Overnight: —": nothing to show.
        const where = (overnight[2] ?? '').trim();
        if (where && !/^[—–-]+$/.test(where)) day.items.push({ kind: 'overnight', label: overnight[1] ?? '', text: where });
      }
      else if (bullet) day.items.push({ kind: 'li', text: bullet[1] ?? '' });
      else if (last && !blank && last.kind !== 'overnight') last.text += ` ${line}`;
      else day.items.push({ kind: 'p', text: line });
    } else if (section) {
      if (bullet) section.items.push(bullet[1] ?? '');
      else if (section.items.length && !blank) section.items[section.items.length - 1] += ` ${line}`;
      else if (section.items.length) {
        section = null;
        blocks.push({ kind: 'closing', text: line });
      } else section.items.push(line);
    } else {
      const last = blocks[blocks.length - 1];
      if (bullet) {
        if (last?.kind === 'list') last.items.push(bullet[1] ?? '');
        else blocks.push({ kind: 'list', items: [bullet[1] ?? ''] });
      } else if (last && (last.kind === 'intro' || last.kind === 'closing' || last.kind === 'note') && !blank) {
        last.text += ` ${line}`;
      } else if (!blocks.length && /^\*(?!\*)|^_(?!_)/.test(line)) {
        blocks.push({ kind: 'note', text: line });
      } else {
        blocks.push({ kind: seenDay ? 'closing' : 'intro', text: line });
      }
    }
    blank = false;
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Inline Markdown → nodes (bold, italic, code; links keep their text only)
// ---------------------------------------------------------------------------

const INLINE_RE = /\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|\[([^\]]+)\]\([^)]*\)|(?<![\p{L}\p{N}*])\*(?![\s*])(.+?)(?<![\s*])\*(?![\p{L}\p{N}*])|(?<![\p{L}\p{N}_])_(?![\s_])(.+?)(?<![\s_])_(?![\p{L}\p{N}_])/gu;

/** Hides a half-streamed marker ("**Morn") instead of flashing asterisks. */
function tidy(text: string, streaming: boolean): string {
  if (!streaming) return text;
  let out = text;
  if ((out.match(/\*\*/g) ?? []).length % 2) out = out.replace(/\*\*(?!.*\*\*)/, '');
  if ((out.replace(/\*\*/g, '').match(/\*/g) ?? []).length % 2) out = out.replace(/\*(?!.*\*)/, '');
  return out;
}

function inlineNodes(text: string): Node[] {
  const nodes: Node[] = [];
  let at = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const index = m.index ?? 0;
    if (index > at) nodes.push(document.createTextNode(text.slice(at, index)));
    let el: HTMLElement;
    if (m[1] !== undefined || m[2] !== undefined) {
      el = document.createElement('strong');
      el.textContent = m[1] ?? m[2] ?? '';
    } else if (m[3] !== undefined) {
      el = document.createElement('code');
      el.textContent = m[3];
    } else if (m[4] !== undefined) {
      el = document.createElement('span');
      el.textContent = m[4];
    } else {
      el = document.createElement('em');
      el.textContent = m[5] ?? m[6] ?? '';
    }
    nodes.push(el);
    at = index + m[0].length;
  }
  if (at < text.length) nodes.push(document.createTextNode(text.slice(at)));
  return nodes;
}

const plainInline = (text: string) => inlineNodes(text).map((n) => n.textContent ?? '').join('');

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';

interface Rendered {
  sig: string;
  kind: Block['kind'];
  el: HTMLElement;
  number?: number;
}

export interface ItineraryOptions {
  /** Page language (the note is always in it). */
  locale: Locale;
}

export class ItineraryView {
  private readonly root: HTMLElement;
  private readonly locale: Locale;
  private rendered: Rendered[] = [];
  private blocks: Block[] = [];
  private caret: Element | null = null;
  /** Language the plan is written in (from its "Day" label), may differ from the page in demo mode. */
  planLang: Locale;

  constructor(root: HTMLElement, options: ItineraryOptions) {
    this.root = root;
    this.locale = options.locale;
    this.planLang = options.locale;
  }

  clear(): void {
    this.rendered = [];
    this.blocks = [];
    this.caret = null;
    this.planLang = this.locale;
    this.root.replaceChildren();
    this.root.removeAttribute('lang');
  }

  /** Number of day headings so far. */
  get dayCount(): number {
    return this.blocks.filter((b) => b.kind === 'day').length;
  }

  get isEmpty(): boolean {
    return this.blocks.length === 0;
  }

  update(markdown: string, streaming: boolean): void {
    let text = markdown;
    if (streaming) {
      // Hold back a short, half-received line ("Overni…") so it never flashes as part of a bullet.
      const cut = text.lastIndexOf('\n');
      const tail = text.slice(cut + 1);
      if (cut !== -1 && tail.length < 16 && !/^\s*(?:[-*•+#]|\d)/.test(tail)) text = text.slice(0, cut);
    }
    const blocks = parse(text);
    this.blocks = blocks;
    this.detectLanguage(blocks);

    blocks.forEach((block, i) => {
      const sig = JSON.stringify(block) + (streaming && i === blocks.length - 1 ? '~' : '');
      const current = this.rendered[i];
      if (current?.sig === sig) return;
      const sameShape =
        current && current.kind === block.kind && (block.kind !== 'day' || current.number === block.number);
      if (current && sameShape) {
        this.patch(current.el, block, streaming && i === blocks.length - 1);
        current.sig = sig;
        return;
      }
      const el = this.create(block, streaming && i === blocks.length - 1);
      if (streaming) el.classList.add('is-new');
      const entry: Rendered = { sig, kind: block.kind, el, ...(block.kind === 'day' ? { number: block.number } : {}) };
      if (current) {
        current.el.replaceWith(el);
        this.rendered[i] = entry;
      } else {
        this.root.append(el);
        this.rendered.push(entry);
      }
    });
    this.rendered.splice(blocks.length).forEach((r) => r.el.remove());
    this.setCaret(streaming);
  }

  /** Marks each day with the places it mentions and the map numbers of its stops. */
  annotate(numbers: Map<string, number>): void {
    this.rendered.forEach((r, i) => {
      const block = this.blocks[i];
      if (block?.kind !== 'day') return;
      const text = [block.title, ...block.items.map((it) => it.text)].join(' \n ');
      const ids = [...new Set(findPlaceMentions(plainInline(text)))];
      r.el.dataset.places = ids.join(' ');
      const chips = r.el.querySelector<HTMLElement>('.it-day__stops');
      if (!chips) return;
      const ns = [...new Set(ids.map((id) => numbers.get(id)).filter((n): n is number => n !== undefined))].sort((a, b) => a - b);
      chips.replaceChildren(
        ...ns.map((n) => {
          const chip = document.createElement('span');
          chip.className = 'it-day__stop';
          chip.textContent = String(n);
          return chip;
        }),
      );
    });
  }

  /** Plain-text version of the plan (for "Copy plan"), in the plan's own language. */
  plainText(): string {
    const labels = PLAN_LABELS[this.planLang];
    const out: string[] = [];
    for (const block of this.blocks) {
      switch (block.kind) {
        case 'note':
          out.push(plainInline(block.text.replace(/^[*_]|[*_]$/g, '')), '');
          break;
        case 'intro':
        case 'closing':
          out.push(plainInline(block.text), '');
          break;
        case 'list':
          out.push(...block.items.map((t) => `• ${plainInline(t)}`), '');
          break;
        case 'day':
          out.push(`${block.label || labels.day} ${block.number} — ${plainInline(block.title)}`);
          for (const item of block.items) {
            if (item.kind === 'overnight') out.push(`${item.label || labels.overnight}: ${plainInline(item.text)}`);
            else out.push(item.kind === 'li' ? `• ${plainInline(item.text)}` : plainInline(item.text));
          }
          out.push('');
          break;
        case 'section':
          out.push(plainInline(block.title), ...block.items.map((t) => `• ${plainInline(t)}`), '');
          break;
      }
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  // ---------------------------------------------------------------- internals

  private detectLanguage(blocks: Block[]): void {
    const first = blocks.find((b): b is DayBlock => b.kind === 'day');
    if (!first) return;
    const label = first.label.toLowerCase();
    const match = LOCALES.find((l) => PLAN_LABELS[l].day.toLowerCase() === label);
    const lang = match ?? this.locale;
    if (lang !== this.planLang) this.planLang = lang;
    if (lang !== this.locale) this.root.setAttribute('lang', lang);
    else this.root.removeAttribute('lang');
  }

  private setCaret(streaming: boolean): void {
    this.caret?.removeAttribute('data-caret');
    this.caret = null;
    if (!streaming) return;
    const last = this.rendered[this.rendered.length - 1]?.el;
    if (!last) return;
    const leaves = last.matches('p, li') ? [last] : [...last.querySelectorAll('h4 .it-day__title-text, h4, li, p')];
    const target = leaves[leaves.length - 1] ?? last;
    target.setAttribute('data-caret', '');
    this.caret = target;
  }

  private setInline(el: Element, text: string, streaming: boolean): void {
    el.replaceChildren(...inlineNodes(tidy(text, streaming)));
  }

  private create(block: Block, streaming: boolean): HTMLElement {
    switch (block.kind) {
      case 'note': {
        const p = document.createElement('p');
        p.className = 'it-note';
        p.lang = this.locale;
        this.patch(p, block, streaming);
        return p;
      }
      case 'intro':
      case 'closing': {
        const p = document.createElement('p');
        p.className = block.kind === 'intro' ? 'it-intro' : 'it-closing';
        this.patch(p, block, streaming);
        return p;
      }
      case 'list': {
        const ul = document.createElement('ul');
        ul.className = 'it-list';
        this.patch(ul, block, streaming);
        return ul;
      }
      case 'section': {
        const section = document.createElement('section');
        section.className = 'it-why';
        const h = document.createElement('h4');
        h.className = 'it-why__title';
        const spark = svgIcon('M10 2.5c.55 4.9 2.6 6.95 7.5 7.5-4.9.55-6.95 2.6-7.5 7.5-.55-4.9-2.6-6.95-7.5-7.5 4.9-.55 6.95-2.6 7.5-7.5z', 'it-why__spark', true);
        const title = document.createElement('span');
        h.append(spark, title);
        const ul = document.createElement('ul');
        ul.className = 'it-why__list';
        section.append(h, ul);
        this.patch(section, block, streaming);
        return section;
      }
      case 'day': {
        const section = document.createElement('section');
        section.className = 'it-day';
        section.dataset.day = String(block.number);
        const rail = document.createElement('div');
        rail.className = 'it-day__rail';
        rail.setAttribute('aria-hidden', 'true');
        const dot = document.createElement('span');
        dot.className = 'it-day__dot';
        dot.textContent = String(block.number).padStart(2, '0');
        rail.append(dot);

        const main = document.createElement('div');
        main.className = 'it-day__main';
        const h = document.createElement('h4');
        h.className = 'it-day__head';
        const kicker = document.createElement('span');
        kicker.className = 'it-day__kicker';
        const label = document.createElement('span');
        label.className = 'it-day__label';
        const ka = document.createElement('span');
        ka.className = 'it-day__ka';
        ka.lang = 'ka';
        ka.setAttribute('aria-hidden', 'true');
        ka.textContent = georgianNumeral(block.number);
        const stops = document.createElement('span');
        stops.className = 'it-day__stops';
        stops.setAttribute('aria-hidden', 'true');
        kicker.append(label, ka, stops);
        const sep = document.createElement('span');
        sep.className = 'visually-hidden';
        sep.textContent = ': ';
        const title = document.createElement('span');
        title.className = 'it-day__title-text';
        h.append(kicker, sep, title);
        const list = document.createElement('ul');
        list.className = 'it-day__list';
        const extra = document.createElement('div');
        extra.className = 'it-day__extra';
        main.append(h, list, extra);
        section.append(rail, main);
        this.patch(section, block, streaming);
        return section;
      }
    }
  }

  private patch(el: HTMLElement, block: Block, streaming: boolean): void {
    switch (block.kind) {
      case 'note':
        this.setInline(el, block.text.replace(/^[*_](?![*_])/, '').replace(/(?<![*_])[*_]$/, ''), streaming);
        return;
      case 'intro':
      case 'closing':
        this.setInline(el, block.text, streaming);
        return;
      case 'list':
        this.syncItems(el, block.items, streaming);
        return;
      case 'section': {
        const title = el.querySelector('h4 > span:last-child');
        if (title) this.setInline(title, block.title, streaming && !block.items.length);
        const ul = el.querySelector('ul');
        if (ul) this.syncItems(ul, block.items, streaming);
        return;
      }
      case 'day': {
        const label = el.querySelector('.it-day__label');
        if (label) label.textContent = `${block.label || PLAN_LABELS[this.planLang].day} ${block.number}`;
        const title = el.querySelector('.it-day__title-text');
        if (title) this.setInline(title, block.title, streaming && !block.items.length);
        const list = el.querySelector<HTMLElement>('.it-day__list');
        if (list) this.syncItems(list, block.items.filter((i) => i.kind === 'li').map((i) => i.text), streaming);
        const extra = el.querySelector<HTMLElement>('.it-day__extra');
        if (extra) this.syncExtra(extra, block.items.filter((i) => i.kind !== 'li'), streaming);
        return;
      }
    }
  }

  private syncItems(list: Element, items: string[], streaming: boolean): void {
    items.forEach((text, i) => {
      let li = list.children[i] as HTMLElement | undefined;
      if (!li) {
        li = document.createElement('li');
        if (streaming) li.classList.add('is-new');
        list.append(li);
      }
      const partial = streaming && i === items.length - 1;
      if (li.dataset.src !== text || li.dataset.partial !== undefined) {
        li.dataset.src = text;
        if (partial) li.dataset.partial = '';
        else delete li.dataset.partial;
        this.setInline(li, text, partial);
      }
    });
    while (list.children.length > items.length) list.lastElementChild?.remove();
  }

  private syncExtra(extra: HTMLElement, items: DayItem[], streaming: boolean): void {
    items.forEach((item, i) => {
      let el = extra.children[i] as HTMLElement | undefined;
      const want = item.kind === 'overnight' ? 'it-day__overnight' : 'it-day__p';
      if (el && el.className !== want) {
        el.remove();
        el = undefined;
      }
      if (!el) {
        el = document.createElement('p');
        el.className = want;
        if (item.kind === 'overnight') {
          const moon = svgIcon('M14.75 4.25a7.75 7.75 0 1 0 5 13.6 6.25 6.25 0 0 1-5-13.6z', 'it-day__moon', false);
          const label = document.createElement('span');
          label.className = 'it-day__on-label';
          const place = document.createElement('span');
          place.className = 'it-day__on-place';
          el.append(moon, label, place);
        }
        const before = extra.children[i];
        if (before) extra.insertBefore(el, before);
        else extra.append(el);
      }
      if (item.kind === 'overnight') {
        const label = el.querySelector('.it-day__on-label');
        if (label) label.textContent = `${item.label || PLAN_LABELS[this.planLang].overnight}:`;
        const place = el.querySelector('.it-day__on-place');
        if (place) this.setInline(place, item.text, streaming);
      } else {
        this.setInline(el, item.text, streaming);
      }
    });
    while (extra.children.length > items.length) extra.lastElementChild?.remove();
  }
}

function svgIcon(d: string, className: string, filled: boolean): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  if (filled) path.setAttribute('fill', 'currentColor');
  else {
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.5');
  }
  svg.append(path);
  return svg;
}
