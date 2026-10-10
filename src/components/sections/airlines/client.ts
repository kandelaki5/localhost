/**
 * 04 · Airlines — client behaviour for the typography wall.
 *
 * - Each name is a disclosure button: click/tap toggles its caption (one open
 *   at a time); Escape or a click elsewhere closes it. Hover and keyboard
 *   focus show captions through CSS; Escape hides those too (WCAG 1.4.13).
 * - Captions near the right edge flip to align with the name's end.
 * - A short staggered entrance when the wall first scrolls into view
 *   (motion allowed only; content is never hidden without this script).
 */
export function initAirlines(root: HTMLElement): void {
  const wall = root.querySelector<HTMLElement>('[data-al-wall]');
  const items = [...root.querySelectorAll<HTMLElement>('[data-al-item]')];
  if (!wall || !items.length) return;
  const popover = matchMedia('(min-width: 40em)');

  const toggleOf = (item: HTMLElement) => item.querySelector<HTMLButtonElement>('[data-al-toggle]');

  const closeAll = (except?: HTMLElement) => {
    for (const item of items) if (item !== except) toggleOf(item)?.setAttribute('aria-expanded', 'false');
  };

  /** Keep the caption inside the wall: align it to the name's end when it would overflow. */
  const place = (item: HTMLElement) => {
    item.removeAttribute('data-align');
    if (!popover.matches) return;
    const cap = item.querySelector<HTMLElement>('[data-al-cap]');
    const button = toggleOf(item);
    if (!cap || !button) return;
    // captions are display:none until shown: show one for a moment to measure it
    const hidden = getComputedStyle(cap).display === 'none';
    if (hidden) cap.style.display = 'block';
    const right = cap.getBoundingClientRect().right;
    if (hidden) cap.style.removeProperty('display');
    if (right <= wall.getBoundingClientRect().right + 1) return;
    // end-align with the name itself, not with the separator dot after it
    const gap = item.getBoundingClientRect().right - button.getBoundingClientRect().right;
    item.style.setProperty('--cap-end', `${Math.max(0, gap)}px`);
    item.dataset.align = 'end';
  };

  for (const item of items) {
    const button = toggleOf(item);
    item.addEventListener('pointerenter', () => {
      item.removeAttribute('data-dismissed');
      place(item);
    });
    item.addEventListener('pointerleave', () => item.removeAttribute('data-dismissed'));
    button?.addEventListener('focus', () => place(item));
    button?.addEventListener('blur', () => item.removeAttribute('data-dismissed'));
    button?.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      closeAll(item);
      button.setAttribute('aria-expanded', String(!open));
      item.removeAttribute('data-dismissed');
      place(item);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    for (const item of items) {
      const shown =
        toggleOf(item)?.getAttribute('aria-expanded') === 'true' ||
        item.matches(':hover') ||
        item.contains(document.activeElement);
      if (shown) item.dataset.dismissed = '';
    }
    closeAll();
  });

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-al-item]')) closeAll();
  });

  popover.addEventListener('change', () => items.forEach((item) => item.removeAttribute('data-align')));

  // Entrance: only when motion is allowed and the wall is still below the fold.
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm || wall.getBoundingClientRect().top < window.innerHeight * 0.9) return;
  wall.setAttribute('data-reveal', '');
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      wall.setAttribute('data-in', '');
      io.disconnect();
    },
    { threshold: 0.25 },
  );
  io.observe(wall);
}
