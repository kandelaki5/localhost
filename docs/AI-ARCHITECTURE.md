# AI architecture — localhost.ge

How the AI layer of the Local Host website is organised, what it costs, how to switch it on, and how to add a feature to it.

The short version: every AI feature is an on-demand Astro API route under `src/pages/api/` (`export const prerender = false`, so each one is a Vercel serverless function). The route calls the shared core in `src/lib/ai/`. The core handles guards, rate limits, prompt layout, caching, Claude calls, the time budget, refusals, streaming and demo mode, so all features behave the same way.

```
 browser ──fetch──▶ /api/<feature>  (Astro API route, Vercel serverless function, maxDuration 300 s)
   ▲                   │ guard()            method · origin · per-IP limit · daily cap · body size · JSON
   │                   │ validate body      strict, per feature (400 bad_request)
   │                   │ demo? ───────────▶ demoTextResponse(fixture) / json(fixture, {mode:'demo'})
   │                   │ live:
   │                   │ streamClaude()     ─┐ messageParams(): model, effort, fallbacks, cached system blocks
   │                   │ runStructured()    ─┤ anthropic().beta.messages.stream(params, { signal })
   │                   │ callClaude()       ─┘ signal = time budget (280 s) + the visitor's disconnect
   │                   ▼
   └── text/plain stream (+ [[markers]])  or  JSON {…, mode}  or  JSON {error:{code,message}}
```

## Endpoints

| Path | Feature | Answer | Effort | `max_tokens` (en / ka) | Rate units | Demo mode | Browser module |
|---|---|---|---|---|---|---|---|
| `POST /api/plan` | AI Trip Designer | `text/plain` stream (Markdown + `<route>[…]</route>` + markers) | low | 8,000 / 16,000 (pl, de 9,000) | 1 | Closest hand-written sample, streamed, labelled | `client/plan.ts` (`planTrip`, `refinePlan`, `buildMailto`) |
| `POST /api/photo-match` | Photo Match (vision + structured output) | JSON | low | 4,000 / 6,000 | 1 | Precomputed matches for the 3 inspiration photos; a labelled generic sample for any other photo | `client/photo.ts` (`matchPhoto`, `matchInspiration`) |
| `POST /api/proposal` | B2B proposal builder (structured output) | JSON | medium | 12,000 / 16,000 | 2 | Closest of two prepared proposals | `client/proposal.ts` (`requestProposal`) |
| `POST /api/policy-qa` | Ask our policies (documents + citations) | JSON | low | 3,000 / 4,500 | 1 | Prepared English answers with real citations | `client/policy.ts` (`askPolicyQuestion`) |
| `POST /api/triage` | Inbox triage — **staff tool** (structured output) | JSON | low | 6,000 | 1 | Prepared results of the 3 sample emails | `client/triage.ts` (`triageEmail`) |
| `POST /api/mcp` | MCP connector for agencies' AI assistants | JSON-RPC | — | — | own limits | Same in both modes: it never calls Claude | — (see `docs/MCP.md`) |

The request and response shapes are documented at the top of each route file and in the matching `src/lib/ai/client/*.ts` module, which is the single source of truth for the request format (`validate…Request()` is used by both the browser and the server). Every JSON answer has the same shape in demo and live mode, plus `mode: "demo" | "live"`; demo answers also carry a `sample` object (`null` in live mode) with a localised label to show.

Dev harness pages (noindex, not in the sitemap) live under `/ai-lab/dev/`: `trip-designer`, `photo-match`, `proposal`, `policy-qa`, `triage`, `mcp`.

## Files

