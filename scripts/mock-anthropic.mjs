#!/usr/bin/env node
/**
 * Local fake of the Anthropic Messages API — for testing the AI layer's LIVE
 * code paths without a key or network. Dependency-free (node:http).
 *
 *   node scripts/mock-anthropic.mjs --port 4499 [--delay 8] [--quiet]
 *   ANTHROPIC_API_KEY=test ANTHROPIC_BASE_URL=http://127.0.0.1:4499 npx astro dev --port 4400
 *
 * Endpoints: POST /v1/messages (also ?beta=true, as the SDK's beta client sends),
 *            POST /v1/messages/count_tokens, GET /health, GET /_mock/stats.
 *
 * Validates each request like the real API would for claude-opus-5-5 and
 * answers 400 for: missing model / max_tokens, empty messages, thinking
 * "enabled"/"disabled"/budget_tokens, assistant prefill (last message from the
 * assistant), temperature ≠ 1, forced tool_choice, bad effort, > 4
 * cache_control breakpoints, `fallbacks` without the matching beta header.
 * Warns (log only) when no cache_control is set or effort is omitted.
 *
 * Responses:
 *  - stream:true → full SSE sequence (message_start, thinking block, text
 *    block deltas, content_block_stop, message_delta with stop_reason + usage,
 *    message_stop); otherwise one JSON Message.
 *  - output_config.format json_schema → a minimal JSON object generated from
 *    the schema (all required fields present, enums honoured).
 *  - any document block with citations.enabled → a cited text block with a
 *    char_location citation (citations_delta when streaming).
 *  - simulated prompt caching: identical system prefixes up to a breakpoint
 *    report cache_read_input_tokens on the next request (5-minute TTL).
 *
 * Canned text: env MOCK_TEXT (or a default). Scenarios — env MOCK_SCENARIO or
 * the token "[[mock:<scenario>]]" anywhere in the request's user messages:
 *   ok | refusal | refusal-midstream | max_tokens | fallback | midstream-error |
 *   error-400 | error-401 | error-429 | error-500 | error-529 | slow
 */
import http from 'node:http';
import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// CLI / env
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i !== -1 && args[i + 1] !== undefined) return args[i + 1];
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : fallback;
};
const PORT = Number(argValue('port', process.env.MOCK_PORT ?? '4499'));
const HOST = argValue('host', '127.0.0.1');
const DELAY_MS = Number(argValue('delay', process.env.MOCK_DELAY_MS ?? '8'));
const QUIET = args.includes('--quiet');
const DEFAULT_SCENARIO = process.env.MOCK_SCENARIO ?? 'ok';

const DEFAULT_TEXT = [
  'Mock answer from the local Claude stub (scripts/mock-anthropic.mjs).',
  '',
  '**Day 1 — Tbilisi.** Arrival, a walk through the old town and the sulphur-bath district, dinner with a supra.',
  '',
  '**Day 2 — Mtskheta and Kazbegi.** Svetitskhoveli and Jvari, then the Georgian Military Road to Stepantsminda.',
  '',
  'The Local Host team will confirm every detail — write to info@localhost.ge.',
].join('\n');
const CANNED_TEXT = process.env.MOCK_TEXT ?? DEFAULT_TEXT;

const SCENARIOS = new Set([
  'ok', 'refusal', 'refusal-midstream', 'max_tokens', 'fallback', 'midstream-error',
  'error-400', 'error-401', 'error-429', 'error-500', 'error-529', 'slow',
]);

const VALID_EFFORT = new Set(['low', 'medium', 'high', 'xhigh', 'max']);
const FALLBACK_DEFAULT_BETA = 'server-side-fallback-2026-07-01';
const FALLBACK_ARRAY_BETA = 'server-side-fallback-2026-06-01';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let requestCounter = 0;
const stats = { requests: 0, ok: 0, rejected: 0, warnings: 0, cacheReads: 0, cacheWrites: 0, lastRequest: null };
const cache = new Map(); // prefix hash → expiry ms
const CACHE_TTL_MS = 5 * 60 * 1000;

const log = (...parts) => {
  if (!QUIET) console.log(`[mock-anthropic ${new Date().toISOString().slice(11, 19)}]`, ...parts);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tokensOf = (text) => Math.max(1, Math.ceil(String(text ?? '').length / 4));

function sendJson(res, status, body, headers = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(data),
    'request-id': headers['request-id'] ?? `req_mock_${requestCounter}`,
    ...headers,
  });
  res.end(data);
}

