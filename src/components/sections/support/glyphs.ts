/**
 * Pictograms for the five commitments, drawn on the shared icon grid
 * (24 × 24, 1.5 px strokes, see src/components/ui/icons.ts) so they could
 * move into the shared set later (requested in docs/requests/support.md).
 * They sit in the centre of ink seals, so they are line drawings only.
 */
export const GLYPHS = {
  /** Local families & hosts — a house with a heart at the hearth. */
  hosts:
    '<path d="M3.25 11.5 12 4.25l8.75 7.25"/><path d="M5.75 9.6v10.15h12.5V9.6"/><path d="M15.6 6.55V3.75h2.15v4.55"/><path d="M12 17.75c-2.15-1.35-3.4-2.65-3.4-3.95a1.7 1.7 0 0 1 3.4-.5 1.7 1.7 0 0 1 3.4.5c0 1.3-1.25 2.6-3.4 3.95z"/>',
  /** Nature & protected areas — a snow-capped peak and a fir tree. */
  nature:
    '<path d="M1.75 19.75 9 6l7.25 13.75"/><path d="M6.6 10.55 8.05 11.7 9 10.4l.95 1.3 1.45-1.15"/><path d="M20 8.75 17.4 12.6h1.2l-1.85 3.65h6.5l-1.85-3.65h1.2z"/><path d="M20 16.25v3.5"/><path d="M1 19.75h22"/>',
  /** Heritage & customs — a qvevri, the Georgian clay wine jar (winemaking tradition). */
  heritage:
    '<path d="M9.25 3.75h5.5"/><path d="M9.9 3.75v1.6C6.6 6.6 4.75 9 4.75 11.6c0 3.85 3.5 7.35 7.25 9.65 3.75-2.3 7.25-5.8 7.25-9.65 0-2.6-1.85-5-5.15-6.25v-1.6"/><path d="M5.6 9.1c4.2 1.35 8.6 1.35 12.8 0"/><path d="M7.1 12.35c3.25.9 6.55.9 9.8 0"/>',
  /** Fair work — a balance. */
  work:
    '<path d="M12 5v14.25"/><path d="M8 19.25h8"/><path d="M4.5 7.25h15"/><circle cx="12" cy="4.25" r=".9"/><path d="M4.5 7.25 2.25 13.25M4.5 7.25l2.25 6"/><path d="M1.75 13.25h5.5a2.75 2.75 0 0 1-5.5 0z"/><path d="M19.5 7.25l-2.25 6M19.5 7.25l2.25 6"/><path d="M16.75 13.25h5.5a2.75 2.75 0 0 1-5.5 0z"/>',
  /** Protecting children — a child inside a shield. */
  children:
    '<path d="M12 3 19.25 5.9v5.35c0 4.6-3 7.95-7.25 9.65-4.25-1.7-7.25-5.05-7.25-9.65V5.9z"/><circle cx="12" cy="9.6" r="1.75"/><path d="M8.85 16.5c.35-2.35 1.5-3.75 3.15-3.75s2.8 1.4 3.15 3.75"/>',
} as const;

export type GlyphName = keyof typeof GLYPHS;
