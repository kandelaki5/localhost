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

/**
 * A multi-size .ico (PNG-compressed entries, supported by every browser since
 * IE Vista-era) for clients that request /favicon.ico blindly.
 */
export async function iconIco(sizes: number[] = [16, 32, 48]): Promise<Uint8Array> {
  const pngs = await Promise.all(sizes.map((s) => iconPng(s, { padding: 0.02 })));
  const header = 6 + 16 * pngs.length;
  const total = header + pngs.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, pngs.length, true);
  let offset = header;
  pngs.forEach((png, i) => {
    const e = 6 + 16 * i;
    const size = sizes[i];
    out[e] = size >= 256 ? 0 : size; // width
    out[e + 1] = size >= 256 ? 0 : size; // height
    out[e + 2] = 0; // palette
    out[e + 3] = 0; // reserved
    view.setUint16(e + 4, 1, true); // colour planes
    view.setUint16(e + 6, 32, true); // bits per pixel
    view.setUint32(e + 8, png.length, true);
    view.setUint32(e + 12, offset, true);
    out.set(png, offset);
    offset += png.length;
  });
  return out;
}

export function icoResponse(bytes: Uint8Array): Response {
  return new Response(bytes as Uint8Array<ArrayBuffer>, {
    headers: { 'Content-Type': 'image/x-icon', 'Cache-Control': 'public, max-age=86400' },
  });
}