function apiError(res, status, type, message, headers = {}) {
  sendJson(res, status, { type: 'error', error: { type, message }, request_id: `req_mock_${requestCounter}` }, headers);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function blocksOf(content) {
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  return Array.isArray(content) ? content : [];
}

function textOfBlocks(blocks) {
  return blocks
    .map((b) => {
      if (!b || typeof b !== 'object') return '';
      if (b.type === 'text') return b.text ?? '';
      if (b.type === 'document' && b.source?.type === 'text') return b.source.data ?? '';
      if (b.type === 'tool_result') return typeof b.content === 'string' ? b.content : textOfBlocks(blocksOf(b.content));
      return '';
    })
    .join('\n');
}

/** Counts cache_control markers anywhere in the request (top-level, tools, system, messages). */
function countBreakpoints(body) {
  let count = body.cache_control ? 1 : 0;
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    if (node.cache_control) count += 1;
    for (const [k, v] of Object.entries(node)) if (k !== 'cache_control' && typeof v === 'object') visit(v);
  };
  visit(body.tools);
  if (Array.isArray(body.system)) visit(body.system);
  visit(body.messages);
  return count;
}

function scenarioFor(body) {
  const userText = (body.messages ?? [])
    .filter((m) => m?.role === 'user')
    .map((m) => textOfBlocks(blocksOf(m.content)))
    .join('\n');
  const match = /\[\[mock:([a-z0-9_-]+)\]\]/i.exec(userText);
  const scenario = (match?.[1] ?? DEFAULT_SCENARIO).toLowerCase();
  return SCENARIOS.has(scenario) ? scenario : 'ok';
}

// ---------------------------------------------------------------------------
// Validation (mirrors the real API's 400s for claude-opus-5-5)
// ---------------------------------------------------------------------------

function validate(body, betas) {
  const errors = [];
  const warnings = [];
  if (typeof body.model !== 'string' || !body.model) errors.push('model: Field required');
  if (!Number.isInteger(body.max_tokens) || body.max_tokens < 1) errors.push('max_tokens: Field required (positive integer)');
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    errors.push('messages: at least one message is required');
  } else {
    if (body.messages[0]?.role !== 'user') errors.push('messages: first message must use the "user" role');
    const last = body.messages[body.messages.length - 1];
    if (last?.role === 'assistant') {
      errors.push('This model does not support assistant message prefill. The conversation must end with a user message.');
    }
    for (const [i, m] of body.messages.entries()) {
      if (!['user', 'assistant', 'system'].includes(m?.role)) errors.push(`messages.${i}.role: invalid role`);
      if (m?.content === undefined || m?.content === '' || (Array.isArray(m?.content) && m.content.length === 0)) {
        errors.push(`messages.${i}: content must be non-empty`);
      }
    }
  }
  const thinking = body.thinking;
  if (thinking) {
    if (thinking.type === 'disabled') {
      errors.push('"thinking.type.disabled" is not supported for this model. Use "thinking.type.adaptive" and "output_config.effort" to control thinking behavior.');
    } else if (thinking.type === 'enabled' || thinking.budget_tokens !== undefined) {
      errors.push('"thinking.type.enabled" is not supported for this model. Use "thinking.type.adaptive" and "output_config.effort" to control thinking behavior.');
    } else if (thinking.type !== 'adaptive') {
      errors.push(`thinking.type: unknown value ${JSON.stringify(thinking.type)}`);
    }
  }
  if (body.temperature !== undefined && body.temperature !== 1) errors.push('temperature: not supported for this model (only 1.0 is accepted)');
  if (body.top_p !== undefined || body.top_k !== undefined) warnings.push('top_p/top_k are not supported on recent models');
  if (body.tool_choice && ['any', 'tool'].includes(body.tool_choice.type)) {
    errors.push('tool_choice: type "tool" and "any" are not supported for this model.');
  }
  const effort = body.output_config?.effort;
  if (effort !== undefined && effort !== null && !VALID_EFFORT.has(effort)) errors.push(`output_config.effort: invalid value ${JSON.stringify(effort)}`);
  if (effort === undefined || effort === null) warnings.push('output_config.effort not set (defaults to "medium" on claude-opus-5-5) — set it explicitly');
  const format = body.output_config?.format;
  if (format && (format.type !== 'json_schema' || typeof format.schema !== 'object')) errors.push('output_config.format: expected {type:"json_schema", schema:{...}}');
  if (body.fallbacks !== undefined && body.fallbacks !== null) {
    if (body.fallbacks === 'default') {
      if (!betas.includes(FALLBACK_DEFAULT_BETA)) errors.push(`fallbacks: "default" requires the anthropic-beta header ${FALLBACK_DEFAULT_BETA}`);
    } else if (Array.isArray(body.fallbacks)) {
      if (!betas.includes(FALLBACK_ARRAY_BETA)) errors.push(`fallbacks: the array form requires the anthropic-beta header ${FALLBACK_ARRAY_BETA}`);
    } else {
      errors.push('fallbacks: expected "default" or an array');
    }
  }
  const breakpoints = countBreakpoints(body);
  if (breakpoints > 4) errors.push(`A maximum of 4 blocks with cache_control may be provided. Found ${breakpoints}.`);
  if (breakpoints === 0) warnings.push('no cache_control anywhere — the stable system prompt will not be prompt-cached');
  if (typeof body.system === 'string' && body.system.length > 2000) warnings.push('system is a plain string — use text blocks with cache_control to cache it');
  return { errors, warnings, breakpoints };
}

