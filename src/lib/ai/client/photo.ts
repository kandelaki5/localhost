/**
 * Photo Match — browser module + shared types (BROWSER-SAFE: no SDK, no
 * secrets). The visitor picks a photo of a place/mood they love; we downscale
 * it in the browser and POST it to /api/photo-match, which answers with three
 * South Caucasus places that offer the same feeling.
 *
 *   import { matchPhoto } from '../lib/ai/client/photo';
 *   const r = await matchPhoto(file, 'en', { signal });
 *   if (!r.ok) showError(r.error);                         // codes: see PhotoMatchErrorCode
 *   else if (r.data.status === 'not_travel') showMessage(r.data.message);
 *   else render(r.data.result);                            // mood, whatISee, matches[3], tip
 *   if (r.ok && r.data.mode === 'demo') showBadge(r.data.sample?.notice);
 *
 * Inspiration photos (src/assets/inspiration/*.jpg) are sent with their
 * `sampleId` via matchInspiration(); in demo mode the server answers those
 * with precomputed matches, and any other upload with a clearly labelled
 * generic sample.
 */
import { postAiJson } from '../client';
import type { AiMode, ExperienceId, Locale, LocalizedText, PlaceId } from '../types';
import type { PlaceInfo } from './place-info';

export type { PlaceInfo } from './place-info';

export const PHOTO_MATCH_ENDPOINT = '/api/photo-match';

/** Long edge after browser downscaling (px). The server rejects images above PHOTO_SERVER_MAX_EDGE. */
export const PHOTO_MAX_EDGE = 1280;
/** Server-side hard limit for the long edge (some slack for other clients). */
export const PHOTO_SERVER_MAX_EDGE = 1600;
/** Max decoded image size accepted by the server (bytes). */
export const PHOTO_MAX_BYTES = 1.5 * 1024 * 1024;
/** Largest original file the browser will try to decode (bytes). */
export const PHOTO_MAX_INPUT_BYTES = 40 * 1024 * 1024;
export const PHOTO_JPEG_QUALITY = 0.85;

export const PHOTO_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type PhotoMediaType = (typeof PHOTO_MEDIA_TYPES)[number];

// ---------------------------------------------------------------------------
// Inspiration (sample) photos — files + credits in src/assets/inspiration/
// ---------------------------------------------------------------------------

export const INSPIRATION_IDS = ['tuscany-vineyard', 'dolomites-valley', 'cappadocia-valley'] as const;
export type InspirationId = (typeof INSPIRATION_IDS)[number];

export function isInspirationId(value: unknown): value is InspirationId {
  return typeof value === 'string' && (INSPIRATION_IDS as readonly string[]).includes(value);
}

/** Short card labels for the sample photos (drafted — native review pending). */
export const INSPIRATION_LABELS: Readonly<Record<InspirationId, LocalizedText>> = {
  'tuscany-vineyard': {
    en: 'Vineyards in Tuscany',
    ka: 'ვენახები ტოსკანაში',
    pl: 'Winnice w Toskanii',
    it: 'Vigneti in Toscana',
    de: 'Weinberge in der Toskana',
  },
  'dolomites-valley': {
    en: 'A valley in the Dolomites',
    ka: 'ხეობა დოლომიტებში',
    pl: 'Dolina w Dolomitach',
    it: 'Una valle nelle Dolomiti',
    de: 'Ein Tal in den Dolomiten',
  },
  'cappadocia-valley': {
    en: 'Göreme Valley, Cappadocia',
    ka: 'გიორემეს ხეობა, კაპადოკია',
    pl: 'Dolina Göreme, Kapadocja',
    it: 'Valle di Göreme, Cappadocia',
    de: 'Göreme-Tal, Kappadokien',
  },
};

/** Image file name in src/assets/inspiration/ for each sample. */
export const INSPIRATION_FILES: Readonly<Record<InspirationId, string>> = {
  'tuscany-vineyard': 'tuscany-vineyard.jpg',
  'dolomites-valley': 'dolomites-valley.jpg',
  'cappadocia-valley': 'cappadocia-valley.jpg',
};

// ---------------------------------------------------------------------------
// Wire types (shared with the API route and the fixtures)
// ---------------------------------------------------------------------------

/** Request body of POST /api/photo-match. */
export interface PhotoMatchRequest {
  locale: Locale;
  /** Required in live mode. Downscaled to ≤1280 px, ≤1.5 MB decoded. */
  image?: { mediaType: PhotoMediaType; data: string };
  /** Set when the image is one of the inspiration photos (demo mode answers with its precomputed match). */
  sampleId?: InspirationId;
}

