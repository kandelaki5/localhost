import type { APIRoute } from 'astro';
import { iconPng, pngResponse } from '../lib/brand-png';

// 180 × 180, cream tile with the logo's 2U clear space (iOS rounds the corners).
export const GET: APIRoute = async () => pngResponse(await iconPng(180, { padding: 1 / 6, background: '--brand-cream' }));
