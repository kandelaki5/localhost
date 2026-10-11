/**
 * Small DOM helpers shared by the AI Lab feature scripts.
 *
 * Rendering rule (docs/AI-ARCHITECTURE.md): model output is untrusted text.
 * Everything here writes with textContent / DOM nodes; nothing takes HTML.
 * Result markup comes from <template data-tpl="…"> elements authored in the
 * .astro components (our own static markup), filled through [data-slot] hooks.
 */
import type { AiMode } from '../../../lib/ai/types';

/** Required element inside `root` (throws early if the markup and script drift apart). */
export function req<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`[ai-lab] missing ${selector}`);
  return node;
}

/** Clone of `<template data-tpl="name">`'s first element. */
export function tpl<T extends HTMLElement = HTMLElement>(root: ParentNode, name: string): T {
  const template = req<HTMLTemplateElement>(root, `template[data-tpl="${name}"]`);
  const node = template.content.firstElementChild?.cloneNode(true);
  if (!node) throw new Error(`[ai-lab] empty template ${name}`);
  return node as T;
}

export function slot<T extends HTMLElement = HTMLElement>(node: ParentNode, name: string): T | null {
  return node.querySelector<T>(`[data-slot="${name}"]`);
}

/** Sets the text of [data-slot=name] (hides it when text is empty). */
export function fill(node: ParentNode, name: string, text: string | null | undefined): HTMLElement | null {
  const target = slot(node, name);
  if (!target) return null;
  target.textContent = text ?? '';
  target.hidden = !text;
  return target;
}

/** Element with text (textContent — never HTML). */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string | null, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

/** `<ul>`/`<ol>` of text items. */
export function list(items: readonly string[], ordered = false, className?: string): HTMLUListElement | HTMLOListElement {
  const node = el(ordered ? 'ol' : 'ul', undefined, className);
  for (const item of items) node.append(el('li', item));
  return node;
}

/** Strings embedded by the component in <script type="application/json" data-lab-strings>. */
export function readStrings<T>(root: ParentNode): T {
  const node = root.querySelector('script[data-lab-strings]');
  return JSON.parse(node?.textContent ?? '{}') as T;
}

/** "{n} days" → "8 days". */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scrolls an element into view (instant under reduced motion) and optionally focuses it. */
export function reveal(node: HTMLElement, focus = false): void {
  node.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  if (focus) {
    if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1');
    node.focus({ preventScroll: true });
  }
}

/** True when the element's top is outside the viewport (avoid needless scrolling). */
export function offscreen(node: HTMLElement): boolean {
  const r = node.getBoundingClientRect();
  return r.top < 0 || r.top > window.innerHeight * 0.75;
}

/** Copies text with the async Clipboard API (HTTPS); false when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Wires a copy button: copies `getText()`, then shows the "Copied" label for a moment. */
export function copyButton(button: HTMLButtonElement, getText: () => string, labels: { copied: string; failed: string }): void {
  const label = button.querySelector<HTMLElement>('[data-label]') ?? button;
  const original = label.textContent ?? '';
  let timer = 0;
  button.addEventListener('click', async () => {
    const ok = await copyText(getText());
    label.textContent = ok ? labels.copied : labels.failed;
    button.dataset.copied = ok ? 'true' : 'false';
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      label.textContent = original;
      delete button.dataset.copied;
    }, 2200);
  });
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export interface LabErrorStrings {
  network: string;
  rateLimited: string;
  rateLimitedNow: string;
  dailyCap: string;
  refusal: string;
  truncated: string;
  timeout: string;
  busy: string;
  tooLarge: string;
  badRequest: string;
  unauthorized: string;
  generic: string;
}

const GROUPS: Record<string, keyof LabErrorStrings> = {
  network: 'network',
  rate_limited: 'rateLimited',
  daily_cap: 'dailyCap',
  refusal: 'refusal',
  truncated: 'truncated',
  upstream_timeout: 'timeout',
  upstream_rate_limited: 'busy',
  upstream_overloaded: 'busy',
  payload_too_large: 'tooLarge',
  bad_request: 'badRequest',
  invalid_json: 'badRequest',
  unauthorized: 'unauthorized',
};

/** Localised message for an error code; feature-specific overrides win. */
export function errorMessage(code: string, strings: LabErrorStrings, overrides: Record<string, string> = {}): string {
  return overrides[code] ?? strings[GROUPS[code] ?? 'generic'];
}

