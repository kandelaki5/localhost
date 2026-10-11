import type { APIRoute } from 'astro';
import { iconIco, icoResponse } from '../lib/brand-png';

// /favicon.ico (16, 32 and 48 px) for clients that request it blindly — older
// browsers, RSS readers, some crawlers. Pages link favicon.svg / favicon-32x32.png.
export const GET: APIRoute = async () => icoResponse(await iconIco());
