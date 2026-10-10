// TEMPORARY self-test route for the AI core (deleted after testing).
import type { APIRoute } from 'astro';
import { knowledgeSystemPrompt, renderKnowledgeBase, researchData } from '../../../lib/ai/knowledge';
import { PLACES, MAP_VIEWBOX, project, findPlace } from '../../../lib/ai/places';
import { aiMode, model, rateLimitPerHour, dailyCap, fallbacksEnabled } from '../../../lib/ai/config';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  if (url.searchParams.has('text')) return new Response(knowledgeSystemPrompt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  const a = knowledgeSystemPrompt();
  const b = knowledgeSystemPrompt();
  return new Response(JSON.stringify({
    mode: aiMode(), model: model(), rateLimitPerHour: rateLimitPerHour(), dailyCap: dailyCap(), fallbacks: fallbacksEnabled(),
    kbChars: renderKnowledgeBase().length, systemChars: a.length, approxTokens: Math.round(a.length / 3.6), stable: a === b,
    research: Object.keys(researchData()), places: PLACES.length, viewBox: MAP_VIEWBOX,
    tbilisi: project(findPlace('tbilisi')!.lat, findPlace('tbilisi')!.lon), baku: project(40.37, 49.84), batumi: project(41.64, 41.64),
  }, null, 1), { headers: { 'Content-Type': 'application/json' } });
};
