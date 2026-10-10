import type { APIRoute } from 'astro';
import { iconPng, pngResponse } from '../../lib/brand-png';

// Square logo for structured data (Google wants ≥ 112 px, legible on white).
export const GET: APIRoute = async () => pngResponse(await iconPng(512, { padding: 1 / 6, background: '--brand-cream' }));
