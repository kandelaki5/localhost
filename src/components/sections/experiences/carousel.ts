/**
 * Experiences carousel — progressive enhancement over a native scroll-snap
 * track (the track scrolls by touch, trackpad and scrollbar without this).
 *
 * Adds: prev/next buttons that page by the number of whole cards in view,
 * the "01–03 / 06" counter (announced politely once scrolling settles), a
 * progress bar, arrow/Home/End keys between the focusable cards, a one-time
 * entrance, and the `lh:plan-preset` event for the AI planner (#plan).
 *
 * Hooks are data-* attributes inside the section root; no globals.
 */

const SETTLE_MS = 160;

export function initExperiences(root: HTMLElement): void {
  const track = root.querySelector<HTMLElement>('[data-exp-track]');
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-exp-item]'));
  if (!track || items.length < 2) return;

  const cards = items.map((item) => item.querySelector<HTMLElement>('[data-exp-card]') ?? item);
  const prev = root.querySelector<HTMLButtonElement>('[data-exp-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-exp-next]');
  const range = root.querySelector<HTMLElement>('[data-exp-range]');
  const status = root.querySelector<HTMLElement>('[data-exp-status]');
  const thumb = root.querySelector<HTMLElement>('[data-exp-thumb]');
  const statusMany = root.dataset.status ?? '{from}–{to} / {total}';
  const statusOne = root.dataset.statusOne ?? '{from} / {total}';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const behavior = (): ScrollBehavior => (reduceMotion.matches ? 'auto' : 'smooth');
  const total = items.length;
  const pad = (n: number) => String(n).padStart(2, '0');

  /** Geometry, read fresh each time (cheap: a handful of offsets). */
  const measure = () => {
    const inset = items[0].offsetLeft;
    const step = items[1].offsetLeft - items[0].offsetLeft;
    const view = track.clientWidth - 2 * inset;
    const gap = step - items[0].offsetWidth;
    const perView = Math.max(1, Math.floor((view + gap) / step + 0.05));
    const max = track.scrollWidth - track.clientWidth;
    const first = Math.min(total - perView, Math.max(0, Math.round(track.scrollLeft / step)));
    return { inset, step, view, perView, max, first };
  };

  const scrollToLeft = (left: number) => track.scrollTo({ left, behavior: behavior() });

  // ── counter, buttons, progress ──────────────────────────────────────────
  let lastStatus = '';

  const paint = () => {
    const { perView, max, first } = measure();
    const last = Math.min(total, first + perView);
    if (range) range.textContent = perView === 1 ? pad(first + 1) : `${pad(first + 1)}–${pad(last)}`;

    if (prev && next) {
      const atStart = track.scrollLeft <= 1;
      const atEnd = track.scrollLeft >= max - 1;
      // Keep keyboard focus on a working control when one end is reached.
      if (atStart && document.activeElement === prev && !atEnd) next.focus();
      if (atEnd && document.activeElement === next && !atStart) prev.focus();
      prev.disabled = atStart;
      next.disabled = atEnd;
    }

    if (thumb) {
      const size = Math.min(1, track.clientWidth / track.scrollWidth);
      const start = max > 0 ? (track.scrollLeft / max) * (1 - size) : 0;
      thumb.style.width = `${size * 100}%`;
      thumb.style.transform = `translateX(${(start / size) * 100}%)`;
    }
  };

  const announce = () => {
    const { perView, first } = measure();
    const last = Math.min(total, first + perView);
    const text = (perView === 1 ? statusOne : statusMany)
      .replace('{from}', String(first + 1))
      .replace('{to}', String(last))
      .replace('{total}', String(total));
    if (status && text !== lastStatus) {
      // The first value is set silently (live regions only speak on change).
      status.textContent = text;
      lastStatus = text;
    }
  };

  let frame = 0;
  let settle = 0;
  track.addEventListener(
    'scroll',
    () => {
      if (!frame) frame = requestAnimationFrame(() => ((frame = 0), paint()));
      clearTimeout(settle);
      settle = window.setTimeout(announce, SETTLE_MS);
    },
    { passive: true },
  );

  // Announce as soon as scrolling settles where `scrollend` exists (the timeout covers the rest).
  if ('onscrollend' in window) {
    track.addEventListener('scrollend', () => {
      clearTimeout(settle);
      announce();
    });
  }

  new ResizeObserver(() => {
    paint();
    announce();
  }).observe(track);

  // ── prev / next: page by the whole cards in view ────────────────────────
  const page = (dir: 1 | -1) => {
    const { step, perView, max, first } = measure();
    const target = Math.max(0, Math.min(max, (first + dir * perView) * step));
    scrollToLeft(target);
  };
  prev?.addEventListener('click', () => page(-1));
  next?.addEventListener('click', () => page(1));

  // ── keyboard: arrows / Home / End move between cards ────────────────────
  const reveal = (index: number) => {
    const { inset, max } = measure();
    const item = items[index];
    const left = item.offsetLeft - track.scrollLeft;
    const right = left + item.offsetWidth;
    if (left < inset - 1) scrollToLeft(Math.max(0, item.offsetLeft - inset));
    else if (right > track.clientWidth - inset + 1) {
      scrollToLeft(Math.min(max, item.offsetLeft + item.offsetWidth - track.clientWidth + inset));
    }
  };

  track.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const current = items.findIndex((item) => item.contains(document.activeElement));
    if (current < 0) return;
    const keys: Record<string, number> = {
      ArrowRight: current + 1,
      ArrowLeft: current - 1,
      Home: 0,
      End: total - 1,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const to = Math.max(0, Math.min(total - 1, keys[event.key]));
    if (to === current && document.activeElement === cards[to]) return;
    // preventScroll: the focusin handler below scrolls just enough, on the snap grid.
    cards[to].focus({ preventScroll: true });
  });

  // Focusing a card that is partly hidden (Tab, arrows, a click on the peeking
  // card) brings it fully into view.
  track.addEventListener('focusin', (event) => {
    const index = items.findIndex((item) => item.contains(event.target as Node));
    if (index >= 0) reveal(index);
  });

  // ── "Plan this with AI": preset the planner, then follow the #plan link ─
  track.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('[data-exp-plan]');
    const id = link?.dataset.expPlan;
    if (!id) return;
    window.dispatchEvent(new CustomEvent('lh:plan-preset', { detail: { interests: [id] } }));
  });

  // ── entrance: once, only below the fold and only when motion is allowed ─
  if (!reduceMotion.matches && 'IntersectionObserver' in window && track.getBoundingClientRect().top > innerHeight) {
    root.dataset.reveal = 'pending';
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        root.dataset.reveal = 'done';
        io.disconnect();
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    io.observe(track);
  }

  paint();
  announce();
}
