import type { APIRoute } from 'astro';
import { iconPng, pngResponse } from '../lib/brand-png';

// 32 × 32 transparent favicon for browsers without SVG favicon support.
export const GET: APIRoute = async () => pngResponse(await iconPng(32, { padding: 0.02 }));
