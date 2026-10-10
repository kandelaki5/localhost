/**
 * Stamp entrance shared by 06 Meet us, 07 Members and 08 Awards: marks the
 * section `data-reveal="ready"` and sets `data-revealed` on each `[data-stamp]`
 * once it scrolls into view (once, then unobserved). The CSS animation lives
 * in each component, inside `prefers-reduced-motion: no-preference`.
 * Without JS, IntersectionObserver or motion, nothing is ever hidden.
 */
export function revealStamps(scope: HTMLElement | null): void {
  if (!scope || !('IntersectionObserver' in window)) return;
  if (!matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        (e.target as HTMLElement).dataset.revealed = '';
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  scope.dataset.reveal = 'ready';
  scope.querySelectorAll('[data-stamp]').forEach((el) => io.observe(el));
}
