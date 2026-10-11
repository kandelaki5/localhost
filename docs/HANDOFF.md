# Going live — handoff guide

Everything needed to take the new localhost.ge from this repository to the public web, switch on the AI features, and hand the design over to the owner's designer.

## 1. What this is

- A fast, mostly static **Astro** site: one long home page following the owner's template (Caucasus → Experiences → Hosts → Airlines → Connection → Meet us → Members → Awards → Sustainability → We Support → Contact) plus a hero and the **Plan with AI** section, an **AI Lab** page, a photo-credits page, and a `/styleguide/` that exists only in development (`npm run dev`, or a build with `SHOW_DEV_PAGES=1`).
- Five languages: English (`/`), Georgian (`/ka/`), Polish (`/pl/`), Italian (`/it/`), German (`/de/`). Non-English copy is a draft that needs native review (`docs/CONTENT-TODO.md`).
- Six AI features in `src/pages/api/` (see `docs/AI-ARCHITECTURE.md`). Without an API key they run in **demo mode** with clearly labelled sample answers, so the site can go live before the key exists.
- Old addresses keep working: `/assets/policies/*.pdf` and `/sustainabilitypolicy`.

## 2. Run it locally

```bash
npm install
npm run dev            # http://localhost:4321
npm run build          # production build (Vercel output in .vercel/output)
npx astro check        # type check
```

## 3. Deploy on Vercel (free Hobby plan is enough to start)

1. Create a Vercel account for **Local Host** (owned by the company, not by a freelancer) and import the GitHub repository. Vercel detects Astro automatically; no build settings needed.
2. **Fluid compute** must be on (it is the default for new projects). The AI routes are allowed 300 s (`astro.config.mjs`). If Fluid compute is ever turned off, Hobby functions are limited to 60 s — then set `maxDuration: 60` and `AI_TIME_LIMIT_SECONDS=50`.
3. Environment variables (Project → Settings → Environment Variables) — all optional at first:

| Variable | What it does | Suggested start |
|---|---|---|
| `ANTHROPIC_API_KEY` | Turns the AI features from demo to live | add when ready (§5) |
| `STAFF_ACCESS_KEY` | Password for the staff-only email triage tool | a long random string, shared with staff only |
| `AI_DAILY_CAP` | Max live AI requests per day, site-wide | `300` (default) |
| `AI_RATE_LIMIT_PER_HOUR` | Max AI requests per visitor per hour | `20` (default) |
| `ANTHROPIC_MODEL` | Model override | leave empty (`claude-opus-5-5`) |

4. Every push to the branch creates a preview URL — use it to show the owner before touching the domain.

## 4. Point localhost.ge to the new site (DNS at ProService)

Today the domain's DNS is hosted by **ProService** (`ns1/ns2.proservice.ge`), the old site runs on their shared server (`195.54.178.42`), and **email runs on Microsoft 365**.

1. In Vercel: Project → Settings → **Domains** → add `localhost.ge` and `www.localhost.ge` (choose which one redirects to the other; `www.localhost.ge` is the site's canonical URL).
2. Vercel shows the exact records to create. Typically:
   - `localhost.ge` (`@`) → **A** record to Vercel's IP (commonly `76.76.21.21`)
   - `www` → **CNAME** to the target Vercel shows (e.g. `cname.vercel-dns-0.com`)
3. In the **ProService DNS panel**, change **only** those two records (replace the old `A 195.54.178.42`).
4. **Do not touch** the email records: `MX → localhost-ge.mail.protection.outlook.com`, the `autodiscover` CNAME and any Microsoft verification/DKIM records. Changing them would stop company email.
5. HTTPS is issued automatically by Vercel within minutes — this also fixes today's certificate warning (the old server presents a certificate for `www42.proservice.ge`).
6. Keep the old hosting account for a few weeks as a fallback, then cancel it.

**Email recommendation (separate from the website, check with whoever manages Microsoft 365):** the current SPF record is `v=spf1 a mx ip4:195.54.178.42 ~all`. It does not include Microsoft 365's sending servers, so outgoing company mail may be flagged as spam. The usual record for Microsoft 365 is `v=spf1 include:spf.protection.outlook.com -all` (add any other services that send mail as @localhost.ge).

## 5. Switch on the AI

1. Create an **Anthropic Console** account in the company's name (console.anthropic.com), add billing and **set a monthly spend limit**.
2. Create an API key and add it on Vercel as `ANTHROPIC_API_KEY`; redeploy.
3. Set `STAFF_ACCESS_KEY` before announcing the triage tool to staff.
4. Typical cost per request (Claude Opus 5.5, warm cache): trip plan ≈ $0.05, photo match $0.03–0.05, proposal $0.10–0.20, policy question $0.01–0.03, triage $0.03–0.06; the agency connector (MCP) is free. Details: `docs/AI-ARCHITECTURE.md`.
5. Optional: enable Vercel Firewall rate limiting on `/api/*`.

The **AI connector** for travel agencies works without a key: agencies add `https://www.localhost.ge/api/mcp` as a custom connector in Claude (see `docs/MCP.md`).

## 6. For the owner's designer

- Every colour, font, size, spacing, radius, shadow and motion value is a token in `src/styles/tokens.css`; `design/tokens/tokens.json` mirrors them in W3C/Tokens Studio format for Figma (`node scripts/export-tokens.mjs` regenerates it). Re-skinning the site is mostly editing tokens.
- `/styleguide/` (run `npm run dev`) shows tokens, type scale (Latin + Georgian) and every component.
- Components are small and presentational (`src/components/ui/`); copy lives in `src/i18n/<lang>/*.json`; data in `src/data/`.
- Logo: the owner's chosen mark, redrawn as clean vectors in three colour options — `design/logo/chosen/` (site uses Option 2 via `src/assets/brand/`). Four alternative concepts are in `design/logo/` for reference.
- Design direction and reasoning: `docs/DESIGN.md`; original mockups in `design/directions/`.

## 7. Content still needed from the owner

See **`docs/CONTENT-TODO.md`** (top-10 list first): host details and portraits, the other award nominations, the official Travelife Partner logo and certificate, which fairs they attend, native review of translations, and more.

## 8. Keeping data fresh

- Flights (`src/data/flights.json`, verified October 2026) and fairs (`src/data/fairs.json`) change by season — update them twice a year; the boards and the AI connector read them automatically.
- Photos: add new ones to `src/assets/photos/` (they are optimised automatically at build) and their credit to `src/data/photo-credits.json`.