// ---------------------------------------------------------------------------
// Prompt-cache simulation
// ---------------------------------------------------------------------------

function simulateUsage(body, outputText) {
  const now = Date.now();
  for (const [k, exp] of cache) if (exp < now) cache.delete(k);

  const systemBlocks = Array.isArray(body.system) ? body.system : body.system ? [{ type: 'text', text: body.system }] : [];
  const prefixParts = [body.model ?? '', JSON.stringify(body.tools ?? []), JSON.stringify(body.output_config?.effort ?? '')];
  let prefixTokens = tokensOf(JSON.stringify(body.tools ?? []));
  const breakpoints = []; // { hash, tokens }
  for (const block of systemBlocks) {
    prefixParts.push(block.text ?? '');
    prefixTokens += tokensOf(block.text);
    if (block.cache_control) {
      breakpoints.push({ hash: createHash('sha256').update(prefixParts.join('\u0000')).digest('hex'), tokens: prefixTokens });
    }
  }
  const messagesTokens = tokensOf(JSON.stringify(body.messages ?? []));
  const total = prefixTokens + messagesTokens;

  let read = 0;
  for (const bp of breakpoints) if (cache.has(bp.hash)) read = Math.max(read, bp.tokens);
  const lastBp = breakpoints[breakpoints.length - 1];
  const written = lastBp && lastBp.tokens > read ? lastBp.tokens - read : 0;
  for (const bp of breakpoints) cache.set(bp.hash, now + CACHE_TTL_MS);
  if (read) stats.cacheReads += 1;
  if (written) stats.cacheWrites += 1;

  return {
    input_tokens: Math.max(1, total - read - written),
    cache_creation_input_tokens: written,
    cache_read_input_tokens: read,
    output_tokens: tokensOf(outputText) + 12,
  };
}

// ---------------------------------------------------------------------------
// Structured output: minimal JSON from a schema
// ---------------------------------------------------------------------------

