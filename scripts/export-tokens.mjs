#!/usr/bin/env node
// Export src/styles/tokens.css → design/tokens/tokens.json
//
// Format: W3C Design Tokens (DTCG: $value / $type / $description) laid out
// the way Tokens Studio for Figma expects a single-file import: one token set
// per top-level key, plus $themes and $metadata.
//
//   node scripts/export-tokens.mjs            write design/tokens/tokens.json
//   node scripts/export-tokens.mjs --check    exit 1 if the JSON is out of date
//
// tokens.css stays the source of truth. See design/tokens/README.md.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTokensCss, parseColor, toHex } from '../src/lib/css-tokens.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'src/styles/tokens.css');
const OUT = resolve(root, 'design/tokens/tokens.json');

const css = readFileSync(SRC, 'utf8');
const blocks = parseTokensCss(css);
const rootBlock = blocks.find((b) => b.selector === ':root');
if (!rootBlock) throw new Error('No :root block in tokens.css');

// ── naming: CSS custom property → token path ────────────────────────────────
const RULES = [
  [/^--brand-(.+)$/, (m) => ['brand', m[1]]],
  [/^--palette-(.+)$/, (m) => ['palette', m[1]]],
  [/^--color-(.+)$/, (m) => ['color', m[1]]],
  [/^--gradient-(.+)$/, (m) => ['gradient', m[1]]],
  [/^--font-(.+)$/, (m) => ['font', 'family', m[1]]],
  [/^--fs-scale-ka$/, () => ['font', 'scale-ka']],
  [/^--fs-(.+)$/, (m) => ['font', 'size', m[1]]],
  [/^--lh-(.+)$/, (m) => ['font', 'lineHeight', m[1]]],
  [/^--fw-(.+)$/, (m) => ['font', 'weight', m[1]]],
  [/^--tracking-(.+)$/, (m) => ['font', 'letterSpacing', m[1]]],
  [/^--case-(.+)$/, (m) => ['font', 'textCase', m[1]]],
  [/^--space-(.+)$/, (m) => ['space', m[1]]],
  [/^--layout-(.+)$/, (m) => ['layout', m[1]]],
  [/^--radius-(.+)$/, (m) => ['radius', m[1]]],
  [/^--border-(.+)$/, (m) => ['border', m[1]]],
  [/^--stamp-(.+)$/, (m) => ['stamp', m[1]]],
  [/^--opacity-(.+)$/, (m) => ['opacity', m[1]]],
  [/^--shadow-(.+)$/, (m) => ['shadow', m[1]]],
  [/^--dur-(.+)$/, (m) => ['motion', 'duration', m[1]]],
  [/^--ease-(.+)$/, (m) => ['motion', 'easing', m[1]]],
  [/^--z-(.+)$/, (m) => ['z', m[1]]],
];
// CSS-only tokens (no Figma equivalent): listed in the README.
const CSS_ONLY = [/^--texture-/, /^--fvs-/, /^--filter-/];

function pathOf(name) {
  for (const [re, fn] of RULES) {
    const m = name.match(re);
    if (m) return fn(m);
  }
  return null;
}
const ref = (name) => {
  const p = pathOf(name);
  return p ? `{${p.join('.')}}` : null;
};

// ── value conversion ────────────────────────────────────────────────────────
const px = (v) => {
  const n = parseFloat(v);
  if (/rem$/.test(v)) return `${+(n * 16).toFixed(2)}px`;
  if (/px$/.test(v) || n === 0) return `${+n.toFixed(2)}px`;
  return v;
};
const FLUID = /^clamp\(\s*([-\d.]+(?:rem|px))\s*,.*,\s*([-\d.]+(?:rem|px))\s*\)$/;

function replaceVars(value) {
  return value.replace(/var\(\s*(--[\w-]+)\s*\)/g, (_, n) => ref(n) ?? `var(${n})`);
}