| File | Runs in | What it is |
|---|---|---|
| `src/lib/ai/types.ts` | anywhere | `Locale`, `AiMode`, `CountryCode`, `ExperienceId`, `PlaceId`, `Place`, runtime id lists and guards (`EXPERIENCE_IDS`, `PLACE_IDS`, `isPlaceId()`…) |
| `src/lib/ai/locales.ts` | anywhere | `LOCALES`, `LOCALE_INFO`, `isLocale`, `normalizeLocale`, `pickLocale`, `languageInstruction(locale)` |
| `src/lib/ai/places.ts` | anywhere | 51 places (33 GE, 9 AM, 9 AZ) with coordinates, names in five languages, type, experiences and photo; the SVG map projection |
| `src/lib/ai/markers.ts` | anywhere | The in-band stream status markers and their parsers |
| `src/lib/ai/client.ts` | **browser** | `postAiStream`, `readAiStream`, `postAiJson` |
| `src/lib/ai/client/*.ts` | **browser** (+ shared types) | One module per feature: request contract, validation, wire types, helpers (`plan.ts`, `plan-format.ts`, `photo.ts`, `proposal.ts`, `policy.ts`, `triage.ts`, `place-info.ts`, `voice.ts`) |
| `src/lib/ai/fixtures/*.ts` | server | Demo-mode answers, one file per feature |
| `src/lib/ai/policies/` | server | The five policy texts (~13.5k tokens) as citable `document` blocks |
| `src/lib/ai/knowledge.ts` | server | The knowledge base as typed data plus `renderKnowledgeBase()` / `knowledgeSystemPrompt()` |
| `src/lib/ai/config.ts` | **server only** | Env access, `isLive()`, `model()`, limits, `timeLimitMs()`, `staffAccessKey()`, the `anthropic()` client |
| `src/lib/ai/http.ts` | **server only** | `json`, `error`, `guard`, rate limiter, `readJson`, origin check, `staffAccess`, validators, `streamText`, demo streams, `streamClaudeResponse`, error mapping, `logUsage` |
| `src/lib/ai/claude.ts` | **server only** | `buildSystem`, `messageParams`, `streamClaude`, `callClaude`, `runStructured`, `strictSchema`, `structuredErrorResponse`, `sanitizeHistory` |
| `src/pages/api/*.ts` | server | The six endpoints above |
| `scripts/mock-anthropic.mjs` | node | Fake Messages API for testing the live code paths |

There is no barrel `index.ts`, on purpose. Import from the specific file, so that browser bundles never pull in the SDK, `config.ts` or the knowledge base. Browser code may import **only** `types`, `locales`, `places`, `markers`, `client` and `client/*`.

## Environment variables

