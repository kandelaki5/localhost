/**
 * Unique ids for inline SVG (gradients, textPaths) and ARIA wiring.
 * A per-process counter is enough: ids only need to be unique within the
 * page being rendered, and the counter never repeats during a build.
 */
let counter = 0;

export function uid(prefix = 'u'): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}-${counter.toString(36)}`;
}

/**
 * Rewrites every id inside an SVG string (and its url(#…) / href="#…"
 * references) with a suffix, so the same file can be inlined any number of
 * times on one page without the duplicate-id gradient bug.
 */
export function scopeSvgIds(svg: string, suffix: string): string {
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  let out = svg;
  for (const id of ids) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out
      .replace(new RegExp(`id="${esc}"`, 'g'), `id="${id}-${suffix}"`)
      .replace(new RegExp(`url\\(#${esc}\\)`, 'g'), `url(#${id}-${suffix})`)
      .replace(new RegExp(`href="#${esc}"`, 'g'), `href="#${id}-${suffix}"`)
      .replace(new RegExp(`aria-labelledby="${esc}"`, 'g'), `aria-labelledby="${id}-${suffix}"`);
  }
  return out;
}
