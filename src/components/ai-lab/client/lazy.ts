/**
 * AI Lab boot (the only script that runs on page load; small).
 *
 * - Lazy-loads each feature's script with a dynamic import() when its section
 *   comes within ~one screen of the viewport, or as soon as the visitor
 *   points at / focuses / clicks into it (whichever happens first).
 * - Keeps the hero console's demo/live status in sync with the X-AI-Mode
 *   header of every AI response (features dispatch `lab:mode`).
 * - Draws route maps in when they scroll into view (motion allowed only).
 */
import type { AiMode } from '../../../lib/ai/types';
import { drawRoute } from './map';

type FeatureModule = { init: (root: HTMLElement) => void };

const LOADERS: Record<string, () => Promise<FeatureModule>> = {
  'photo-match': () => import('./photo-match'),
  proposal: () => import('./proposal'),
  'policy-qa': () => import('./policy-qa'),
  triage: () => import('./triage'),
  mcp: () => import('./mcp'),
};

/** A submit that arrived before the feature script was ready, replayed after init(). */
const pending = new WeakMap<HTMLElement, () => void>();

function load(root: HTMLElement): void {
  const name = root.dataset.labFeature ?? '';
  const loader = LOADERS[name];
  if (!loader || root.dataset.labState) return;
  root.dataset.labState = 'loading';
  loader()
    .then((mod) => {
      mod.init(root);
      root.dataset.labState = 'ready';
      pending.get(root)?.();
      pending.delete(root);
    })
    .catch((err: unknown) => {
      root.dataset.labState = 'failed';
      console.error(`[ai-lab] ${name} failed to load`, err);
    });
}

function bootFeatures(): void {
  const roots = [...document.querySelectorAll<HTMLElement>('[data-lab-feature]')];
  const early = (event: Event) => load(event.currentTarget as HTMLElement);
  for (const root of roots) {
    for (const type of ['pointerover', 'focusin', 'touchstart']) root.addEventListener(type, early, { once: true, passive: true });
    // A submit before the script is ready would be a native GET: a reload with the
    // form (e.g. a pasted email) in the URL. Hold it and replay it once ready.
    root.addEventListener(
      'submit',
      (event) => {
        if (root.dataset.labState === 'ready') return;
        event.preventDefault();
        if (root.dataset.labState === 'failed') return;
        const form = event.target as HTMLFormElement;
        const submitter = (event as SubmitEvent).submitter;
        pending.set(root, () => form.requestSubmit(submitter instanceof HTMLButtonElement && submitter.form === form ? submitter : undefined));
        load(root);
      },
      true,
    );
  }
  if (!('IntersectionObserver' in window)) {
    roots.forEach(load);
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        load(entry.target as HTMLElement);
      }
    },
    { rootMargin: '100% 0px 100% 0px' },
  );
  roots.forEach((root) => io.observe(root));
}

function bootMode(): void {
  const status = document.querySelector<HTMLElement>('[data-lab-mode]');
  if (!status) return;
  document.addEventListener('lab:mode', (event) => {
    const mode = (event as CustomEvent<AiMode>).detail;
    if ((mode !== 'demo' && mode !== 'live') || status.dataset.labMode === mode) return;
    status.dataset.labMode = mode;
    document.querySelectorAll<HTMLElement>('[data-mode-show]').forEach((node) => {
      node.hidden = node.dataset.modeShow !== mode;
    });
  });
}

function bootDraw(): void {
  const maps = document.querySelectorAll<HTMLElement>('[data-lab-draw]');
  if (!maps.length || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        drawRoute(entry.target as HTMLElement);
      }
    },
    { threshold: 0.3 },
  );
  maps.forEach((map) => {
    map.querySelectorAll<HTMLElement>('.lab-map__stop').forEach((stop, i) => stop.style.setProperty('--i', String(i)));
    map.classList.add('lab-map--armed');
    io.observe(map);
  });
}

export function boot(): void {
  bootMode();
  bootFeatures();
  bootDraw();
}