function formatWait(seconds: number, lang: string): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  const clock = `${m}:${String(rest).padStart(2, '0')}`;
  try {
    // Without locale data (e.g. Georgian in Chrome) Intl silently answers in English: use a neutral m:ss.
    if (!Intl.NumberFormat.supportedLocalesOf([lang]).length) return clock;
    if (m >= 1) {
      const minutes = new Intl.NumberFormat(lang, { style: 'unit', unit: 'minute', unitDisplay: 'long' }).format(m);
      return rest ? `${minutes} ${new Intl.NumberFormat(lang, { style: 'unit', unit: 'second', unitDisplay: 'short' }).format(rest)}` : minutes;
    }
    return new Intl.NumberFormat(lang, { style: 'unit', unit: 'second', unitDisplay: 'long' }).format(s);
  } catch {
    return clock;
  }
}

/**
 * Shows an error in `box`. For rate limits with a Retry-After, counts down and
 * keeps `buttons` disabled until the wait is over. Returns a cancel function.
 */
export function showError(
  box: HTMLElement,
  outcome: { error: string; retryAfter?: number | undefined },
  strings: LabErrorStrings,
  options: { overrides?: Record<string, string>; buttons?: HTMLButtonElement[]; lang?: string } = {},
): () => void {
  const lang = options.lang ?? document.documentElement.lang ?? 'en';
  const code = outcome.error;
  const wait = outcome.retryAfter;
  box.hidden = false;
  if ((code === 'rate_limited' || code === 'upstream_rate_limited') && wait && wait > 0 && wait < 7200) {
    const until = Date.now() + wait * 1000;
    const buttons = options.buttons ?? [];
    buttons.forEach((b) => (b.disabled = true));
    const tick = () => {
      const left = (until - Date.now()) / 1000;
      if (left <= 0) {
        window.clearInterval(timer);
        box.textContent = strings.rateLimitedNow;
        buttons.forEach((b) => (b.disabled = false));
        return;
      }
      box.textContent = fmt(strings.rateLimited, { time: formatWait(left, lang) });
    };
    const timer = window.setInterval(tick, 1000);
    tick();
    return () => {
      window.clearInterval(timer);
      buttons.forEach((b) => (b.disabled = false));
    };
  }
  box.textContent = errorMessage(code, strings, options.overrides);
  return () => undefined;
}

export function hideError(box: HTMLElement): void {
  box.hidden = true;
  box.textContent = '';
}

// ---------------------------------------------------------------------------
// Mode (demo / live) — shown in the hero console, read from response headers
// ---------------------------------------------------------------------------

/** Mode the page was built with, corrected by every AI response (X-AI-Mode header). */
export function currentMode(): AiMode {
  const status = document.querySelector<HTMLElement>('[data-lab-mode]');
  return status?.dataset.labMode === 'live' ? 'live' : 'demo';
}

/** Report the mode an AI response came back with; the hero console listens. */
export function reportMode(mode: AiMode | null | undefined): void {
  if (mode !== 'demo' && mode !== 'live') return;
  document.dispatchEvent(new CustomEvent('lab:mode', { detail: mode }));
}

/** Fills a result's mode badge (demo / live) from <template data-tpl="badge-…">. */
export function modeBadge(root: ParentNode, mode: AiMode): HTMLElement {
  return tpl(root, mode === 'demo' ? 'badge-demo' : 'badge-live');
}

// ---------------------------------------------------------------------------
// Staged progress
// ---------------------------------------------------------------------------

/**
 * Advances a `.lab-steps` list over time (one request has no real progress
 * events, so stages are timed; the last stays active until done) and updates
 * an elapsed-seconds counter. Returns stop().
 */
export function runSteps(steps: HTMLElement | null, elapsed: HTMLElement | null, template: string, stepMs = 2600): () => void {
  const items = steps ? [...steps.querySelectorAll<HTMLElement>('li')] : [];
  const started = performance.now();
  const set = (active: number) =>
    items.forEach((li, i) => (li.dataset.state = i < active ? 'done' : i === active ? 'active' : 'todo'));
  set(0);
  const timer = window.setInterval(() => {
    const ms = performance.now() - started;
    set(Math.min(items.length - 1, Math.floor(ms / stepMs)));
    if (elapsed) elapsed.textContent = fmt(template, { s: Math.floor(ms / 1000) });
  }, 250);
  if (elapsed) elapsed.textContent = fmt(template, { s: 0 });
  return () => {
    window.clearInterval(timer);
    set(items.length);
  };
}
