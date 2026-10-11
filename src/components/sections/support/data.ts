/**
 * 10 · We Support — presentation data for the five commitments (same order as
 * `items` in src/i18n/<lang>/support.json). Copy lives in the JSON files.
 *
 * Sources: Sustainability Policy (11 Aug 2025) — Local Communities, Social
 * Policy & Human Rights, Partnerships; Sustainable Excursion and Destination
 * Policy (11 Aug 2025). No partner projects are verified yet, so none are
 * shown (docs/research/organisations-awards-hosts.md §6).
 */
import type { GlyphName } from './glyphs';

export interface CommitmentStyle {
  glyph: GlyphName;
  /** Ink + brand green only (the passport-stamp graft). */
  tone: 'ink' | 'green';
  /** Degrees; the Seal clamps to ±2. */
  rotate: number;
}

export const COMMITMENTS: readonly CommitmentStyle[] = [
  { glyph: 'hosts', tone: 'green', rotate: -1.5 },
  { glyph: 'nature', tone: 'ink', rotate: 1 },
  { glyph: 'heritage', tone: 'green', rotate: -0.5 },
  { glyph: 'work', tone: 'ink', rotate: 1.5 },
  { glyph: 'children', tone: 'green', rotate: -1 },
];
