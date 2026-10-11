import type { APIRoute } from 'astro';

/**
 * Footer guilloche (passport security engraving): two families of rotated,
 * modulated ellipses. Emitted once as a static, cacheable SVG instead of
 * ~160 KB of inline paths in every page. Footer.astro uses it as a CSS mask,
 * so its colour and opacity still come from tokens (--color-foil,
 * --opacity-guilloche). Stroke colour here is irrelevant (mask alpha only).
 */
function rosette(cx: number, cy: number, r: number, amp: number, lobes: number, phase: number) {
  const pts: string[] = [];
  for (let i = 0; i <= 720; i++) {
    const a = (i / 720) * Math.PI * 2;
    const rr = r + amp * Math.sin(lobes * a + phase);
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

const paths = [
  ...Array.from({ length: 9 }, (_, i) => rosette(180, 520, 120 + i * 34, 16 + i * 1.5, 18, i * 0.35)),
  ...Array.from({ length: 9 }, (_, i) => rosette(1300, -40, 110 + i * 36, 14 + i * 1.5, 22, i * 0.3)),
];

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice">` +
  `<g fill="none" stroke="#000" stroke-width="0.6">${paths.map((d) => `<path d="${d}"/>`).join('')}</g></svg>`;

export const GET: APIRoute = () =>
  new Response(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
