/**
 * Build-time access to the design tokens in src/styles/tokens.css, so values
 * that must be literal in HTML (theme-color, the styleguide's contrast table)
 * still come from the one token file.
 */
import css from '../styles/tokens.css?raw';
import {
  contrastRatio,
  parseColor,
  parseTokensCss,
  resolveValue,
  tokenMap,
  type Rgba,
  type TokenBlock,
} from './css-tokens.mjs';

export type Surface = 'paper' | 'night' | 'forest';

export const TOKEN_BLOCKS: TokenBlock[] = parseTokensCss(css);

const maps = new Map<Surface, Map<string, string>>();
function mapFor(surface: Surface): Map<string, string> {
  let m = maps.get(surface);
  if (!m) {
    m = tokenMap(TOKEN_BLOCKS, surface === 'paper' ? undefined : surface);
    maps.set(surface, m);
  }
  return m;
}

/** Resolved value of a token: token('--color-bg') → "#F4EEE3". */
export function token(name: string, surface: Surface = 'paper'): string {
  return resolveValue(`var(${name})`, mapFor(surface));
}

export function tokenColor(name: string, surface: Surface = 'paper'): Rgba | null {
  return parseColor(token(name, surface));
}

/** Contrast of two colour tokens on a surface (foreground composited over background). */
export function tokenContrast(fg: string, bg: string, surface: Surface = 'paper'): number | null {
  const f = tokenColor(fg, surface);
  const b = tokenColor(bg, surface);
  if (!f || !b) return null;
  return contrastRatio(f, b);
}

export function rootTokens() {
  return TOKEN_BLOCKS.find((b) => b.selector === ':root')?.tokens ?? [];
}

export function surfaceTokens(surface: Exclude<Surface, 'paper'>) {
  return TOKEN_BLOCKS.find((b) => b.selector.includes(surface))?.tokens ?? [];
}
