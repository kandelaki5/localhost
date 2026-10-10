/**
 * Raster versions of the logo icon (favicons, touch icon, JSON-LD logo),
 * rendered at build time from src/assets/brand/logo-icon.svg with sharp —
 * so they follow the brand file automatically.
 */
import sharp from 'sharp';
import iconSvg from '../assets/brand/logo-icon.svg?raw';
import { token } from './tokens';

interface Options {
  /** Space around the mark, as a fraction of the mark's width (logo spec: icon tiles need ≥ 2U = 1/6). */
  padding?: number;
  /** Background colour token, or null for transparent. */
  background?: string | null;
}

export async function iconPng(size: number, { padding = 0, background = null }: Options = {}): Promise<Uint8Array> {
  const mark = Math.round(size / (1 + 2 * padding));
  const offset = Math.round((size - mark) / 2);
  const density = Math.ceil((72 * mark) / 120) * 2;
  const markPng = await sharp(Buffer.from(iconSvg), { density }).resize(mark, mark).png().toBuffer();
  const bg = background ? token(background) : '#00000000';
  const out = await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: markPng, left: offset, top: offset }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  return new Uint8Array(out);
}

export function pngResponse(bytes: Uint8Array): Response {
  return new Response(bytes as Uint8Array<ArrayBuffer>, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
