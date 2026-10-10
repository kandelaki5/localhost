/**
 * Photo Match (#photo-match) — browser logic, lazy-loaded by lazy.ts.
 * Uses src/lib/ai/client/photo.ts (downscale → POST /api/photo-match).
 * Model text is written with textContent only; photos come from our own map
 * of place photos (PlaceInfo.photo), never from model text.
 */
import { isInspirationId, matchInspiration, matchPhoto, type PhotoMatchOutcome } from '../../../lib/ai/client/photo';
import type { Locale } from '../../../lib/ai/types';
import { buildMap } from './map';
import {
  fill,
  fmt,
  hideError,
  modeBadge,
  offscreen,
  readStrings,
  reportMode,
  req,
  reveal,
  runSteps,
  showError,
  tpl,
  type LabErrorStrings,
} from './dom';

interface Strings {
  lang: Locale;
  errors: LabErrorStrings;
  overrides: Record<string, string>;
  working: string;
  cancelled: string;
  elapsed: string;
  match: string;
  map: string;
  yourPhoto: string;
  resultTitle: string;
  notTravel: string;
  countries: Record<string, string>;
  photos: Record<string, { src: string; srcset: string }>;
}

export function init(root: HTMLElement): void {
  const t = readStrings<Strings>(root);
  const fileInput = req<HTMLInputElement>(root, '[data-file]');
  const cameraInput = req<HTMLInputElement>(root, '[data-camera]');
  const cameraWrap = req<HTMLElement>(root, '[data-camera-wrap]');
  const drop = req<HTMLElement>(root, '[data-drop]');
  const dropTitle = req<HTMLElement>(root, '[data-drop-title]');
  const monitor = req<HTMLElement>(root, '[data-monitor]');
  const screen = req<HTMLElement>(root, '[data-screen]');
  const preview = req<HTMLImageElement>(root, '[data-preview]');
  const idle = req<HTMLElement>(root, '[data-idle-screen]');
  const working = req<HTMLElement>(root, '[data-working]');
  const readout = req<HTMLElement>(root, '[data-readout]');
  const status = req<HTMLElement>(root, '[data-status]');
  const errorBox = req<HTMLElement>(root, '[data-error]');
  const badge = req<HTMLElement>(root, '[data-badge]');
  const results = req<HTMLElement>(root, '[data-results]');
  const matches = req<HTMLElement>(root, '[data-matches]');
  const notice = req<HTMLElement>(root, '[data-notice]');
  const sampleButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-sample]')];
  let controller: AbortController | null = null;
  let objectUrl: string | null = null;
  let stopSteps: () => void = () => undefined;
  let clearCooldown: () => void = () => undefined;

  if (matchMedia('(pointer: coarse)').matches) cameraWrap.hidden = false;

  function setState(state: 'idle' | 'working' | 'done' | 'error'): void {
    screen.dataset.state = state;
    status.classList.toggle('visually-hidden', state === 'done');
    working.hidden = state !== 'working';
    idle.hidden = state !== 'idle' || !preview.hidden;
    root.setAttribute('aria-busy', String(state === 'working'));
  }

  function showPreview(src: string, srcset?: string): void {
    if (objectUrl && src !== objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    preview.removeAttribute('srcset');
    if (srcset) preview.srcset = srcset;
    preview.src = src;
    preview.alt = t.yourPhoto;
    preview.hidden = false;
    idle.hidden = true;
  }

  function matchCard(item: Extract<PhotoMatchOutcome, { ok: true }>['data']['matches'][number], i: number): HTMLElement {
    const card = tpl(root, 'match');
    card.style.setProperty('--i', String(i));
    fill(card, 'n', fmt(t.match, { n: i + 1 }));
    fill(card, 'experience', item.experienceName);
    fill(card, 'title', item.title);
    const country = t.countries[item.place.country] ?? item.place.country;
    fill(card, 'place', `${item.place.name} · ${item.place.region} · ${country}`);
    fill(card, 'why', item.why);
    const media = card.querySelector<HTMLElement>('[data-media]');
    const photoName = item.place.photo?.replace(/\.[^.]+$/, '');
    const photo = photoName ? t.photos[photoName] : undefined;
    if (media && photo) {
      const img = document.createElement('img');
      img.src = photo.src;
      img.srcset = photo.srcset;
      img.sizes = '(min-width: 64em) 30vw, (min-width: 40em) 38vw, 100vw';
      img.alt = `${item.place.name}, ${country}`;
      img.loading = 'lazy';
      img.decoding = 'async';
      media.append(img);
    } else if (media) {
      media.append(
        buildMap([{ x: item.place.x, y: item.place.y, name: item.place.name }], {
          label: fmt(t.map, { place: item.place.name }),
          aspect: 4 / 3,
          minW: 320,
          route: false,
        }),
      );
    }
    return card;
  }

  function render(outcome: PhotoMatchOutcome): void {
    stopSteps();
    if (!outcome.ok) {
      if (outcome.aborted) {
        setState(preview.hidden ? 'idle' : 'error');
        status.textContent = t.cancelled;
        return;
      }
      setState('error');
      status.textContent = '';
      reportMode(outcome.mode);
      clearCooldown = showError(errorBox, outcome, t.errors, { overrides: t.overrides, buttons: sampleButtons, lang: t.lang });
      return;
    }
    const d = outcome.data;
    reportMode(outcome.mode);
    setState('done');
    badge.replaceChildren(modeBadge(root, outcome.mode));
    readout.hidden = false;
    const travel = d.status === 'matched' && d.matches.length > 0;
    fill(readout, 'mood', travel ? d.mood : t.notTravel);
    fill(readout, 'see', d.whatISee);
    fill(readout, 'message', travel ? '' : (d.message ?? ''));
    status.textContent = travel ? `${t.resultTitle} — ${d.mood}` : (d.message ?? t.notTravel);

    notice.replaceChildren();
    if (d.mode === 'demo' && d.sample) notice.append(modeBadge(root, 'demo'), document.createTextNode(d.sample.notice));
    if (!travel) {
      results.hidden = true;
      return;
    }
    matches.replaceChildren(...d.matches.slice(0, 3).map(matchCard));
    fill(results, 'tip', d.tip);
    results.hidden = false;
  }

  async function run(task: (signal: AbortSignal) => Promise<PhotoMatchOutcome>): Promise<void> {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    clearCooldown();
    hideError(errorBox);
    readout.hidden = true;
    results.hidden = true;
    badge.replaceChildren();
    setState('working');
    status.textContent = t.working;
    stopSteps = runSteps(root.querySelector('[data-steps]'), root.querySelector('[data-elapsed]'), t.elapsed, 1400);
    if (offscreen(monitor)) reveal(monitor);
    const outcome = await task(signal);
    if (controller?.signal !== signal) return; // superseded by a newer run
    render(outcome);
  }

  function runFile(file: File | undefined): void {
    if (!file) return;
    sampleButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    objectUrl = URL.createObjectURL(file);
    showPreview(objectUrl);
    void run((signal) => matchPhoto(file, t.lang, { signal }));
  }

  fileInput.addEventListener('change', () => {
    runFile(fileInput.files?.[0]);
    fileInput.value = '';
  });
  cameraInput.addEventListener('change', () => {
    runFile(cameraInput.files?.[0]);
    cameraInput.value = '';
  });

  // Drag & drop onto the drop zone.
  let depth = 0;
  const setDragging = (on: boolean) => {
    drop.classList.toggle('is-dragging', on);
    dropTitle.textContent = (on ? dropTitle.dataset.textActive : dropTitle.dataset.textIdle) ?? '';
  };
  drop.addEventListener('dragenter', (e) => {
    e.preventDefault();
    depth += 1;
    setDragging(true);
  });
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  });
  drop.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (!depth) setDragging(false);
  });
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    depth = 0;
    setDragging(false);
    runFile(e.dataTransfer?.files?.[0]);
  });

  // Paste an image while working in this section.
  root.addEventListener('paste', (e) => {
    const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
    if (file) {
      e.preventDefault();
      runFile(file);
    }
  });

  for (const button of sampleButtons) {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      const id = button.dataset.sample;
      const src = button.dataset.src;
      if (!isInspirationId(id) || !src) return;
      sampleButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      showPreview(src);
      void run((signal) => matchInspiration(id, src, t.lang, { signal }));
    });
  }

  req<HTMLButtonElement>(root, '[data-cancel]').addEventListener('click', () => controller?.abort());
  req<HTMLButtonElement>(root, '[data-again]').addEventListener('click', () => {
    reveal(drop);
    fileInput.focus({ preventScroll: true });
  });
}
