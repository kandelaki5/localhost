# AI architecture — localhost.ge

How the AI layer of the Local Host website is organised, and how to add a feature to it.

The short version: every AI feature is an on-demand Astro API route (`export const prerender = false`). The route calls the shared core in `src/lib/ai/`. The core handles guards, rate limits, prompt layout, caching, Claude calls, refusals, streaming and demo mode, so all features behave the same way.

```
 browser ──fetch──▶ /api/ai/<feature>  (Astro API route, Vercel serverless function)
   ▲                   │ guard()            method · origin · rate limit · daily cap · body size · JSON
   │                   │ demo? ───────────▶ demoTextResponse(fixture) / json(fixture, {mode:'demo'})
   │                   │ live:
   │                   │ streamClaude()     ─┐ messageParams(): model, effort, fallbacks, system blocks
   │                   │ runStructured()    ─┘ anthropic().beta.messages.stream(...)
   │                   ▼
   └── text/plain stream (+ [[markers]])  or  JSON {…, mode}  or  JSON {error:{code,message}}
```

## Files

| File | Runs in | What it is |
|---|---|---|
| `src/lib/ai/types.ts` | anywhere | `Locale`, `AiMode`, `CountryCode`, `ExperienceId`, `PlaceId`, `Place`. Also runtime id lists and guards: `EXPERIENCE_IDS`, `PLACE_IDS`, `isPlaceId()`… |
| `src/lib/ai/locales.ts` | anywhere | `LOCALES`, `LOCALE_INFO` (English name, native name, BCP-47), `isLocale`, `normalizeLocale`, `pickLocale`, `languageInstruction(locale)` |
| `src/lib/ai/places.ts` | anywhere | 51 places (33 GE, 9 AM, 9 AZ) with coordinates, names in all five languages, type, experiences and photo. `findPlace`, `placeName`, `placesWhere`, and the SVG map projection `project` / `unproject` / `MAP_VIEWBOX` |
| `src/lib/ai/markers.ts` | anywhere | The in-band stream status markers and parsers |
| `src/lib/ai/client.ts` | **browser** | `postAiStream`, `readAiStream`, `postAiJson`. Parses the stream and errors and reads `mode` |
| `src/lib/ai/knowledge.ts` | server | Knowledge base as typed data (company, experiences, countries, hosts, sustainability, fairs, airlines, travel times, rules) plus `renderKnowledgeBase()` / `knowledgeSystemPrompt()` |
| `src/lib/ai/config.ts` | **server only** | Env access, `isLive()`, `aiMode()`, `model()`, limits, the `anthropic()` client singleton |
| `src/lib/ai/http.ts` | **server only** | `json`, `error`, `guard`, rate limiter, `readJson`, origin check, validators, `streamText`, `demoStream`, `demoTextResponse`, `streamClaudeResponse`, error mapping |
| `src/lib/ai/claude.ts` | **server only** | `buildSystem`, `messageParams`, `streamClaude`, `runStructured`, `strictSchema`, `structuredErrorResponse`, `sanitizeHistory` |
| `scripts/mock-anthropic.mjs` | node | Fake Messages API for testing live code paths |

There is no barrel `index.ts`, on purpose. Import from the specific file, so that browser bundles never pull in the SDK, `config.ts` or the large knowledge base. Browser code may import **only** `types`, `locales`, `places`, `markers` and `client`.

## Environment variables

| Var | Default | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | If it is missing or empty, the site runs in **demo mode** |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | Model override |
| `AI_RATE_LIMIT_PER_HOUR` | `20` | Requests per IP in a rolling hour (all AI endpoints together) |
| `AI_DAILY_CAP` | `2000` | Live Claude calls per UTC day, site-wide. Demo requests don't count |
| `AI_FALLBACKS` | `default` | Set to `off` to drop server-side refusal fallbacks, e.g. if `ANTHROPIC_MODEL` points at a model or platform that rejects them. *Not yet in `.env.example`.* |
| `ANTHROPIC_BASE_URL` | — | **Tests only** (mock server). Read from `process.env` at runtime only, so it can never be baked into a build |

