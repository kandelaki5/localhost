# Local Host for AI assistants (MCP server)

**Endpoint, after deploy:** `https://www.localhost.ge/api/mcp`

## In one minute: what it is and why agencies care

More and more travel agents plan trips with an AI assistant such as Claude. **"Local Host for AI assistants"** lets an agency plug Local Host's own catalog straight into that assistant.

Once an agent connects it, they can ask questions in plain language and get answers from Local Host's own data, not from random web pages:

- *"Which cities fly direct to Kutaisi?"*
- *"What could a pilgrimage group see in Armenia?"*
- *"Is Local Host Travelife-recognised? What exactly can I tell my clients?"*
- *"Draft a 9-day wine trip request for 20 people in September."*

The last one comes back as a ready-to-send email to **info@localhost.ge**. The agent clicks it and sends it, and the Local Host team replies with a programme and a quote.

**Why agencies care**

- **Answers from the source.** Experiences, places, direct flights, trade-fair dates and sustainability facts come straight from Local Host's own data, with the same honesty rules as the website. The assistant gets no prices and no invented claims from it.
- **Faster, more complete requests.** Every request arrives in the same tidy format: countries, interests, length, month, group size and notes.
- **Sustainability checks in seconds.** The approved *Travelife Partner* statement and links to all five policies are always one question away.
- **A talking point at fairs.** Very few DMCs can say "connect us to your AI assistant". It is a concrete, modern reason to remember Local Host at BIT, ITB or TT Warsaw.

**What it costs:** nothing per use. It needs **no Claude API key**, makes no AI calls and only serves data that is already on the website. It runs inside the same Vercel deployment as the site.

**What it does not do:** it does not book, hold, price or send anything, and it collects no personal data. Sending the email is always the agent's own click.

## How an agency adds it to Claude

1. Open Claude (claude.ai or the desktop app) → **Settings → Connectors**.
2. Choose **Add custom connector**.
3. Name it **Local Host** and paste the URL `https://www.localhost.ge/api/mcp`. No sign-in is needed, so leave any OAuth fields empty.
4. Click **Add**. In a chat, make sure the Local Host connector is switched on in the chat's tools/connectors menu, then ask away.

On Claude Team and Enterprise plans, an owner or admin may need to add the custom connector for the organisation before members can switch it on. Claude's menus change from time to time. If a label differs, look for "Connectors" in Settings.

**Other MCP clients.** Any client that supports remote MCP servers over **Streamable HTTP** can use the same URL. Some examples:

- **Claude Code:** `claude mcp add --transport http local-host https://www.localhost.ge/api/mcp`
- **JSON config** (clients that use an `mcpServers` file): `{ "mcpServers": { "local-host": { "type": "http", "url": "https://www.localhost.ge/api/mcp" } } }`
- **Clients that only support local (stdio) servers** can usually bridge with `npx mcp-remote https://www.localhost.ge/api/mcp`.

## Tools

All nine tools are read-only. They carry the MCP annotations `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true` and `openWorldHint: false`. Each tool answers with pretty JSON in `content[0].text` and the same object in `structuredContent`.

