export interface Token {
  /** Custom property name, e.g. "--color-bg". */
  name: string;
  /** Raw value as written, e.g. "var(--palette-paper-200)". */
  value: string;
  /** Trailing comment. */
  description: string;
  /** Section heading the token sits under (e.g. "Typography"). */
  group: string;
  /** 1-based line number in tokens.css. */
  line: number;
}

export interface TokenBlock {
  /** ":root" or a surface selector like "[data-surface='night']". */
  selector: string;
  tokens: Token[];
}

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseTokensCss(css: string): TokenBlock[];
export function tokenMap(blocks: TokenBlock[], surface?: string): Map<string, string>;
export function resolveValue(value: string, map: Map<string, string>, depth?: number): string;
export function referencedToken(value: string): string | null;
export function parseColor(value: string): Rgba | null;
export function toHex(c: Rgba, withAlpha?: boolean): string;
export function composite(fg: Rgba, bg: Rgba): Rgba;
export function luminance(c: { r: number; g: number; b: number }): number;
export function contrastRatio(fg: Rgba, bg: Rgba): number;
