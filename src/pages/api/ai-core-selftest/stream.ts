// TEMPORARY self-test route for the AI core (deleted after testing).
import type { APIRoute } from 'astro';
import { guard, demoTextResponse, asText } from '../../../lib/ai/http';
import { streamClaude } from '../../../lib/ai/claude';
import { pickLocale } from '../../../lib/ai/locales';

export const prerender = false;

export const ALL: APIRoute = async (context) => {
  const g = await guard(context);
  if (!g.ok) return g.response;
  const message = asText(g.body.message, 2000);
  if (!message) return new Response(JSON.stringify({ error: { code: 'bad_request', message: 'message required' } }), { status: 400 });
  const locale = pickLocale(g.body.locale, context.request);
  if (g.mode === 'demo') return demoTextResponse(`Demo answer (${locale}): Day 1 — Tbilisi.\n\nDay 2 — Kazbegi.`, { headers: g.headers });
  return streamClaude(
    { feature: 'selftest', instructions: 'Answer briefly as the Local Host assistant.', messages: [{ role: 'user', content: message }], locale, maxTokens: 1024, effort: 'low' },
    { headers: g.headers },
  );
};