/** Exactly what Claude returns (structured output) — also the fixture format. */
export interface PhotoModelOutput {
  /** false → no landscape / travel scene (screenshot, document, close-up portrait, unsafe…). */
  suitable: boolean;
  /** Friendly explanation when !suitable, else "". */
  message: string;
  whatISee: string;
  mood: string;
  matches: PhotoModelMatch[];
  tip: string;
}

export interface PhotoModelMatch {
  placeId: PlaceId;
  experienceId: ExperienceId;
  title: string;
  why: string;
}

export interface PhotoMatchItem extends PhotoModelMatch {
  /** Localised place details for cards and the map. */
  place: PlaceInfo;
  /** Localised experience name, e.g. "Wine" / "Wino". */
  experienceName: string;
}

export interface PhotoMatchResult {
  /** A few words, e.g. "Golden, slow and sun-warmed". */
  mood: string;
  /** One or two sentences describing the photo. */
  whatISee: string;
  /** Three places (fewer only if the model returned fewer valid ones). */
  matches: PhotoMatchItem[];
  tip: string;
}

/** 200 response of POST /api/photo-match (same shape in live and demo mode). */
export interface PhotoMatchResponse {
  mode: AiMode;
  locale: Locale;
  /** "not_travel": the photo shows no landscape/travel scene — show `message`, no result. */
  status: 'matched' | 'not_travel';
  result: PhotoMatchResult | null;
  /** Friendly message for status "not_travel" (in the requested language), else null. */
  message: string | null;
  /** Demo mode only: which sample answered, and a label to show ("Demo — sample answer…"). */
  sample: { id: InspirationId | null; generic: boolean; notice: string } | null;
}

// ---------------------------------------------------------------------------
// Browser: downscale + encode
// ---------------------------------------------------------------------------

export interface PreparedImage {
  mediaType: 'image/jpeg';
  /** Base64 without the data: prefix. */
  data: string;
  width: number;
  height: number;
  /** Decoded JPEG size in bytes. */
  bytes: number;
}

export type PhotoPrepareErrorCode = 'not_an_image' | 'file_too_large' | 'decode_failed' | 'encode_failed';

export class PhotoPrepareError extends Error {
  readonly code: PhotoPrepareErrorCode;
  constructor(code: PhotoPrepareErrorCode, message: string) {
    super(message);
    this.name = 'PhotoPrepareError';
    this.code = code;
  }
}

type Drawable = ImageBitmap | HTMLImageElement;

async function decodeImage(file: Blob): Promise<{ source: Drawable; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      /* fall back to <img> (e.g. formats only the <img> decoder supports) */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => undefined };
  } catch {
    throw new PhotoPrepareError('decode_failed', 'This file could not be read as an image.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new PhotoPrepareError('encode_failed', 'Canvas is not available in this browser.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return ctx;
}

/** Draws `source` at width×height, halving step by step for big reductions (sharper than one jump). */
function resample(source: Drawable, srcW: number, srcH: number, width: number, height: number): HTMLCanvasElement {
  let current: CanvasImageSource = source;
  let w = srcW;
  let h = srcH;
  while (w / 2 >= width && h / 2 >= height) {
    const nw = Math.round(w / 2);
    const nh = Math.round(h / 2);
    const step = makeCanvas(nw, nh);
    context2d(step).drawImage(current, 0, 0, nw, nh);
    current = step;
    w = nw;
    h = nh;
  }
  const out = makeCanvas(width, height);
  const ctx = context2d(out);
  ctx.fillStyle = '#ffffff'; // transparent PNG/WebP → white, not black, in JPEG
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(current, 0, 0, width, height);
  return out;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new PhotoPrepareError('encode_failed', 'Could not encode the image.'))),
      'image/jpeg',
      quality,
    );
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Downscales an image File/Blob to a JPEG with the long edge ≤ maxEdge
 * (default 1280 px, quality 0.85), honouring EXIF orientation, and returns it
 * as base64. Lowers quality/size further if the result exceeds 1.5 MB.
 * Throws PhotoPrepareError (codes: not_an_image, file_too_large, decode_failed, encode_failed).
 */