function fromSchema(schema, root = schema, key = 'value', depth = 0) {
  if (!schema || typeof schema !== 'object' || depth > 12) return null;
  if (schema.$ref) {
    const path = String(schema.$ref).replace(/^#\//, '').split('/');
    let target = root;
    for (const p of path) target = target?.[p];
    return fromSchema(target, root, key, depth + 1);
  }
  if ('const' in schema) return schema.const;
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
  const variants = schema.anyOf ?? schema.oneOf;
  if (Array.isArray(variants) && variants.length) {
    const nonNull = variants.find((v) => v?.type !== 'null') ?? variants[0];
    return fromSchema(nonNull, root, key, depth + 1);
  }
  if (Array.isArray(schema.allOf) && schema.allOf.length) {
    return Object.assign({}, ...schema.allOf.map((s) => fromSchema(s, root, key, depth + 1)));
  }
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== 'null') ?? 'null' : schema.type;
  switch (type) {
    case 'object': {
      const out = {};
      const props = schema.properties ?? {};
      const required = Array.isArray(schema.required) ? schema.required : [];
      for (const name of required) out[name] = fromSchema(props[name] ?? { type: 'string' }, root, name, depth + 1);
      return out;
    }
    case 'array': {
      const n = Math.max(Number(schema.minItems ?? 0), 1);
      return Array.from({ length: n }, () => fromSchema(schema.items ?? { type: 'string' }, root, key, depth + 1));
    }
    case 'string':
      switch (schema.format) {
        case 'date': return '2026-05-01';
        case 'date-time': return '2026-05-01T09:00:00Z';
        case 'time': return '09:00:00';
        case 'email': return 'info@example.com';
        case 'uri': return 'https://example.com/';
        case 'uuid': return '00000000-0000-4000-8000-000000000000';
        default: return `mock ${key}`;
      }
    case 'integer':
      return Number.isInteger(schema.minimum) ? schema.minimum : 1;
    case 'number':
      return typeof schema.minimum === 'number' ? schema.minimum : 1;
    case 'boolean':
      return true;
    case 'null':
      return null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Response content
// ---------------------------------------------------------------------------

function citedDocuments(body) {
  const docs = [];
  for (const m of body.messages ?? []) {
    if (m?.role !== 'user') continue;
    for (const b of blocksOf(m.content)) if (b?.type === 'document') docs.push(b);
  }
  return docs.map((doc, index) => ({ doc, index })).filter(({ doc }) => doc.citations?.enabled === true);
}

/** Builds the response content blocks (thinking + text, maybe fallback / citations). */
function buildContent(body, scenario) {
  const format = body.output_config?.format;
  const content = [{ type: 'thinking', thinking: '', signature: 'mock-signature' }];
  if (scenario === 'fallback') {
    content.unshift({
      type: 'fallback',
      from: { model: body.model },
      to: { model: 'claude-opus-5' },
      trigger: { type: 'refusal', category: null },
    });
  }
  if (format?.type === 'json_schema') {
    content.push({ type: 'text', text: JSON.stringify(fromSchema(format.schema)), citations: null });
    return content;
  }
  const cited = citedDocuments(body);
  if (cited.length) {
    const { doc, index } = cited[0];
    const data = doc.source?.type === 'text' ? String(doc.source.data ?? '') : '';
    const sentence = (data.match(/^[\s\S]*?[.!?](\s|$)/)?.[0] ?? data).trim().slice(0, 160) || 'cited passage';
    const start = Math.max(0, data.indexOf(sentence));
    content.push({ type: 'text', text: 'According to the provided document: ', citations: null });
    content.push({
      type: 'text',
      text: sentence,
      citations: [{
        type: 'char_location',
        cited_text: sentence,
        document_index: index,
        document_title: doc.title ?? null,
        start_char_index: start,
        end_char_index: start + sentence.length,
        file_id: null,
      }],
    });
    content.push({ type: 'text', text: `\n\n${CANNED_TEXT}`, citations: null });
    return content;
  }
  content.push({ type: 'text', text: CANNED_TEXT, citations: null });
  return content;
}

function stopFor(scenario) {
  if (scenario === 'refusal' || scenario === 'refusal-midstream') return 'refusal';
  if (scenario === 'max_tokens') return 'max_tokens';
  return 'end_turn';
}

function refusalDetails() {
  return { type: 'refusal', category: null, explanation: null, fallback_credit_token: null };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function messageEnvelope(id, model) {
  return {
    id,
    type: 'message',
    role: 'assistant',
    model,
    content: [],
    stop_reason: null,
    stop_sequence: null,
    stop_details: null,
    container: null,
    context_management: null,
  };
}

function cutText(text, ratio) {
  return text.slice(0, Math.max(1, Math.floor(text.length * ratio)));
}

async function respondJson(res, body, scenario, id) {
  let content = buildContent(body, scenario);
  const stop = stopFor(scenario);
  if (scenario === 'refusal') content = [];
  if (scenario === 'refusal-midstream') content = []; // non-streaming omits a declined partial
  if (scenario === 'max_tokens') {
    content = content.map((b) => (b.type === 'text' ? { ...b, text: cutText(b.text, 0.4) } : b));
  }
  const outText = content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const usage = simulateUsage(body, outText);
  const fallbackModel = content.find((b) => b.type === 'fallback')?.to.model;
  const message = {
    ...messageEnvelope(id, fallbackModel ?? body.model),
    content,
    stop_reason: stop,
    stop_details: stop === 'refusal' ? refusalDetails() : null,
    usage: {
      ...usage,
      ...(fallbackModel
        ? { iterations: [{ type: 'fallback_message', model: fallbackModel, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, cache_creation: null }] }
        : {}),
    },
  };
  sendJson(res, 200, message, { 'request-id': id.replace('msg_', 'req_') });
  return usage;
}

async function respondStream(res, body, scenario, id, req) {
  let closed = false;
  req.on('close', () => { closed = true; });
  res.on('close', () => { closed = true; });
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
    'request-id': id.replace('msg_', 'req_'),
  });
  const send = (event, data) => {
    if (closed) return false;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    return true;
  };
  const delay = scenario === 'slow' ? 200 : DELAY_MS;

  const content = buildContent(body, scenario);
  const fallbackModel = content.find((b) => b.type === 'fallback')?.to.model;
  const stop = stopFor(scenario);
  const textBlocks = content.filter((b) => b.type === 'text');
  const fullText = textBlocks.map((b) => b.text).join('');
  const usage = simulateUsage(body, fullText);

  send('message_start', {
    type: 'message_start',
    message: {
      ...messageEnvelope(id, fallbackModel ?? body.model),
      usage: { ...usage, output_tokens: 1 },
    },
  });
  if (scenario === 'refusal') {
    // Declined before any output.
    send('message_delta', {
      type: 'message_delta',
      delta: { stop_reason: 'refusal', stop_sequence: null, stop_details: refusalDetails() },
      usage: { output_tokens: 0 },
    });
    send('message_stop', { type: 'message_stop' });
    res.end();
    return usage;
  }

  let streamedChars = 0;
  const limitChars =
    scenario === 'max_tokens' || scenario === 'refusal-midstream' || scenario === 'midstream-error'
      ? Math.floor(fullText.length * 0.4)
      : Infinity;

  for (const [index, block] of content.entries()) {
    if (closed) break;
    if (streamedChars >= limitChars) break;
    if (block.type === 'fallback' || block.type === 'thinking') {
      send('content_block_start', {
        type: 'content_block_start',
        index,
        content_block: block.type === 'thinking' ? { type: 'thinking', thinking: '', signature: '' } : block,
      });
      if (block.type === 'thinking') {
        send('content_block_delta', { type: 'content_block_delta', index, delta: { type: 'signature_delta', signature: block.signature } });
      }
      send('content_block_stop', { type: 'content_block_stop', index });
      await sleep(delay);
      continue;
    }
    send('content_block_start', {
      type: 'content_block_start',
      index,
      content_block: { type: 'text', text: '', citations: block.citations ? [] : null },
    });
    for (const citation of block.citations ?? []) {
      send('content_block_delta', { type: 'content_block_delta', index, delta: { type: 'citations_delta', citation } });
    }
    const pieces = block.text.match(/\s+|\S+\s*/g) ?? [];
    for (let i = 0; i < pieces.length; i += 2) {
      if (closed) break;
      let piece = pieces.slice(i, i + 2).join('');
      if (streamedChars + piece.length > limitChars) piece = piece.slice(0, Math.max(0, limitChars - streamedChars));
      if (piece) {
        send('content_block_delta', { type: 'content_block_delta', index, delta: { type: 'text_delta', text: piece } });
        streamedChars += piece.length;
      }
      if (streamedChars >= limitChars) break;
      await sleep(delay);
    }
    send('content_block_stop', { type: 'content_block_stop', index });
  }

  if (closed) {
    log(`  ${id}: client disconnected mid-stream`);
    return usage;
  }
  if (scenario === 'midstream-error') {
    send('error', { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded (mock midstream error)' } });
    res.end();
    return usage;
  }
  send('message_delta', {
    type: 'message_delta',
    delta: { stop_reason: stop, stop_sequence: null, stop_details: stop === 'refusal' ? refusalDetails() : null },
    usage: {
      output_tokens: usage.output_tokens,
      input_tokens: usage.input_tokens,
      cache_creation_input_tokens: usage.cache_creation_input_tokens,
      cache_read_input_tokens: usage.cache_read_input_tokens,
      ...(fallbackModel
        ? { iterations: [{ type: 'fallback_message', model: fallbackModel, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, cache_creation: null }] }
        : {}),
    },
  });
  send('message_stop', { type: 'message_stop' });
  res.end();
  return usage;
}

async function handleMessages(req, res, url) {
  const raw = await readBody(req);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    stats.rejected += 1;
    return apiError(res, 400, 'invalid_request_error', 'Request body is not valid JSON');
  }
  const betas = String(req.headers['anthropic-beta'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const scenario = scenarioFor(body);
  const { errors, warnings, breakpoints } = validate(body, betas);
  const systemChars = Array.isArray(body.system)
    ? body.system.reduce((n, b) => n + String(b.text ?? '').length, 0)
    : String(body.system ?? '').length;
  const id = `msg_mock_${String(requestCounter).padStart(4, '0')}`;

  stats.lastRequest = {
    id, path: url.pathname + url.search, betas, model: body.model, max_tokens: body.max_tokens,
    effort: body.output_config?.effort ?? null, stream: !!body.stream, fallbacks: body.fallbacks ?? null,
    messages: Array.isArray(body.messages) ? body.messages.length : 0, systemChars, breakpoints,
    structured: !!body.output_config?.format, thinking: body.thinking ?? null, scenario,
  };
  log(
    `POST ${url.pathname}${url.search} ${id} model=${body.model} max_tokens=${body.max_tokens} effort=${body.output_config?.effort ?? '-'}` +
      ` stream=${!!body.stream} msgs=${stats.lastRequest.messages} system=${systemChars}ch breakpoints=${breakpoints}` +
      ` fallbacks=${JSON.stringify(body.fallbacks ?? null)} beta=[${betas.join(',')}]` +
      `${body.output_config?.format ? ' structured' : ''} scenario=${scenario}`,
  );
  for (const w of warnings) {
    stats.warnings += 1;
    log(`  WARN ${w}`);
  }
  if (errors.length) {
    stats.rejected += 1;
    for (const e of errors) log(`  REJECT ${e}`);
    return apiError(res, 400, 'invalid_request_error', errors.join(' | '));
  }

  switch (scenario) {
    case 'error-400': stats.rejected += 1; return apiError(res, 400, 'invalid_request_error', 'mock: bad request');
    case 'error-401': stats.rejected += 1; return apiError(res, 401, 'authentication_error', 'mock: invalid x-api-key');
    case 'error-429': stats.rejected += 1; return apiError(res, 429, 'rate_limit_error', 'mock: rate limited', { 'retry-after': '1' });
    case 'error-500': stats.rejected += 1; return apiError(res, 500, 'api_error', 'mock: internal error');
    case 'error-529': stats.rejected += 1; return apiError(res, 529, 'overloaded_error', 'mock: overloaded');
    default: break;
  }

  const usage = body.stream ? await respondStream(res, body, scenario, id, req) : await respondJson(res, body, scenario, id);
  stats.ok += 1;
  log(`  → ${scenario} in=${usage.input_tokens} cache_read=${usage.cache_read_input_tokens} cache_write=${usage.cache_creation_input_tokens} out=${usage.output_tokens}`);
}

const server = http.createServer(async (req, res) => {
  requestCounter += 1;
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/health') return sendJson(res, 200, { ok: true });
    if (req.method === 'GET' && url.pathname === '/_mock/stats') return sendJson(res, 200, stats);
    if (req.method === 'POST' && url.pathname === '/_mock/reset') {
      cache.clear();
      Object.assign(stats, { requests: 0, ok: 0, rejected: 0, warnings: 0, cacheReads: 0, cacheWrites: 0, lastRequest: null });
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/v1/messages') {
      stats.requests += 1;
      if (!req.headers['x-api-key'] && !req.headers.authorization) {
        return apiError(res, 401, 'authentication_error', 'x-api-key header is required');
      }
      if (!req.headers['anthropic-version']) log('  WARN missing anthropic-version header');
      return await handleMessages(req, res, url);
    }
    if (req.method === 'POST' && url.pathname === '/v1/messages/count_tokens') {
      const body = JSON.parse((await readBody(req)) || '{}');
      return sendJson(res, 200, { input_tokens: tokensOf(JSON.stringify(body.system ?? '') + JSON.stringify(body.messages ?? [])) });
    }
    return apiError(res, 404, 'not_found_error', `mock: no route for ${req.method} ${url.pathname}`);
  } catch (err) {
    console.error('[mock-anthropic] handler crashed', err);
    if (!res.headersSent) apiError(res, 500, 'api_error', 'mock crashed');
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[mock-anthropic] listening on http://${HOST}:${PORT} (scenario=${DEFAULT_SCENARIO}, delay=${DELAY_MS}ms)`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  });
}