| Tool | Inputs | What it returns | An agent might ask… |
|---|---|---|---|
| `list_experiences` | none | The six experiences (Culture, Wine, Trekking, Gastronomy, Pilgrim, Leisure). Each has a tagline, names in en/ka/pl/it/de, countries, typical seasons and who it suits | "What kinds of trips does Local Host run?" |
| `get_experience` | `id`: one of `culture`, `wine`, `trekking`, `gastronomy`, `pilgrim`, `leisure` (required) | The description, highlights, best places with place ids, seasons and ideal travellers | "Which places does Local Host suggest for a pilgrimage group?" |
| `list_places` | `country?`: `GE`/`AM`/`AZ`; `experience?`: an experience id | The 51 catalog places (33 GE, 9 AM, 9 AZ), each with id, region, type, experiences and approximate coordinates | "Which places in Armenia suit a wine group?" |
| `get_place` | `id`: a place id or a plain name such as "Kazbegi" or "Erywań" (1–80 chars, required) | Names in 5 languages, region, type, experiences, approximate coordinates with an OpenStreetMap link, the 5 nearest places (straight-line km) and approximate road times | "What is near Sighnaghi, and how far is it from Tbilisi?" |
| `list_flight_connections` | `airport?`: `TBS` or `KUT` | For each airport: the 20 direct destinations on the departure board, further verified routes, airlines, a `seasonal` flag and `confidence` for each route, and which of the owner's 12 airlines serve it. Always includes the notice "Direct connections vary by season — ask us for the current schedule." | "Which cities fly direct to Kutaisi?" · "Does LOT fly to Tbilisi?" |
| `get_trade_fairs` | none | The six "Meet us at" fairs: city, venue, usual month, last and next known dates, and a status (`on now` / `upcoming` / `next dates not announced yet`) worked out from today's date | "Where can I meet Local Host in Italy this season?" |
| `get_sustainability_commitments` | none | Status **Travelife Partner**, the approved statement, recognised-since and valid-until dates, a public-register link, concrete commitments, places they love and the five policy PDFs. Never says "certified" | "Is Local Host Travelife-recognised? What can I tell my clients?" |
| `get_contact` | none | Company, address, phone, email, website, and what to include in a quote request | "What is Local Host's email and phone?" |
| `draft_trip_request` | `countries`: 1–3 of `GE`/`AM`/`AZ` (required) · `days`: 1–30 (required) · `interests?`: ≤ 6 experience ids · `month?`: `January`…`December` or `flexible` · `groupSize?`: 1–500 · `notes?`: ≤ 1000 chars | A summary; an email (to, subject, body with blanks for the agency's details); a `mailto:info@localhost.ge?...` link; places tied to the chosen experiences; typical seasons; considerations (no prices, cross-border routing, mountain safety); and the note that **the Local Host team will reply** with a programme and quote. It makes no LLM call and gives no prices | "Draft a 9-day wine trip request for 20 people in September." |

The full JSON Schemas are listed live on the dev harness, `/ai-lab/dev/mcp`. That page renders them at build time from the same definitions the endpoint serves.

**Resources (optional):** `local-host://policies/{sustainability, report, excursions, accomodations, inbound}`. Each one returns a short Markdown note with the document's date and a link to its PDF at `https://www.localhost.ge/assets/policies/*.pdf`.

**Server instructions** are sent to the client at `initialize` and passed on to the model. They say what Local Host is and that the server is read-only. They also tell the model never to quote prices, to treat flight and fair data as indicative, and to use only the Travelife Partner statement.

## Try it

- **In the browser:** `/ai-lab/dev/mcp` shows the endpoint, the tool cards and a small JSON-RPC tester. `?run=<tool name>` sends a sample call on load.
- **With curl:**

```bash
URL=https://www.localhost.ge/api/mcp
H=(-H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream')
curl -s "${H[@]}" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}' $URL
curl -s "${H[@]}" -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' $URL
curl -s "${H[@]}" -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_flight_connections","arguments":{"airport":"KUT"}}}' $URL
```

## How it works (developers)

- **File:** `src/pages/api/mcp.ts` (`prerender = false`, so it is a Vercel serverless function). Dependencies: `@modelcontextprotocol/sdk` (1.32.x) and `zod` (4.x, for the input schemas).
- **Transport:** the SDK's `WebStandardStreamableHTTPServerTransport`, which works on web-standard `Request`/`Response`. It runs in **stateless** mode (`sessionIdGenerator: undefined`) with `enableJsonResponse: true`. Every POST gets a fresh `McpServer` and transport. The server is closed after the response. There are no session ids and no SSE.
- **Methods:**
  - `POST`: one JSON-RPC message, or a batch of up to 20. The reply is JSON, or `202` for notifications only.
  - `GET` and `DELETE`: `405` with `Allow: POST, OPTIONS`. The spec allows this for servers without a GET stream or sessions.
  - `OPTIONS`: CORS preflight (`204`).
  - Any other method: `405`.
  - Clients that send `Accept: application/json` only, or no `Accept` header, are accepted too, because every reply is JSON.
- **Data sources:**
  - `src/lib/ai/knowledge.ts`: experiences, countries, travel times, contact, sustainability, and `researchData()`.
  - `src/data/flights.json`, `src/data/fairs.json` and `src/data/research-orgs.json` (the Travelife wording), all read through `researchData()`.
  - `src/lib/ai/places.ts`: places.
  - Research notes are passed on with their URLs stripped. Alternate routes that the research marks as *not flying* are left out (e.g. Frankfurt–TBS until 2027).
- **Adding a tool:**
  1. Add a `server.registerTool(name, { title, description, inputSchema: { …zod… }, annotations: READ_ONLY }, handler)` call in `createMcpServer()`.
  2. Return `ok(data)`, or `toolError(message)` for a recoverable miss.
  3. The dev page and `tools/list` pick it up automatically.
  4. Keep every tool read-only.
- **Logs:** one line per request, e.g. `[mcp] initialize(claude-ai) → 200 3ms` or `[mcp] tools/call(get_place) → 200 2ms`. Logs never include arguments or IP addresses.
- **How it was tested** (dev server on port 4404):
  - The SDK's own `Client` with `StreamableHTTPClientTransport` ran 23 checks: it initialized, listed the tools, called all nine tools, checked the invalid-input path, and listed and read resources.
  - Raw curl JSON-RPC covered `initialize`, `notifications/initialized` → 202, `tools/list`, `tools/call`, batches, 400/403/405/406/413/415, a bad protocol-version header and the 429 rate limit.

## Limitations

- **A snapshot, not live inventory.** The data is bundled at build time. After editing `src/data/*.json` or `knowledge.ts`, redeploy. Flights were researched on 10 Oct 2026. Routes, days and frequencies change, so the tool always adds "Direct connections vary by season — ask us for the current schedule."
- **Fair dates are the organisers' published dates.** Whether the team attends a given edition is confirmed by email.
- **No prices, availability or bookings, by design.** `draft_trip_request` only prepares an email; the agent sends it.
- **English output.** Place and experience names come in en/ka/pl/it/de; the assistant can translate the rest.
- **Policy resources link to the PDFs.** They do not contain the full policy text. *Hosts We Love* is not exposed, because some hosts have no verified details yet.
- **Stateless.** There is no SSE streaming and there are no server-initiated notifications, which these quick read-only tools don't need.
- **The assistant has the last word.** The server instructions and tool outputs steer phrasing (no prices, "Travelife Partner"), but the agency's model writes the final answer.
- **Rate limiting is in memory, per serverless instance, and best effort.** The limits are 60 requests/minute and 1,000/hour per IP. Claude's connector traffic reaches the server from Anthropic's shared IP addresses, so many agencies can share one bucket; that is why the limits are generous. If usage grows, raise `MCP_LIMITS` or move the counters to a shared store such as Vercel KV or Upstash.

## Security notes

- **Public, unauthenticated, read-only.** It serves only data that is already public on the website. There are no secrets, no API key, no database and no stored personal data. It makes no outbound network calls and no LLM calls.
- **CORS `Access-Control-Allow-Origin: *` without credentials.** This is safe because no reply depends on who is asking.
- **Origin check.** A present but malformed `Origin` header gets a `403`. DNS-rebinding protection matters for local servers with private data, and this server has none.
- **Input validation:**
  - Zod schemas on every tool: enums, integer ranges, array and string lengths.
  - At most 64 elements in tool arguments.
  - Request body ≤ 64 KB, checked against `Content-Length` and while streaming.
  - Batches ≤ 20 messages, each counted against the rate limit.
  - Free-text notes have control characters stripped and are capped at 1,000 characters.
  - Unknown tools and bad arguments return a tool error, never a crash.
- **Separate rate limit.** It has its own per-IP buckets, separate from the Claude-backed website features. MCP traffic never uses up visitors' AI quota or the daily Claude cap.
- **Prompt injection.** Tool outputs contain only Local Host's own content. The only text that comes back from the caller is the `notes` field of `draft_trip_request`, and it is returned to that same caller.
- **No email is sent by the server.** The `mailto:` link opens the agent's own mail program.