| Var | Default | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Missing or empty → the whole site runs in **demo mode** |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | Model override |
| `AI_RATE_LIMIT_PER_HOUR` | `20` | Rate units per IP in a rolling hour, all AI endpoints together (a proposal costs 2) |
| `AI_DAILY_CAP` | `300` | Live rate units per UTC day, site-wide (per serverless instance). Demo requests don't count |
| `AI_TIME_LIMIT_SECONDS` | `280` | Time budget for one Claude call. Keep it about 20 s below `maxDuration` in `astro.config.mjs` (see [Timeouts](#timeouts-and-vercels-time-limit)) |
| `STAFF_ACCESS_KEY` | — | Shared secret for the staff-only triage tool. **Set it in production** (see [Staff access key](#staff-access-key-triage)) |
| `AI_FALLBACKS` | `default` | `off` drops the server-side refusal fallbacks, e.g. if `ANTHROPIC_MODEL` points at a model or platform that rejects them |
| `ANTHROPIC_BASE_URL` | — | **Tests only** (mock server). Read from `process.env` at runtime only, so it is never baked into a build |

All of them are listed in `.env.example`. Values are read from `import.meta.env` first, then `process.env`. `import.meta.env` covers `.env` files in dev and is inlined into the **server** bundle at build time (never into browser code); `process.env` covers the Vercel runtime. On Vercel, set them in *Project → Settings → Environment Variables* and **redeploy**.

## Demo mode vs live mode

`isLive()` is true when an API key is set. In **demo mode** every endpoint still works:

- **Same format as live.** Text endpoints stream a fixture with `demoTextResponse(text)` (small word chunks, short delays, same headers); JSON endpoints return the same shape as live after a short delay, so the UI's loading state is visible.
- **Labelled.** Header `X-AI-Mode: demo`, `mode: "demo"` in JSON bodies, and a localised `sample.notice` (photo, proposal) or sample info (policy Q&A, triage). The plan stream starts with an italic "Demo mode — sample itinerary" line and sends `X-AI-Sample: <fixture id>`. Show a "Demo — sample answer" badge whenever `mode === 'demo'`.
- **Honest fixtures.** Hand-written, grounded only in the brief, the policies and the research data: no prices, schedules, awards or facts about real people beyond the knowledge base. Some demo answers are English only (policy Q&A, triage notes, photo samples); their notice says so.
- **Rate limited, no daily cap.** Demo requests count against the per-IP limit but not the daily cap.

## Claude call defaults (non-negotiable)

`messageParams()` enforces these, so don't bypass it:

- **`model: model()`**, default `claude-opus-5-5`.
- **No `thinking` param.** Opus 5.5 always uses adaptive thinking; `budget_tokens` and `{type: "disabled"}` both return a 400. The `extra` escape hatch excludes `thinking`, `temperature`, `top_p`, `top_k` and `fallbacks`.
- **`output_config.effort` is always set** (`low` for chat-like or latency-sensitive endpoints, `medium` for the proposal). Opus 5.5 would default to `medium`; keep one effort per feature, because changing it invalidates the prompt cache.
- **`fallbacks: "default"`** with beta header `server-side-fallback-2026-07-01` (the scalar form needs exactly this header; the array form would need `-2026-06-01`, and mixing them is a 400). Calls go through `client.beta.messages.*`. If Opus 5.5 declines for policy reasons, the API retries on Anthropic's recommended model in the same call; logs then show `refusal fallback A → B` (streams) and `fallback=yes`. A fallback model runs without Opus 5.5's thinking and bills at its own rates.
- **No assistant prefill.** The last message must be `user`, otherwise `messageParams` throws. For JSON use structured outputs (`runStructured`: `output_config.format = {type: "json_schema", schema}`); citations are incompatible with structured outputs, so policy Q&A uses `callClaude` and plain text blocks.
- **`max_tokens`** is required, includes thinking, and is clamped to `[256, 16000]`. Georgian (Mkhedruli) text needs several times more tokens per word than English: 8,000 cut long Georgian plans off and 2,000 cut Georgian photo answers off, so every route now sets a per-locale budget (table above). `max_tokens` is a ceiling: you pay only for what is generated.
- **Stop reasons are checked before content is read:** `refusal` → 422 `refusal` (JSON) or `[[refusal]]` (stream; the partial text must be discarded); `max_tokens` / `model_context_window_exceeded` → 502 `truncated` (JSON) or `[[truncated]]` (stream).
- **Time budget + disconnects.** Every call gets `signal = AbortSignal.any([AbortSignal.timeout(timeLimitMs()), request.signal])`: it is cancelled when the budget runs out or the visitor's browser disconnects (pass `signal: context.request.signal` in the `ClaudeRequest`). The SDK client uses `maxRetries: 1` and a 55 s `timeout`, which only covers the wait for response headers.
- **Typed errors.** SDK errors are mapped with `instanceof` against the SDK's classes (never by message text) to safe, user-facing messages; status, `type` and `request_id` go to the server log only.

## Prompt layout and caching

`buildSystem()` always produces this order:

| # | Block | Cached | Content |
|---|---|---|---|
| 0 | `knowledgeSystemPrompt()` | ✅ `cache_control` | Role, 14 ground rules, the whole knowledge base (≈ 46k characters, ≈ 11–12k tokens) |
| 1 | `instructions` | ✅ `cache_control` | The feature's own system prompt. Must be **stable**: no dates, user data or ids |
| 2 | volatile | ❌ | `languageInstruction(locale)` and the optional per-request `context` (e.g. today's date) |

Visitor input always goes into `messages`, never into `system`. Policy Q&A skips block 0 (`knowledge: false`) and instead caches the five policy documents at the start of the first user message (second breakpoint on the last document).

Caching is a byte-exact prefix match, so `renderKnowledgeBase()` is deterministic and memoised (fixed ordering, no timestamps, research files sorted), the language instruction sits *after* the breakpoints (all five locales share one cache entry), and effort is fixed per feature. Each call logs one line, e.g. `[ai] plan model=claude-opus-5-5 stop=end_turn in=273 cache_read=11458 cache_write=0 out=1890 23.4s` — check `cache_read` and the duration there. Two breakpoints are used; the API allows four (the mock rejects more).

## Streaming protocol (`/api/plan`)

`Content-Type: text/plain; charset=utf-8`, `Cache-Control: no-store`, `X-AI-Mode`. `streamClaudeResponse()` waits for the first stream event before answering:

- **Failures before any output** (bad key, 429, overload, connection, time budget) become a normal **JSON error response with an HTTP status**.
- **Once streaming has started**, text deltas are forwarded and the body ends with at most one marker, always preceded by a blank line:

| Ending | Meaning | Client should |
|---|---|---|
| *(none)* | Finished normally | Show the text |
| `\n\n[[truncated]]` | Hit `max_tokens`, **or the time budget ran out** | Show the text plus a "shortened" note (the route tag may be missing; `planTrip` then guesses the route from the text) |
| `\n\n[[refusal]]` | Claude, and the fallback model, declined | **Discard the partial text** and show a polite localised message |
| `\n\n[[error:<code>]]` | Upstream/network error mid-stream | Keep or discard the partial text and offer a retry |

`client.ts` handles all of this (`postAiStream` / `readAiStream`): markers are stripped, a half-received marker such as `"\n\n[[ref"` is held back, UTF-8 split across chunks is decoded correctly, and `AbortController.abort()` resolves with `aborted: true`. A browser disconnect cancels the upstream Claude request. `planTrip()` builds on it and adds the route tag, the parsed plan and localised error messages.

## JSON error shape and codes

```json
{ "error": { "code": "rate_limited", "message": "Too many requests…", "retryAfter": 120 }, "mode": "live" }
```

| HTTP | code | When |
|---|---|---|
| 400 | `bad_request`, `invalid_json` | Body is not a JSON object, or a field is invalid (the message names the field) |
| 401 | `unauthorized` | `/api/triage` when `STAFF_ACCESS_KEY` is set and the key is missing or wrong |
| 403 | `forbidden_origin` | Origin is not this site, localhost, `localhost.ge` or `*.vercel.app` |
| 405 | `method_not_allowed` | Wrong method (sets an `Allow` header) |
| 413 | `payload_too_large` | Body over the route's limit (plan 256 KB, photo ≈ 2 MB, proposal 16 KB, policy 64 KB, triage 48 KB), checked against Content-Length **and** while streaming; or a decoded photo over 1.5 MB |
| 415 | `unsupported_media_type` | Not `application/json` |
| 422 | `refusal` | Claude (and the fallback) declined |
| 429 | `rate_limited` / `daily_cap` | Per-IP limit or site-wide daily cap (`Retry-After` is set) |
| 500 | `upstream_auth`, `internal` | Bad or missing key on the server, or a misconfiguration |
| 502 | `upstream_bad_request`, `upstream_error`, `upstream_connection`, `truncated` | Our request was rejected, an unexpected answer came back, or the output hit `max_tokens` |
| 503 | `upstream_rate_limited`, `upstream_overloaded` | Anthropic is busy (`Retry-After` is set) |
| 504 | `upstream_timeout` | The time budget ran out (or an upstream timeout) — "took too long, try a shorter request" |

Messages are safe to show but English; the browser modules expose `error` codes so the UI can show its own localised copy (`planErrorMessage(code, locale)` does this for the planner).

## Timeouts and Vercel's time limit

Vercel stops a function at `maxDuration` (**300 s**, set in `astro.config.mjs` — the Hobby maximum with Fluid compute, which is on by default for new projects) and the visitor then gets a bare 504 page or a stream that just stops. To fail politely instead, every Claude call has a time budget, `AI_TIME_LIMIT_SECONDS` (default **280 s**):

- **Stream (plan):** at the budget the stream ends with `[[truncated]]`, so the visitor keeps the days written so far, sees "This plan was cut short…" and can still send it to the team. Before any output it is a 504 `upstream_timeout`.
- **JSON (photo, proposal, policy Q&A, triage):** a 504 `upstream_timeout` with a friendly message.
- The log line says `[ai] <feature>: time limit … reached`.

**Which requests are at risk?** With 280 s, practically none: long plans (two to three weeks, especially in Georgian) and proposals at effort `medium` can take over a minute, which fits. **If Fluid compute is turned off** for the Vercel project, Hobby functions are limited to 60 s — then set `maxDuration: 60` and `AI_TIME_LIMIT_SECONDS=50` (limits per plan: <https://vercel.com/docs/functions/configuring-functions/duration>). The browser modules show progress and allow cancelling.

## Security, abuse and cost controls

All of this is **best effort**; the Anthropic Console spend limit is the real cost ceiling.

- **Per-IP sliding window** (`AI_RATE_LIMIT_PER_HOUR`, all paid endpoints together; a proposal costs 2 units). The IP is the first `x-forwarded-for` hop (Vercel sets and overwrites it), then `x-real-ip`, then Astro's `clientAddress`; IPv6 is grouped by /64. On hosts without a trusted proxy `x-forwarded-for` can be spoofed — on Vercel it cannot.
- **Daily cap** (`AI_DAILY_CAP`) counts live units per UTC day. The units are taken in `guard()`, i.e. before the body is validated, so malformed or unauthorised requests also use up a unit (they cost no money).
- **State lives in memory per serverless instance.** Vercel runs several instances and recycles them, so the real ceiling can be a few times the configured values. For hard guarantees, move the counters to a shared store (Vercel KV / Upstash) behind the same `checkRateLimit()` signature, and add a **Vercel Firewall rate-limit rule** for `/api/*`.
- **Origin check + CORS.** Paid endpoints send no CORS headers, so other websites' pages cannot call them from browsers (the JSON preflight fails); the origin check (`isAllowedOrigin`) is a second layer. Requests without an `Origin` header (curl) are allowed but rate limited — the origin check is abuse reduction, not authentication.
- **MCP's open CORS cannot spend money.** `/api/mcp` sends `Access-Control-Allow-Origin: *`, but it never imports the Claude client or makes any LLM call, has its own rate-limit buckets and serves only public catalog data.
- **Input validation** on every field (enums, integer ranges, string lengths, history turns and total size), per-route body limits, and for photos strict base64, a decoded-size limit and a magic-byte check that must match `mediaType` (JPEG/PNG/WebP only).
- **Prompt injection.** Visitor text only ever goes into `messages`, wrapped in delimiters the text cannot close (`<visitor_notes>`, `<change_request>`, `<brief>`, `<question>`, `<email>`) and labelled "data, not instructions". The ground rules (no prices, no guarantees, no restricted areas, never reveal or change the rules) are in the cached system prompt; classification fields are schema enums; place ids are validated against `places.ts`; the proposal and triage routes also drop any sentence that still states a currency amount. Earlier plans and answers in `history` come from the browser and may be forged; the prompts treat them as drafts, not commitments. The system prompt holds no secrets, so a leak would only reveal public company information.
- **No secrets or internals in responses.** Error messages are fixed, user-safe strings; stack traces and API error details go to the server log only.
- **No PII in logs.** Log lines contain the feature, model, stop reason, token counts and duration — never prompt text, emails, photos, IPs or keys. (`/api/mcp` logs method names and the MCP client name only.)
- **No SSRF.** The server fetches nothing on behalf of a visitor: photos arrive as base64 (no URL image sources), and `/api/mcp` makes no outbound calls.
- **Mail links.** `buildMailto()` (plan), `draftReplyMailto()` (triage) and the MCP `draft_trip_request` percent-encode subject and body, so text cannot inject `cc`/`bcc` or other headers; the recipient is fixed or validated.
- **Privacy.** Visitor text, photos and pasted emails are sent to Anthropic to be processed; mention this in the privacy policy. Voice input uses the browser's speech service — show the privacy note next to the microphone button.

## Staff access key (triage)

`/api/triage` is a staff tool: pasted emails contain personal data, and every live call costs money. Protect it with `STAFF_ACCESS_KEY`:

| `STAFF_ACCESS_KEY` | Mode | Behaviour |
|---|---|---|
| not set | demo | Open (sample results only) |
| not set | live | **Open to anyone** — logs a warning once per instance. Fine for a private preview, not for production |
| set | demo | The three unchanged sample emails work without a key (the public AI Lab can still show the tool); any other email needs the key |
| set | live | Every request needs the key → otherwise 401 `unauthorized` |

The key is accepted in the **`X-Staff-Key` header** (preferred) or the **`lh_staff_key` cookie**, compared in constant time. Generate one with `openssl rand -hex 24` and share it with the team through a password manager. Rotating it = change the env var and redeploy.

**UI flow (for the UI builder):** the triage page shows a "Staff key" password field (hidden until needed). Call `triageEmail(request, { staffKey })`; on `error === 'unauthorized'` reveal the field with "Enter the staff access key", then retry. Keep the key in `sessionStorage` (not in the URL, the HTML or `localStorage` unless the user ticks "remember on this device"). If you prefer a cookie, set `lh_staff_key=<key>; Path=/api/triage; Secure; SameSite=Strict`.

## Rendering rules for the UI

Model output is **untrusted text** — Claude can be steered by what visitors type, photograph or paste.

1. Render it with Astro `{expressions}` (auto-escaped), `textContent` or `document.createTextNode`. Never pass model text to `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `set:html` or `document.write`. If you need light formatting (the plan's Markdown), escape every character first and then add a fixed set of tags — as `renderMarkdown()` in `/ai-lab/dev/trip-designer` does — or build DOM nodes from `parsePlan()`.
2. Never use model text as a URL or in `href`, `src`, `style` or event attributes. URLs come only from our own data: `documentUrl` in policy citations (from `POLICY_DOCUMENTS`), place photos (`PlaceInfo.photo`, from `places.ts`), and the links built by `buildMailto()` / `draftReplyMailto()`.
3. Map markers and route lines use `PlaceInfo.x/y` of validated place ids; put names into SVG `<text>` with `textContent`.
4. When embedding data in `<script type="application/json" set:html={JSON.stringify(x)}>`, the data must not contain `</script>` (escape `<` as `<` for anything that isn't a static fixture).
5. On `refusal` discard any partial text and show the localised message; show the demo badge when `mode === 'demo'`; show photo credits next to inspiration photos; never show the English server `message` where a localised one exists.

The dev harness pages follow these rules (they use `textContent`, and the trip designer's escape-first Markdown renderer).

## Cost per request (estimate)

Claude Opus 5.5 list prices: **$4 / M input tokens, $20 / M output tokens** (thinking counts as output), **cache reads $0.20 / M**, 5-minute cache writes $5 / M. Typical values with a warm cache:

| Request | Cached input | Fresh input | Output (incl. thinking) | ≈ Cost | Ceiling |
|---|---|---|---|---|---|
| Trip plan, 7 days, English | ~12k ($0.002) | ~0.4k ($0.002) | 2–3k ($0.04–0.06) | **$0.05** | — |
| Trip plan, 14–21 days or Georgian | ~12k | ~0.4k | 4–10k | **$0.08–0.20** | $0.33 (16k out) |
| Plan refinement | ~12k | + previous plan, 3–8k ($0.01–0.03) | as above | **+$0.01–0.03** | — |
| Photo Match | ~12k | image ≈ 1.6k + text ($0.007) | 1–2k ($0.02–0.04) | **$0.03–0.05** | $0.13 |
| Proposal (effort medium) | ~12k | ~0.5k | 5–9k ($0.10–0.18) | **$0.10–0.20** | $0.33 |
| Policy Q&A | ~14k documents ($0.003) | 0.2–2k | 0.4–1k ($0.01–0.02) | **$0.01–0.03** | $0.10 |
| Triage | ~12k | email ≤ 2.5k ($0.01) | 1–2.5k ($0.02–0.05) | **$0.03–0.06** | $0.13 |
| MCP connector | — | — | — | **$0** (no Claude call) | — |

- **Cold cache:** the first call of a feature after ~5 idle minutes writes its prefix once: about **+$0.06** (knowledge base) or +$0.07 (policy documents).
- **Example:** 50 plans + 10 photo matches + 5 proposals + 20 policy questions a day ≈ $3.5–7 plus about $1 of cache writes, i.e. roughly **$4–8 per day, $120–250 per month**; a quiet site costs a few dollars a month.
- **Worst case with the defaults:** `AI_DAILY_CAP=300` units at the ceiling price is roughly $100 a day per instance (typical requests cost far less). Also set a monthly spend limit in the Anthropic Console; raise both once real usage is known.
- Token counts are estimates (the knowledge base is ≈ 46k characters; Georgian and Cyrillic need far more tokens per word than English). Check real numbers in the `[ai] … in= cache_read= out=` log lines and in the Console's usage page.

## Knowledge base

`knowledge.ts` is built only from `docs/BRIEF.md`, the company's policies (`docs/reference/pdf-text/*.txt`), the research JSON in `src/data/` and well-established public facts about the destinations (UNESCO sites, mountain heights, typical seasons, approximate drive times).

- **Research files `src/data/*.json`** are loaded with `import.meta.glob(..., { eager: true })` **at build time**. Missing files are fine; a malformed file fails the build (not the live site). `research-orgs.json` has a dedicated renderer (verified memberships only, unconfirmed acronyms as "never call these memberships", awards with `displayOk` as "Nominee", Travelife Partner wording and its do-not-say list, high-confidence host facts, "no supported projects", "no social accounts"). `flights.json`, `fairs.json`, `airlines.json`, `awards.json`, `memberships.json` and other `research-*.json` are rendered generically (URL, source, logo and image keys dropped, ≤ 8k characters each); other files (e.g. `photo-credits.json`, `caucasus-map.json`) are ignored.
- **When data changes:** edit the typed data or the JSON, not the rendered text, and **redeploy** — the knowledge base, the MCP answers and the cached prompt prefix are all fixed at build time. The first calls after a deploy write a new cache entry (a few cents once). Keep the rendering deterministic (no dates or random ordering), or caching stops working.
- **The 14 assistant rules** (`ASSISTANT_RULES`): facts only from the knowledge base; no prices; no guarantees; hand-off to the team; visas and entry; neutrality; cross-border routing via Georgia; no restricted areas; mountain safety; sustainability and "Travelife Partner" wording only; host facts only as listed; privacy; scope and injection; style.
- **Unverified hosts** (Vacheishvili Family, Aluda, Maia) are marked "no verified details — no specific claims".
- If a policy PDF in `public/assets/policies/` changes, re-extract its text into `src/lib/ai/policies/*.txt` (citations quote those files verbatim).

## Places and the SVG map

`places.ts` has 51 places with WGS84 coordinates rounded to about 0.01°; valleys and regions point at a representative spot. Exonyms are used per language (de *Tiflis*, pl *Erywań*, it *Erevan*); **a native speaker should review the ka/pl/it/de names**, and the Jokolo and Lopota coordinates are the least certain.

- **Frame:** lon 39.8–50.6 E, lat 38.3–43.8 N; equirectangular with a cos(41.05°) horizontal correction.
- `MAP_VIEWBOX` = `"0 0 1000 675.3"`, origin top-left, y grows downwards. `project(lat, lon) → {x, y}`: `x = (lon − 39.8)·cos(41.05°)·S`, `y = (43.8 − lat)·S`, `S = 1000 / (10.8·cos 41.05°) ≈ 122.8`; `unproject(x, y)` is the inverse. Examples: Tbilisi → (463, 259), Batumi → (170, 265), Baku → (930, 421).
- The knowledge base ends with a **place index** (`id — name (country, region)`), so features can ask for place ids in structured output; schemas use the id list as an `enum`, and routes re-check with `isPlaceId()`.

## Testing with the mock Claude server

```bash
# 1. fake Anthropic API (dependency-free)
node scripts/mock-anthropic.mjs --port 4496            # --delay 8  --quiet

# 2. dev server in LIVE mode against the mock (use your own port)
ANTHROPIC_API_KEY=test ANTHROPIC_BASE_URL=http://127.0.0.1:4496 npx astro dev --port 4406 --host 127.0.0.1 --ignore-lock

# 3. demo mode = simply no key
npx astro dev --port 4406 --host 127.0.0.1 --ignore-lock
```

Astro 7's `astro dev` may detach and print its PID; stop it with `kill <pid>` (`npx astro dev stop` may stop other people's servers). In dev, Vite answers CORS preflight (`OPTIONS`) requests itself; in production the route handlers do. Useful extras: `AI_TIME_LIMIT_SECONDS=2` (test the time budget), `STAFF_ACCESS_KEY=…` (test the 401 flow), `AI_RATE_LIMIT_PER_HOUR=1000` (long test runs), or a different `X-Forwarded-For` per test client in dev.

**What the mock validates** (400, as the real API would): missing `model` or `max_tokens`; empty messages; `thinking` `enabled`/`disabled` or `budget_tokens`; assistant prefill; `temperature` ≠ 1; forced `tool_choice`; an invalid `effort`; more than 4 `cache_control` breakpoints; `fallbacks: "default"` without beta `server-side-fallback-2026-07-01` (or with the array form's `-2026-06-01` header), and the reverse; malformed image blocks (unsupported `media_type`, a `data:` prefix or invalid base64); structured outputs combined with citations. It **warns** when no `cache_control` is present or `effort` is omitted.

**What it answers:** an SSE stream in the real event order (`message_start`, a thinking block, text deltas, `content_block_stop`, `message_delta` with stop reason and usage, `message_stop`) or a JSON message; a minimal schema-valid JSON object for `output_config.format`; a `char_location` citation (`citations_delta` when streaming) for documents with citations enabled; simulated prompt caching on system blocks (`cache_read_input_tokens` on the second identical prefix). It does not simulate caching of message blocks (policy documents) and counts image data as text tokens.

**Scenarios** — put `[[mock:<scenario>]]` in a user message (e.g. in the plan's notes) or set `MOCK_SCENARIO`:

| Scenario | Exercises |
|---|---|
| `ok` | Happy path (`MOCK_TEXT` or a default) |
| `refusal` / `refusal-midstream` | Refusal before / after partial output → `[[refusal]]` / 422 |
| `max_tokens` | Cut off → `[[truncated]]` / 502 `truncated` |
| `fallback` | Server-side fallback block; `model` becomes `claude-opus-5`, `usage.iterations` has a `fallback_message` |
| `midstream-error` | SSE `error` event after partial text → `[[error:upstream_overloaded]]` |
| `error-400` / `-401` / `-429` / `-500` / `-529` | HTTP errors → 502 / 500 / 503 / 503 / 503 JSON (the SDK retries 429/5xx once) |
| `slow` | 200 ms per chunk (client aborts, time budget mid-stream) |
| `slow-start` | Waits `MOCK_SLOW_START_MS` (5000) before answering (time budget before output, early client aborts) |

`GET /_mock/stats` returns counters and a summary of the last request (model, `max_tokens`, effort, betas, fallbacks, breakpoints, structured); `POST /_mock/reset` clears the cache simulation.

**Verified with this setup (Oct 2026):** every endpoint in demo mode (formats, labels, 400/401/403/405/413/415/429); every scenario above through a real dev server for the stream and the structured, citations and vision endpoints; per-locale `max_tokens`; the time budget (stream `[[truncated]]`, JSON 504) and browser-disconnect cancellation of the upstream call; the staff-key flow (header, cookie, demo sample exemption); prompt-cache reads on repeated requests. **Not verifiable here:** the real Anthropic API (no key) and production behaviour on Vercel (multi-instance rate limiting, streaming through Vercel's edge, `request.signal` on disconnect).

## Going live checklist

1. **API key in the company's name.** Create the Anthropic Console account / organisation for Local Host LLC (company billing), a workspace for the website, and an API key there. Never use a personal key.
2. **Set `ANTHROPIC_API_KEY` on Vercel** (Production; leave Preview without a key unless previews should spend money) and redeploy. The site switches from demo to live automatically.
3. **Optionally set `ANTHROPIC_MODEL`** (default `claude-opus-5-5`). If the chosen model rejects server-side fallbacks, also set `AI_FALLBACKS=off`.
4. **Set `STAFF_ACCESS_KEY`** (`openssl rand -hex 24`) and give it to the team; check that `/api/triage` answers 401 without it.
5. **Set a monthly spend limit in the Anthropic Console** (and usage alerts). This is the real cost ceiling.
6. **Enable Vercel Firewall rate limiting** for `/api/plan`, `/api/photo-match`, `/api/proposal`, `/api/policy-qa` and `/api/triage` (e.g. a per-IP rule of a few requests per minute), because the in-app limits are per instance.
7. **Tune the limits:** start with e.g. `AI_DAILY_CAP=300` and the default `AI_RATE_LIMIT_PER_HOUR=20`; raise them once real usage is known.
8. **Time limit:** `maxDuration` is 300 s (Fluid compute must be on — the default for new projects). If it's off, use 60 s and `AI_TIME_LIMIT_SECONDS=50`.
9. **Privacy policy:** say that AI features send the visitor's text, photo or pasted email to Anthropic for processing, and that voice input uses the browser's speech service.
10. **Smoke test each feature live** (en and ka), and check the Vercel logs for `[ai] … cache_read=` (should be > 0 from the second request), the durations and any `time limit` warnings. Have native speakers review ka/pl/it/de answers.

## Adding a new AI feature — checklist

1. Create `src/pages/api/<feature>.ts` with `export const prerender = false`.
2. `const g = await guard(context, { maxBytes })`; return `g.response` if `!g.ok`. Validate `g.body` strictly (`asText` / `asInt` / `asOneOf` / `asList`, or a `validate…Request()` in `src/lib/ai/client/<feature>.ts` shared with the browser) and return `error(400, 'bad_request', …)` on failure.
3. Locale: `pickLocale(g.body.locale, context.request)`.
4. **Demo:** `demoTextResponse(fixture, { headers: g.headers })` or `json(fixture, { mode: 'demo', headers: g.headers })`, with a visible sample label.
5. **Live text:** `return streamClaude({ feature, instructions, messages, locale, context, maxTokens, effort: 'low', signal: context.request.signal }, { headers: g.headers })`.
6. **Live JSON:** `runStructured({ …, schema, validate })` (structured output) or `callClaude({ … })` (plain text, e.g. citations). If `!r.ok`, return `structuredErrorResponse(r, g.headers)`. Write schemas with `enum`s and descriptions; `strictSchema()` adds `additionalProperties: false` and `required`; avoid `minLength`, `maximum`, `pattern` and similar.
7. Size `max_tokens` per locale (thinking counts; Georgian needs much more), pick one effort, and keep `instructions` stable.
8. Untrusted text: only in `messages`, inside a delimiter it cannot close, labelled as data. Chat history goes through `sanitizeHistory()`.
9. In the browser use `postAiStream` / `postAiJson`, follow the [rendering rules](#rendering-rules-for-the-ui), and handle `refusal`, `truncated`, `error`, `retryAfter` and `mode === 'demo'`.
10. Test in demo mode, then live against the mock (all scenarios), then run `npx astro check`.

## Known limitations

- Rate limits and the daily cap are per instance and in memory (see above); units are taken before validation.
- If Fluid compute is disabled (60 s limit on Hobby), very long plans and proposals may be cut short by the time budget (see [Timeouts](#timeouts-and-vercels-time-limit)).
- The model sometimes needs nudging to keep Georgian answers fully in Mkhedruli; `languageInstruction('ka')` asks for it explicitly, but native review of outputs is still recommended.
- Research JSON and the knowledge base are read at **build time**; updating them requires a redeploy.
- After a server-side fallback the answer comes from another model (without Opus 5.5's thinking); quality may differ slightly. `usage.iterations` and the logs show when it happened.
