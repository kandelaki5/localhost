# Local Host — new website brief

This is the single source of truth for everyone building the new **localhost.ge**.
Read it fully before you start. When something here conflicts with the old website, **this brief wins**.

## 1. The company

- **Local Host LLC** ("Local Host", sometimes written "LocalHost") — an **inbound tour operator / DMC** based in Tbilisi, Georgia. Founded **2015**.
- Originally Georgia-only; the new site positions them across the **South Caucasus: Georgia, Armenia, Azerbaijan**.
- Main clients are **foreign travel agencies and tour operators (B2B)** met at European trade fairs, plus groups and individual travellers sent by them. Key markets (from the fairs they attend): **Italy** (BIT Milano, BMT Naples, TTG Rimini), **Poland** (Tour Salon Poznań, TT Warsaw), **Germany** (ITB Berlin). Historically also CIS/Ukraine, Northern Europe/UK/US, Western Europe & Asia.
- Values (from their own Sustainability Policy, 11 Aug 2025): love for Georgia; meaningful, memorable travel; positive impact on local communities and families; protecting nature and heritage; fair employment; Travelife sustainability framework.
- The **old website (http://localhost.ge) is outdated** — it was a "temporary page". Use it only to understand the company. Do NOT copy its old stats (guest/tour counts), old team list or old address.

## 2. The owner's template (the spec)

The owner gave a raw spreadsheet wireframe: `docs/reference/web-site_template.xlsx` (rendered: `docs/reference/template-render-p1.png`, `-p2.png`). It defines a **one-page site** with these sections, in this order:

| # | Section | Template content |
|---|---------|------------------|
| 0 | **Nav** | Logo · Caucasus · Experiences · Hosts · Connection · Airlines · Connection · Members · Awards · Sustainability · Contact |
| 1 | **Caucasus** | 3 photo cards: **Georgia, Armenia, Azerbaijan** |
| 2 | **Experiences** | Carousel with `<` `>` arrows. 6 cards: **Culture, Wine, Trekking, Gastronomy, Pilgrim, Leisure** |
| 3 | **Hosts We Love** | 6 photo cards: **Sisatura: Marika and Enry · Leila · Vacheishvili Family · Samvel · Aluda · Maia** |
| 4 | **Airlines** | 12 airlines shown as **typography** (names set in type, not logos): Turkish, Georgian, AirBaltic, Air France, Aegean, Pegasus, Wizz Air, easyJet, Lufthansa, LOT, Austrian, British |
| 5 | **Connection** | Two **airport departure board designs**: **Tbilisi** and **Kutaisi**, each a grid of 20 cities (4 rows × 5) with direct flights |
| 6 | **Meet us at** | 6 trade fairs (logo + name): **BIT Milano, BMT Naples, ITB Berlin, Tour Salon, TTG Rimini, TT Warsaw** |
| 7 | **Proud member of** | 5 organisations (logo + acronym): **GNTA, GTA, CEBG, PIT, SIT** |
| 8 | **Awards** | "Welcome to Georgia" (logo) + 4 "Award design / Nominee" slots |
| 9 | **Sustainability** | Text; **Travelife** logo + certificate screen; 4 links: Sustainability Policy, Sustainability Report, Excursions Policy, Accommodations Policy |
| 10 | **We Support** | 5 slots (logo + project) |
| 11 | **Contact** | address **A. Bakradze 7, 0159 Tbilisi, Georgia** · phone **+995 514 37 44 33** · email **info@localhost.ge** · web **www.localhost.ge** |

The nav lists "Connection" twice — treat the first as the flights board ("Getting here"/"Connection") and the second as "Meet us" (fairs + memberships). Keep nav compact (≈7 items + CTA); group sections sensibly.

## 3. What we add (owner's wish: "rebuild fully, add AI features")

1. **AI Trip Planner** — visitor picks countries, interests (the 6 experiences), length, month, group type, and writes free text; Claude streams a day-by-day draft itinerary built from Local Host's real experiences/regions, in the page's language, and offers "Send this plan to Local Host" (prefilled email to info@localhost.ge). Must work in **demo mode** (no API key → clearly labelled sample itinerary streamed) so the site can be previewed before they have a key.
2. **Multilingual**: English (default, `/`), Georgian (`/ka/`), Polish (`/pl/`), Italian (`/it/`), German (`/de/`). Translations drafted by us, flagged for native review.
3. Modern fundamentals: mobile-first, fast (static, optimized images, minimal JS), accessible (WCAG AA), SEO (per-language meta, hreflang, JSON-LD `TravelAgency`, sitemap, OG image), HTTPS-ready.
4. Keep old URLs working: PDFs stay at `/assets/policies/*.pdf`; `/sustainabilitypolicy` redirects to `/assets/policies/sustainability.pdf`.

### Designer handoff (important)
The owner has hired a designer who delivers the final visual design in ~2 weeks. Our build is a surprise that shows what's possible — and it must be **trivially re-skinnable** with her design:
- every colour, font, size, radius, shadow, spacing and motion value comes from design tokens (`src/styles/tokens.css`, mirrored to `design/tokens/tokens.json` in Tokens Studio / W3C design-token format for Figma);
- components are small and presentational; all copy lives in `src/i18n/<lang>/*.json`, all data in `src/data/*`;
- a `/styleguide` page (noindex) shows tokens, type scale and every component.

## 4. Brand

- Existing logo: `docs/reference/old-logo.png` — red map pin above two green hills, wordmark **LOCAL HOST**, small Georgian "საქართველო" (Georgia).
- Brand colours sampled from the logo: **red `#D02027`**, **dark green `#13783C`**, **light green `#2BB34B`**.
- Old site used **postage-stamp shaped tiles** for tour types (`docs/reference/old-site-tour-types.png`) — a nice heritage motif.
- A new logo is wanted; concepts are being designed in `design/logo/`. Until one is chosen, the site uses a clean SVG redraw of the current mark.

## 5. Content facts we can rely on

**Hosts** (from the Sustainability Policy, `docs/reference/pdf-text/sustainability.txt` → "Local Communities"):
- **Sisatura — Marika & Enry** (policy spells Henry/Ermine; template spells "Enry" — use "Marika & Enry"): they meet guests "at the gate of Sisatura with a shot of Chacha and a big smile".
- **Leila**: "preparing the best Khinkali while at the same time telling her story of life which could easily be an Oscar-winning movie".
- **Samvel and his family**: "super warm hospitality making you laugh all the time while serving delicious home-grown food".
- (Policy also mentions **Anzor**, who guides guests through his village of **Jokolo** — not in the template.)
- **Vacheishvili Family, Aluda, Maia**: no verified details yet. Write warm copy that makes **no specific factual claims** (no invented locations, dishes, professions) and list them in `docs/CONTENT-TODO.md`.

**Places they love** (policy): mountains of Svaneti, landscapes of Samtskhe-Javakheti, the view of the Caucasus range from Telavi, Martvili Canyon, Paravani Lake, Adjara villages.

**Sustainability facts** (policy + report, Nov 2025): Travelife criteria for tour operators; trained sustainability coordinator; energy use −10.1 % and gas use −36.3 % (Jan–Oct 2025 vs 2024); carbon of international business travel is offset; staff get public-transport passes reimbursed and remote-work days; preference for certified sustainable accommodation and restaurants; no excursions harming people, animals or nature; zero tolerance on child exploitation; partners must comply. Policies: `public/assets/policies/{sustainability,report,excursions,accomodations,inbound}.pdf`.

**Awards**: old site badge — **Nominee, "The fastest growing company of the year in segment", Welcome to Georgia National Tourism Awards, 2016**. Other awards: unverified → research or flag.

**Contact** (new): A. Bakradze 7, 0159 Tbilisi, Georgia · +995 514 37 44 33 · info@localhost.ge · www.localhost.ge.

Research results (flights, fairs, organisations, awards, hosts) land in `docs/research/*.md` — use them when present.

## 6. Photos

- Company photos (owned by Local Host, from the old site), optimized: `src/assets/photos/*.jpg` — tbilisi-1..4, tusheti, vardzia, batumi, georgian-food, kazbegi-gergeti, kazbegi, rtveli-harvest, sighnaghi, mestia, prometheus-cave, borjomi, adjara-1..2, kvevri-1..2, gudauri, okatse-canyon, chaukhi-valley, katskhi-pillar, rabati-castle, svaneti-1..2, truso-valley, david-gareja, ananuri, shatili, bagrati, lopota-lake, mtskheta. Contact sheet: see file names.
- Armenia / Azerbaijan photos: openly licensed (Openverse / Wikimedia Commons), stored in `src/assets/photos/` with attribution in `src/data/photo-credits.json` — credits MUST be shown on the site (footer "Photo credits").
- **Never** generate or use fake photos of the real hosts. Until real host photos arrive, use place/landscape photography or illustrated monograms.

## 7. Honesty rules for copy

- Do not invent facts about real people, partners, awards, certifications, prices or flight schedules.
- If something is unknown, either write it so it makes no specific claim, or leave a clearly marked slot — and always add it to `docs/CONTENT-TODO.md` (what's needed, from whom).
- Flight connections change seasonally — show a small note "Direct connections vary by season — ask us for the current schedule."

## 8. Tech

- **Astro** (v7, installed) + **@astrojs/vercel** adapter (AI endpoint is an on-demand route; everything else prerendered/static) + **@astrojs/sitemap**.
- Vanilla CSS with design tokens (CSS custom properties) in `src/styles/`; component-scoped `<style>` in `.astro` files. No Tailwind.
- Fonts: self-hosted via `@fontsource*` packages already in `node_modules` (Latin + **Georgian** support required — Noto Sans/Serif Georgian are installed). Never load fonts from Google at runtime.
- Images through `astro:assets` (`<Picture>` with avif/webp, responsive widths, lazy below the fold).
- Claude API: `@anthropic-ai/sdk`, model **`claude-opus-5-5`** (env `ANTHROPIC_MODEL` may override), key from env `ANTHROPIC_API_KEY`. Reference docs: `/tmp/claude-0/bundled-skills/2.1.296/43b9fc94f01bbb0df23c512f87065d8d/claude-api/typescript/claude-api/README.md` and `streaming.md`.
- Screenshots: `node scripts/shoot.mjs <url> <out.png> [width] [height] [--full] [--wait=ms] [--selector=css]` (uses preinstalled Chromium). Use it to look at your work — always check desktop (1440) and mobile (390).
- Do not load anything from third-party CDNs at runtime.
