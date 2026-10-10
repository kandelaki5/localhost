// TEMPORARY self-test route for the AI core (deleted after testing).
import type { APIRoute } from 'astro';
import { guard, json, asText } from '../../../lib/ai/http';
import { runStructured, structuredErrorResponse } from '../../../lib/ai/claude';
import { PLACE_IDS } from '../../../lib/ai/types';

export const prerender = false;

const schema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short title' },
    days: { type: 'array', items: { type: 'object', properties: { day: { type: 'integer' }, place: { type: 'string', enum: [...PLACE_IDS] } } } },
  },
};

export const POST: APIRoute = async (context) => {
  const g = await guard(context);
  if (!g.ok) return g.response;
  const message = asText(g.body.message, 2000) ?? 'plan';
  if (g.mode === 'demo') return json({ result: { title: 'Demo', days: [{ day: 1, place: 'tbilisi' }] } }, { mode: 'demo', headers: g.headers });
  const r = await runStructured<{ title: string; days: { day: number; place: string }[] }>({
    feature: 'selftest-json', instructions: 'Return a tiny plan as JSON.', messages: [{ role: 'user', content: message }], maxTokens: 2000, effort: 'medium', schema,
  });
  if (!r.ok) return structuredErrorResponse(r, g.headers);
  return json({ result: r.data }, { mode: 'live', headers: g.headers });
};