function colorValue(value) {
  const r = value.trim().match(/^var\(\s*(--[\w-]+)\s*\)$/);
  if (r) return ref(r[1]);
  if (/gradient\(/.test(value)) return replaceVars(value);
  const c = parseColor(value);
  return c ? toHex(c) : value;
}

function shadowValue(value) {
  // split on commas that are not inside parentheses
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of value) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts.map((p) => {
    const inset = /\binset\b/.test(p);
    const colorMatch = p.match(/(rgba?\([^)]*\)|#[0-9a-f]{3,8})/i);
    const color = colorMatch ? toHex(parseColor(colorMatch[1])) : '#000000';
    const nums = p
      .replace(colorMatch?.[0] ?? '', '')
      .replace('inset', '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(px);
    const [x = '0px', y = '0px', blur = '0px', spread = '0px'] = nums;
    return { x, y, blur, spread, color, type: inset ? 'innerShadow' : 'dropShadow' };
  });
}

function firstFamily(value) {
  return value
    .split(',')[0]
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/ Variable$/, '');
}

/** → { core?: token, desktop?: token, mobile?: token } */
function convert(tok) {
  const { name, value, description } = tok;
  const path = pathOf(name);
  const ext = { 'ge.localhost': { css: name, cssValue: value } };
  const base = (type, v) => ({ $type: type, $value: v, ...(description ? { $description: description } : {}), $extensions: ext });
  const group = path[0];
  const sub = path[1];
  const fluid = value.match(FLUID);
  const isRef = /^var\(/.test(value.trim());

  if (fluid) {
    const type = group === 'font' ? 'fontSizes' : group === 'space' ? 'spacing' : 'dimension';
    return { desktop: base(type, px(fluid[2])), mobile: base(type, px(fluid[1])) };
  }
  switch (group) {
    case 'brand':
    case 'palette':
    case 'color':
    case 'gradient':
      return { core: base('color', colorValue(value)) };
    case 'font':
      if (sub === 'family') return { core: base('fontFamilies', isRef ? ref(value.slice(4, -1).trim()) : firstFamily(value)) };
      if (sub === 'size') return { core: base('fontSizes', px(value)) };
      if (sub === 'scale-ka') return { core: base('number', Number(value)) };
      if (sub === 'lineHeight') return { core: base('lineHeights', isRef ? ref(value.slice(4, -1).trim()) : Number(value)) };
      if (sub === 'weight') return { core: base('fontWeights', isRef ? ref(value.slice(4, -1).trim()) : Number(value)) };
      if (sub === 'letterSpacing') {
        const em = parseFloat(value);
        return { core: base('letterSpacing', `${+(em * 100).toFixed(2)}%`) };
      }
      if (sub === 'textCase') return { core: base('textCase', value) };
      break;
    case 'space':
      return { core: base('spacing', px(value)) };
    case 'layout': {
      if (/ch$/.test(value)) return { core: base('number', parseFloat(value)) };
      if (/^\d+$/.test(value)) return { core: base('number', Number(value)) };
      return { core: base('sizing', px(value)) };
    }
    case 'radius':
      return { core: base('borderRadius', /%$/.test(value) ? value : px(value)) };
    case 'border':
      return { core: base('borderWidth', px(value)) };
    case 'stamp':
      return { core: base('dimension', px(value)) };
    case 'opacity':
      return { core: base('opacity', Number(value)) };
    case 'shadow':
      return { core: base('boxShadow', shadowValue(value)) };
    case 'motion':
      return { core: base('other', value) };
    case 'z':
      return { core: base('number', Number(value)) };
  }
  return { core: base('other', value) };
}

function setIn(obj, path, token) {
  let o = obj;
  for (const key of path.slice(0, -1)) o = o[key] ??= {};
  o[path.at(-1)] = token;
}

// ── build the sets ──────────────────────────────────────────────────────────
const sets = {
  core: {},
  'surface/paper': {},
  'surface/night': {},
  'surface/forest': {},
  'viewport/desktop': {},
  'viewport/mobile': {},
};
const skipped = [];

for (const tok of rootBlock.tokens) {
  if (CSS_ONLY.some((re) => re.test(tok.name))) {
    skipped.push(tok.name);
    continue;
  }
  const path = pathOf(tok.name);
  if (!path) {
    skipped.push(tok.name);
    continue;
  }
  const out = convert(tok);
  // Colour roles live in the surface sets so Figma can switch themes.
  const coreSet = path[0] === 'color' ? 'surface/paper' : 'core';
  if (out.core) setIn(sets[coreSet], path, out.core);
  if (out.desktop) setIn(sets['viewport/desktop'], path, out.desktop);
  if (out.mobile) setIn(sets['viewport/mobile'], path, out.mobile);
}

for (const surface of ['night', 'forest']) {
  const block = blocks.find((b) => b.selector.includes(`'${surface}'`) || b.selector.includes(`"${surface}"`));
  if (!block) continue;
  // Start from paper so every role exists in every surface, then override.
  sets[`surface/${surface}`] = structuredClone(sets['surface/paper']);
  for (const tok of block.tokens) {
    const path = pathOf(tok.name);
    if (!path) continue;
    const out = convert(tok);
    if (out.core) setIn(sets[`surface/${surface}`], path, out.core);
  }
}

const themes = ['paper', 'night', 'forest'].flatMap((surface) =>
  ['desktop', 'mobile'].map((viewport) => ({
    id: `${surface}-${viewport}`,
    name: `${surface[0].toUpperCase()}${surface.slice(1)} · ${viewport}`,
    group: 'Local Host',
    selectedTokenSets: {
      core: 'source',
      [`surface/${surface}`]: 'enabled',
      [`viewport/${viewport}`]: 'enabled',
    },
  })),
);

const json = {
  ...sets,
  $themes: themes,
  $metadata: {
    tokenSetOrder: Object.keys(sets),
    source: 'src/styles/tokens.css',
    generator: 'scripts/export-tokens.mjs',
    cssOnlyTokens: skipped,
  },
};

const text = `${JSON.stringify(json, null, 2)}\n`;
if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(OUT, 'utf8');
  } catch {}
  if (current !== text) {
    console.error('design/tokens/tokens.json is out of date — run: node scripts/export-tokens.mjs');
    process.exit(1);
  }
  console.log('design/tokens/tokens.json is up to date.');
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, text);
  const count = (o) =>
    Object.values(o).reduce((n, v) => (v && typeof v === 'object' ? ('$value' in v ? n + 1 : n + count(v)) : n), 0);
  const summary = Object.entries(sets)
    .map(([k, v]) => `${k}: ${count(v)}`)
    .join(' · ');
  console.log(`Wrote design/tokens/tokens.json (${summary}). CSS-only, not exported: ${skipped.length}.`);
}
