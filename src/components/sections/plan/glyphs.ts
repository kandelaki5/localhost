/**
 * Small line glyphs for the Plan section's experience stamps and itinerary
 * (24 × 24 grid, drawn to match ui/icons.ts: 1.5 px strokes, square caps).
 * Decorative only — every glyph sits next to a visible label.
 * Request filed in docs/requests/plan.md to move them into ui/icons.ts.
 */
import type { ExperienceId } from '../../../lib/ai/types';

export const EXPERIENCE_GLYPHS: Readonly<Record<ExperienceId, string>> = {
  // Old-town house with a carved wooden balcony.
  culture:
    '<path d="M2.75 9.5 12 4.25l9.25 5.25"/><path d="M4.5 9.5v10.25h15V9.5"/><path d="M4.5 13.75h15"/><path d="M8 13.75v6M12 13.75v6M16 13.75v6"/>',
  // A qvevri, half buried in the ground.
  wine:
    '<path d="M9.5 3.75h5"/><path d="M10.25 3.75v1.6C7.3 6.7 5.75 9.3 5.75 12.2c0 3.6 2.7 6.6 6.25 8.05 3.55-1.45 6.25-4.45 6.25-8.05 0-2.9-1.55-5.5-4.5-6.85v-1.6"/><path d="M2.75 14.25h4.1M17.15 14.25h4.1"/>',
  // Two peaks with a snow line.
  trekking:
    '<path d="M2.5 19.75 9.25 8.5l3.6 5.9 2.4-3.4 6.25 8.75z"/><path d="M7.35 11.7 9.25 13l1.85-1.45"/>',
  // A khinkali: round belly, pleats gathered into a knot.
  gastronomy:
    '<path d="M4.25 15.9c0 2.6 3.5 3.85 7.75 3.85s7.75-1.25 7.75-3.85c0-3.8-3.4-6.9-7.75-8.5-4.35 1.6-7.75 4.7-7.75 8.5z"/><path d="M10.6 7.6 12 4.25l1.4 3.35"/><path d="M12 7.4 8.6 12.6M12 7.4v5.6M12 7.4l3.4 5.2"/>',
  // A Georgian church: cross, conical dome, drum and nave.
  pilgrim:
    '<path d="M12 2.75v3M10.75 3.9h2.5"/><path d="M9.25 10.25 12 5.75l2.75 4.5"/><path d="M9.25 10.25h5.5v3.25h-5.5z"/><path d="M4.25 20.25v-5.25l2.75-1.5h10l2.75 1.5v5.25z"/><path d="M10.5 20.25v-2.5a1.5 1.5 0 0 1 3 0v2.5"/>',
  // The sun setting over the sea.
  leisure:
    '<path d="M7 13.25a5 5 0 0 1 10 0"/><path d="M12 4.5v2.25M5.6 7.1l1.6 1.6M18.4 7.1l-1.6 1.6M2.75 13.25h18.5"/><path d="M3.25 17.25c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/><path d="M6.25 20.25c1.25 0 1.25-.75 2.5-.75s1.25.75 2.5.75 1.25-.75 2.5-.75 1.25.75 2.5.75"/>',
};

/** Crescent moon for the "Overnight" line. */
export const MOON_GLYPH = '<path d="M14.75 4.25a7.75 7.75 0 1 0 5 13.6 6.25 6.25 0 0 1-5-13.6z"/>';
