// @ts-check
/**
 * Tiny parser for src/styles/tokens.css.
 *
 * Shared by the site (styleguide contrast table, theme-color) and by
 * scripts/export-tokens.mjs (Figma / Tokens Studio export). Plain JS with
 * JSDoc so Node can run it without a build step; types live in
 * css-tokens.d.mts.
 *
 * It relies on the conventions documented at the top of tokens.css:
 * one declaration per line, an optional trailing comment as description.
 */

const DECL = /^\s*(--[\w-]+)\s*:\s*(.+?)\s*;\s*(?:\/\*\s*(.*?)\s*\*\/)?\s*$/;
const BLOCK_OPEN = /^\s*([^{}]+?)\s*\{\s*$/;
const BLOCK_CLOSE = /^\s*\}\s*$/;
const SECTION = /^\s*\/\*\s*──\s*(?:\d+\.\s*)?(.+?)\s*─*\s*\*\/\s*$/;

/**
 * @param {string} css
 * @returns {import('./css-tokens.d.mts').TokenBlock[]}
 */
export function parseTokensCss(css) {
  /** @type {import('./css-tokens.d.mts').TokenBlock[]} */
  const blocks = [];
  /** @type {import('./css-tokens.d.mts').TokenBlock | null} */
  let current = null;
  let group = '';
  let inComment = false;
  const lines = css.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (inComment) {
      if (line.includes('*/')) inComment = false;
      return;
    }
    const section = line.match(SECTION);
    if (section && current) {
      group = section[1].replace(/\s+—.*$/, '').trim();
      return;
    }
    if (/^\s*\/\*/.test(line) && !line.includes('*/')) {
      inComment = true;
      return;
    }
    const open = line.match(BLOCK_OPEN);
    if (open && !line.trim().startsWith('/*')) {
      current = { selector: open[1].trim(), tokens: [] };
      blocks.push(current);
      group = '';
      return;
    }
    if (BLOCK_CLOSE.test(line)) {
      current = null;
      return;
    }
    const decl = line.match(DECL);
    if (decl && current) {
      current.tokens.push({
        name: decl[1],
        value: decl[2],
        description: decl[3] ?? '',
        group,
        line: i + 1,
      });
    }
  });
  return blocks;
}

/**
 * Builds a lookup for one surface: root tokens, overridden by the surface's
 * block when given (e.g. "night" → [data-surface='night']).
 * @param {import('./css-tokens.d.mts').TokenBlock[]} blocks
 * @param {string} [surface]
 * @returns {Map<string, string>}
 */
export function tokenMap(blocks, surface) {
  const map = new Map();
  for (const block of blocks) {
    if (block.selector === ':root') for (const t of block.tokens) map.set(t.name, t.value);
  }
  if (surface) {
    const sel = new RegExp(`data-surface=['"]?${surface}['"]?`);
    for (const block of blocks) {
      if (sel.test(block.selector)) for (const t of block.tokens) map.set(t.name, t.value);
    }
  }
  return map;
}

/**
 * Replaces every var(--x) with its value, recursively.
 * @param {string} value
 * @param {Map<string, string>} map
 * @param {number} [depth]
 * @returns {string}
 */
export function resolveValue(value, map, depth = 0) {
  if (depth > 12) return value;
  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g, (_, name, fallback) => {
    const v = map.get(name);
    if (v === undefined) return fallback ?? `var(${name})`;
    return resolveValue(v, map, depth + 1);
  });
}

/** @param {string} value */
export function referencedToken(value) {
  const m = value.trim().match(/^var\(\s*(--[\w-]+)\s*\)$/);
  return m ? m[1] : null;
}

/**
 * Parses #rgb, #rrggbb, #rrggbbaa and rgb()/rgba() (space or comma syntax).
 * @param {string} value
 * @returns {{ r: number, g: number, b: number, a: number } | null}
 */
export function parseColor(value) {
  const v = value.trim();
  const hex = v.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    const n = (/** @type {number} */ i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  const rgb = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/i);
  if (rgb) {
    const alpha = rgb[4] === undefined ? 1 : rgb[4].endsWith('%') ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4]);
    return { r: +rgb[1], g: +rgb[2], b: +rgb[3], a: alpha };
  }
  return null;
}

/**
 * @param {{ r: number, g: number, b: number, a: number }} c
 * @param {boolean} [withAlpha]
 */
export function toHex(c, withAlpha = true) {
  const h = (/** @type {number} */ n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  const base = `#${h(c.r)}${h(c.g)}${h(c.b)}`.toUpperCase();
  return withAlpha && c.a < 1 ? base + h(c.a * 255).toUpperCase() : base;
}

/**
 * Alpha-composites fg over an opaque bg.
 * @param {{ r: number, g: number, b: number, a: number }} fg
 * @param {{ r: number, g: number, b: number, a: number }} bg
 */
export function composite(fg, bg) {
  const a = fg.a;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}

/** @param {{ r: number, g: number, b: number }} c */
export function luminance(c) {
  const f = (/** @type {number} */ v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

/**
 * WCAG 2.x contrast ratio. Translucent foregrounds are composited first.
 * @param {{ r: number, g: number, b: number, a: number }} fg
 * @param {{ r: number, g: number, b: number, a: number }} bg
 */
export function contrastRatio(fg, bg) {
  const f = fg.a < 1 ? composite(fg, bg) : fg;
  const l1 = luminance(f);
  const l2 = luminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