export async function prepareImage(
  file: Blob,
  options: { maxEdge?: number; quality?: number } = {},
): Promise<PreparedImage> {
  if (file.type && !file.type.startsWith('image/')) {
    throw new PhotoPrepareError('not_an_image', 'Please choose an image file (JPEG, PNG or WebP).');
  }
  if (file.size > PHOTO_MAX_INPUT_BYTES) {
    throw new PhotoPrepareError('file_too_large', 'This file is too large. Please choose a smaller photo.');
  }
  const decoded = await decodeImage(file);
  try {
    if (!decoded.width || !decoded.height) throw new PhotoPrepareError('decode_failed', 'This image has no size.');
    let maxEdge = Math.min(options.maxEdge ?? PHOTO_MAX_EDGE, PHOTO_SERVER_MAX_EDGE);
    for (let attempt = 0; attempt < 4; attempt++) {
      const scale = Math.min(1, maxEdge / Math.max(decoded.width, decoded.height));
      const width = Math.max(1, Math.round(decoded.width * scale));
      const height = Math.max(1, Math.round(decoded.height * scale));
      const canvas = resample(decoded.source, decoded.width, decoded.height, width, height);
      for (const quality of [options.quality ?? PHOTO_JPEG_QUALITY, 0.75, 0.65]) {
        const blob = await canvasToJpeg(canvas, quality);
        if (blob.size <= PHOTO_MAX_BYTES) {
          return { mediaType: 'image/jpeg', data: await blobToBase64(blob), width, height, bytes: blob.size };
        }
      }
      maxEdge = Math.round(maxEdge * 0.8);
    }
    throw new PhotoPrepareError('file_too_large', 'Could not make this image small enough.');
  } finally {
    decoded.close();
  }
}

// ---------------------------------------------------------------------------
// Browser: call the endpoint
// ---------------------------------------------------------------------------

/**
 * Error codes: PhotoPrepareErrorCode (browser side) or a server/API code —
 * "bad_request", "payload_too_large", "rate_limited", "daily_cap", "refusal"
 * (Claude declined the image — treat like not_travel with a polite message),
 * "truncated", "upstream_*", "network", "aborted", "invalid_response".
 */
export type PhotoMatchErrorCode = PhotoPrepareErrorCode | string;

export type PhotoMatchOutcome =
  | {
      ok: true;
      mode: AiMode;
      data: PhotoMatchResponse;
      /** What was actually sent (after downscaling). */
      image: { width: number; height: number; bytes: number };
    }
  | {
      ok: false;
      mode: AiMode | null;
      status: number;
      error: PhotoMatchErrorCode;
      /** Server message (English) when available; prefer your own localised copy per code. */
      message?: string;
      retryAfter?: number;
      aborted: boolean;
    };

export interface MatchPhotoOptions {
  signal?: AbortSignal;
  /** Mark the image as one of the inspiration photos. */
  sampleId?: InspirationId;
  /** Override the endpoint (tests). */
  endpoint?: string;
  maxEdge?: number;
}

/** Downscales `file` in the browser and asks /api/photo-match for three matching places. */
export async function matchPhoto(file: Blob, locale: Locale, options: MatchPhotoOptions = {}): Promise<PhotoMatchOutcome> {
  let image: PreparedImage;
  try {
    image = await prepareImage(file, options.maxEdge !== undefined ? { maxEdge: options.maxEdge } : {});
  } catch (err) {
    const code: PhotoPrepareErrorCode = err instanceof PhotoPrepareError ? err.code : 'decode_failed';
    return { ok: false, mode: null, status: 0, error: code, message: err instanceof Error ? err.message : String(err), aborted: false };
  }
  if (options.signal?.aborted) return { ok: false, mode: null, status: 0, error: 'aborted', aborted: true };

  const body: PhotoMatchRequest = {
    locale,
    image: { mediaType: image.mediaType, data: image.data },
    ...(options.sampleId ? { sampleId: options.sampleId } : {}),
  };
  const r = await postAiJson<PhotoMatchResponse>(
    options.endpoint ?? PHOTO_MATCH_ENDPOINT,
    body,
    options.signal ? { signal: options.signal } : {},
  );
  if (!r.ok) {
    return {
      ok: false,
      mode: r.status === 0 ? null : r.mode,
      status: r.status,
      error: r.error,
      aborted: r.aborted,
      ...(r.message ? { message: r.message } : {}),
      ...(r.retryAfter !== undefined ? { retryAfter: r.retryAfter } : {}),
    };
  }
  if (!r.data || (r.data.status !== 'matched' && r.data.status !== 'not_travel')) {
    return { ok: false, mode: r.mode, status: r.status, error: 'invalid_response', aborted: false };
  }
  return { ok: true, mode: r.data.mode ?? r.mode, data: r.data, image: { width: image.width, height: image.height, bytes: image.bytes } };
}

/**
 * Runs Photo Match on one of the inspiration photos. `imageUrl` is the built
 * URL of the sample image (e.g. from astro:assets `getImage()` / `<Image>`).
 */
export async function matchInspiration(
  id: InspirationId,
  imageUrl: string,
  locale: Locale,
  options: Omit<MatchPhotoOptions, 'sampleId'> = {},
): Promise<PhotoMatchOutcome> {
  let blob: Blob;
  try {
    const response = await fetch(imageUrl, options.signal ? { signal: options.signal } : {});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    blob = await response.blob();
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    return { ok: false, mode: null, status: 0, error: aborted ? 'aborted' : 'network', aborted };
  }
  return matchPhoto(blob, locale, { ...options, sampleId: id });
}