Values are read from `import.meta.env` first, then from `process.env`. `import.meta.env` covers `.env` files in dev and is inlined into the **server** bundle at build time. `process.env` covers the Vercel runtime and shell variables. On Vercel, set the variables in *Project → Settings → Environment Variables* and redeploy. Also set a monthly **spend limit in the Anthropic Console**. The in-app limits are best-effort, so the spend limit is the real cost ceiling.

## Demo mode vs live mode

`isLive()` is true when an API key is set. In **demo mode** every endpoint still works:

- **Same format as live.** Text endpoints stream a fixture with `demoTextResponse(text)`, which sends small word chunks with short delays and the same headers. JSON endpoints return the same shape as live.
- **Labelled.** The response header is `X-AI-Mode: demo`, and JSON bodies get `mode: "demo"` (`json()` adds it). `client.ts` exposes `result.mode`, so the UI can show a "Demo — sample answer" badge.
- **Fixtures are hand-written by each feature**, grounded only in the brief, the policies and the research data. They contain no prices, schedules, awards, or facts about real people beyond what the knowledge base states. Keep them in the feature's own module, next to its route or component. Write one per locale where it matters, or at least `en` with a localized intro line.
- Demo requests are rate-limited per IP but do not count against the daily cap.

## Prompt layout and caching

`buildSystem()` always produces this order:

| # | Block | Cached | Content |
|---|---|---|---|
| 0 | `knowledgeSystemPrompt()` | ✅ `cache_control` | Role, 14 ground rules, the whole knowledge base (≈ 8k tokens) |
| 1 | `instructions` | ✅ `cache_control` | The feature's own system prompt. Must be **stable**: no dates, user data or ids |
| 2 | volatile | ❌ | `languageInstruction(locale)` and the optional per-request `context` (e.g. today's date) |

Visitor input always goes into `messages`, never into `system`.

Caching is a byte-exact prefix match, so:

- `renderKnowledgeBase()` is deterministic and memoised: fixed ordering, no timestamps, research files sorted.
- The language instruction sits *after* the breakpoints, so all five locales share one cache entry.
- Changing `effort` between requests invalidates the cache. Keep one effort level per feature.
- Verify caching in the server logs. Every call logs `[ai] <feature> … cache_read=… cache_write=…`. The mock server simulates this too: the second identical-prefix request shows `cache_read`.

Two breakpoints are used, so a feature may add up to two more (e.g. on a large document block). The API allows 4 in total, and the mock rejects more than 4.

## Claude call defaults (non-negotiable)

`messageParams()` enforces these, so don't bypass it:

- `model: model()`, which defaults to `claude-opus-5-5`.
- **No `thinking` param.** Opus 5.5 always uses adaptive thinking. `budget_tokens` and `disabled` both return a 400. The `extra` type even excludes `thinking`, `temperature`, `top_p`, `top_k` and `fallbacks`.
- **`output_config.effort` is required** (`ClaudeRequest.effort`). Use `low` for chat-like or latency-sensitive endpoints and `medium` for heavier writing (e.g. an agency proposal).
- **`fallbacks: "default"`** plus beta `server-side-fallback-2026-07-01`. The call goes through `client.beta.messages.*`. If the requested model declines for policy reasons, the API retries server-side on Anthropic's recommended model. Logs show `refusal fallback A → B` and `fallback=yes`.
- **No assistant prefill.** The last message must be `user`, otherwise `messageParams` throws. For JSON, use structured outputs (`runStructured`).
- **`max_tokens`** is required and clamped to `[256, 16000]`. Thinking counts towards it, and Georgian text needs considerably more tokens than English. Suggested values: chat answer 1,500–3,000; day-by-day itinerary 6,000–10,000 (allow more for `ka`); structured proposal 6,000–10,000.
- The client uses `maxRetries: 1` and a `timeout` of 55 s, because Vercel `maxDuration` is 60 s.

## Streaming protocol (text endpoints)

The response is `Content-Type: text/plain; charset=utf-8` with `Cache-Control: no-store` and `X-AI-Mode`.

`streamClaudeResponse()` waits for the first stream event before it answers:

- **Failures before any output** (bad key, 429, overload, connection) become a normal **JSON error response with an HTTP status** (see below).
- **Once streaming has started**, text deltas are forwarded and the body ends with at most one marker, always preceded by a blank line:

| Ending | Meaning | Client should |
|---|---|---|
| *(none)* | Finished normally | Show the text |
| `\n\n[[truncated]]` | Hit `max_tokens` | Show the text plus a "shortened" note |
| `\n\n[[refusal]]` | Claude, and the fallback model, declined | **Discard the partial text** and show a polite localized message |
| `\n\n[[error:<code>]]` | Upstream/network error mid-stream | Keep or discard the partial text and offer a retry |

`client.ts` handles all of this:

```ts
import { postAiStream } from '../lib/ai/client';
const r = await postAiStream('/api/ai/planner', body, { onText: (visible) => render(visible), signal });
// r.mode ('demo'|'live'), r.text, r.refusal, r.truncated, r.error, r.retryAfter, r.message
```

`onText` receives text with markers already stripped. A partial marker such as `"\n\n[[ref"` is held back so it never flashes on screen. A client disconnect, such as `AbortController.abort()`, cancels the upstream Claude request.

## JSON error shape and codes

```json
{ "error": { "code": "rate_limited", "message": "Too many requests…", "retryAfter": 120 }, "mode": "live" }
```

| HTTP | code | When |
|---|---|---|
| 400 | `bad_request`, `invalid_json` | Body is not a JSON object, or a field is invalid (feature validation) |
| 403 | `forbidden_origin` | Origin is not this site, localhost, `localhost.ge` or `*.vercel.app` |
| 405 | `method_not_allowed` | Wrong method (sets an `Allow` header) |
| 413 | `payload_too_large` | Body > 6 MB (`MAX_BODY_BYTES`), checked against Content-Length **and** while streaming |
| 415 | `unsupported_media_type` | Not `application/json` |
| 422 | `refusal` | Structured endpoint declined |
| 429 | `rate_limited` / `daily_cap` | Per-IP limit or site-wide daily cap (`Retry-After` is set) |
| 500 | `upstream_auth`, `internal` | Bad or missing key on the server, or a misconfiguration |
| 502 | `upstream_bad_request`, `upstream_error`, `upstream_connection`, `truncated` | Our request was rejected, an unexpected answer came back, or the structured output was cut off |
| 503 | `upstream_rate_limited`, `upstream_overloaded` | Anthropic is busy (`Retry-After` is set) |
| 504 | `upstream_timeout` | Upstream timeout |

Messages are safe to show users; they contain no internals. The details (status, `type`, `request_id`) go to the server log only. SDK errors are mapped with `instanceof` against the SDK's typed classes, never by matching message strings.

## Rate limiting and abuse protection (best effort)

- **Per-IP sliding window.** `AI_RATE_LIMIT_PER_HOUR` applies across all AI endpoints. The IP comes from the first `x-forwarded-for` hop (set by Vercel), then `x-real-ip`, then Astro's `clientAddress`. IPv6 addresses are grouped by /64.
- **Daily cap.** `AI_DAILY_CAP` counts live calls per UTC day.
- **Where the state lives.** It is held **in memory per serverless instance**. Vercel can run several instances and recycles them, so the real ceiling may be a few times the configured value. It stops casual abuse and runaway loops, but it is not a billing guarantee. For hard guarantees, move the counters to a shared store such as Vercel KV or Upstash and keep the same `checkRateLimit()` signature.
- **Origin check.** Other websites can't use the endpoints from their visitors' browsers. Requests without an `Origin` header (curl) are allowed but still rate limited.
- **Body limit.** The 6 MB limit is ours, but **Vercel rejects request bodies over 4.5 MB** before the function runs. Features that upload images should downscale them in the browser first, to under about 3 MB of base64.
- **Prompt injection.** Rule 13 tells Claude to treat visitor text as data. Keep visitor text in `messages` only.

## Knowledge base

`knowledge.ts` is built only from:

- `docs/BRIEF.md`
- the company's policies (`docs/reference/pdf-text/*.txt`)
- the research JSON
- well-established public facts about the destinations (UNESCO sites, mountain heights, typical seasons, approximate drive times)

Research files `src/data/*.json` are loaded with `import.meta.glob(..., { eager: true })` at build time. Missing files are fine.

- **`research-orgs.json`** is rendered by a dedicated function. It includes:
  - only verified memberships;
  - unconfirmed acronyms as "never call these memberships";
  - awards with `displayOk`, wording "Nominee", never "winner";
  - Travelife Partner wording and the do-not-say list;
  - only high-confidence host facts;
  - "no supported projects" and "no social accounts" statements.
- **`flights.json`, `fairs.json`, `airlines.json`, `awards.json`, `memberships.json` and `research-*.json`** are rendered generically. The renderer drops URL, source, logo and image keys and caps each file at about 8k characters. Other files, such as `photo-credits.json`, are ignored.
- **The 14 assistant rules** are in `ASSISTANT_RULES`:
  - no prices;
  - no guarantees (availability, visas, schedules, roads, weather);
  - always hand off to the team;
  - political neutrality;
  - cross-border trips routed via Georgia and arranged by the team;
  - no restricted areas;
  - mountain safety;
  - sustainability ethos and "Travelife Partner" wording only;
  - host facts only as listed;
  - privacy;
  - scope and injection.
- **Unverified hosts** (Vacheishvili Family, Aluda, Maia) are explicitly marked "no verified details — no specific claims".

When facts change, edit the typed data, not the rendered text. Never add prices, schedules or claims about real people unless a source supports them.

## Places and the SVG map

`places.ts` has 51 places with WGS84 coordinates rounded to about 0.01°. Coordinates for valleys and regions (Truso, Juta, Tusheti, Mountain Adjara) point at a representative spot. Exonyms are used per language, e.g. de *Tiflis*, pl *Erywań*, it *Erevan*. **A native speaker should review the ka/pl/it/de names**, and the Jokolo and Lopota coordinates are the least certain.

Map frame and projection:

- **Frame:** lon 39.8–50.6 E, lat 38.3–43.8 N.
- **Projection:** equirectangular with a cos(41.05°) horizontal correction.
- `MAP_VIEWBOX` = `"0 0 1000 675.3"`. The origin is top-left and y grows downwards.
- `project(lat, lon) → {x, y}` in viewBox units: `x = (lon − 39.8)·cos(41.05°)·S`, `y = (43.8 − lat)·S`, with `S = 1000 / (10.8·cos 41.05°) ≈ 122.8`.
- `unproject(x, y)` is the inverse, for click handling.

Examples: Tbilisi → (463, 259), Batumi → (170, 265), Baku → (930, 421).

The knowledge base ends with a **place index** (`id — name (country, region)`), so features can ask Claude for place ids in structured output. Validate them with `isPlaceId()`.

## Adding a new AI feature — checklist

1. Create `src/pages/api/ai/<feature>.ts` with `export const prerender = false`.
2. Call `const g = await guard(context)` and return `g.response` if `!g.ok`. Validate `g.body` with `asText` / `asInt` / `asOneOf` / `asList`, or your own checks, and return `error(400, 'bad_request', …)` on failure.
3. Get the locale with `pickLocale(g.body.locale, context.request)`.
4. **Demo:** `if (g.mode === 'demo') return demoTextResponse(fixture[locale], { headers: g.headers })`. For JSON: `json(fixture, { mode: 'demo', headers: g.headers })`.
5. **Live text:** `return streamClaude({ feature, instructions, messages, locale, context, maxTokens, effort: 'low' }, { headers: g.headers })`.
6. **Live JSON:** `const r = await runStructured({ ..., schema, validate })`. If `!r.ok`, return `structuredErrorResponse(r, g.headers)`; otherwise return `json({...r.data}, { mode: 'live', headers: g.headers })`. Write schemas with `enum`s and descriptions. `strictSchema()` adds `additionalProperties: false` and `required`. Avoid `minLength`, `maximum`, `pattern` and similar.
7. **Chat history** from the browser goes through `sanitizeHistory(body.messages)`, which caps it, alternates roles and ends with a user message.
8. In the browser, use `postAiStream` or `postAiJson` from `client.ts`. Show a "Demo — sample answer" badge when `mode === 'demo'`. Handle `refusal`, `truncated`, `error` and `retryAfter` with localized messages.
9. Test in demo mode, then in live mode against the mock (below), then run `npx astro check`.

## Testing with the mock Claude server

```bash
# 1. fake Anthropic API (dependency-free)
node scripts/mock-anthropic.mjs --port 4499            # --delay 8  --quiet

# 2. dev server in LIVE mode against the mock (use your own port)
ANTHROPIC_API_KEY=test ANTHROPIC_BASE_URL=http://127.0.0.1:4499 npx astro dev --port 4400 --host 127.0.0.1

# 3. demo mode = simply no key
npx astro dev --port 4400 --host 127.0.0.1
```

Note that Astro 7's `astro dev` detaches and prints its PID. Stop it with `kill <pid>`. `npx astro dev stop` may stop other people's servers in the same project.

**What the mock validates.** It returns a 400 the way the real API does for:

- a missing `model` or `max_tokens`;
- empty messages;
- `thinking.type` `enabled` or `disabled`, or `budget_tokens`;
- assistant prefill;
- `temperature` ≠ 1;
- forced `tool_choice`;
- an invalid `effort`;
- more than 4 `cache_control` breakpoints;
- `fallbacks: "default"` without beta `server-side-fallback-2026-07-01`, or the array form without `-2026-06-01`.

It **warns** in its log when no `cache_control` is present or when `effort` is omitted.

**What it answers:**

- **SSE stream** in the exact real event order:
  1. `message_start`
  2. a thinking block (signature only)
  3. text deltas
  4. `content_block_stop`
  5. `message_delta` with stop reason and usage
  6. `message_stop`
- **JSON message** for non-streaming requests.
- **Structured output.** With `output_config.format` it returns a minimal JSON object generated from the schema: required fields are present and enums are honoured.
- **Citations.** A document block with `citations.enabled` gets a `char_location` citation (`citations_delta` when streaming).
- **Prompt caching** is simulated, giving realistic `cache_read_input_tokens` and `cache_creation_input_tokens`.

**Scenarios.** Put `[[mock:<scenario>]]` anywhere in a user message, or set `MOCK_SCENARIO=<scenario>`:

| Scenario | Exercises |
|---|---|
| `ok` | Happy path. The text comes from `MOCK_TEXT` or a default |
| `refusal` | Refusal before any output → `[[refusal]]` / 422 |
| `refusal-midstream` | Partial text, then refusal → `[[refusal]]` |
| `max_tokens` | Cut off → `[[truncated]]` / 502 `truncated` |
| `fallback` | Server-side fallback block. `model` becomes `claude-opus-5`, `usage.iterations` has a `fallback_message` |
| `midstream-error` | SSE `error` event after partial text → `[[error:upstream_overloaded]]` |
| `error-400` / `error-401` / `error-429` / `error-500` / `error-529` | HTTP errors → 502 / 500 / 503 / 503 / 503 JSON |
| `slow` | 200 ms per chunk (test aborts and disconnects) |

`GET /_mock/stats` returns the counters and the last request summary. `POST /_mock/reset` clears the cache simulation.

**Verified in this setup:** demo stream timing and headers; 405, 415, 400, 403 and 413 (both Content-Length and chunked); the per-IP 429 with `Retry-After`; the daily cap 429; `AI_FALLBACKS=off`; `ANTHROPIC_MODEL` override; every live scenario above through a real dev server; prompt-cache reads on repeated requests; client-disconnect abort; and the `client.ts` helpers.

**Not verifiable here:** calls to the real Anthropic API (no key), and production behaviour on Vercel (multi-instance rate limiting, streaming through Vercel's edge).

## Known limitations

- Rate limiting is per instance; see above.
- The model sometimes needs nudging to keep Georgian answers fully in Mkhedruli. `languageInstruction('ka')` asks for it explicitly, but native review of outputs is still recommended.
- Research JSON is read at **build time**. Updating it requires a redeploy.
