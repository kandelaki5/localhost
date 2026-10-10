# Design direction — decided

**Base: "Caucasus Quarterly" (editorial)** — `design/directions/editorial/` (index.html + README.md + screenshots).
Port its system (paper/ink palette, Fraunces + DM Sans + Noto Serif/Sans Georgian + JetBrains Mono, running heads, figure captions, perforated stamp frames, schematic map, split-flap board) into Astro components and tokens. Judge scorecard: editorial 58 vs stamp/cinematic lower — it is the most trustworthy for European B2B buyers, the best typography incl. Georgian, and the easiest to re-skin for the owner's designer.

## Required changes to the editorial base

1. **Logo: the owner's chosen logo** (sun/host over two green hills, "LOCAL HOST · GEORGIA" — Option 2, see `docs/BRIEF.md` §4) everywhere (nav, 2015 seal, footer) — always load the SVGs from `src/assets/brand/` (they are being replaced in place by the vector redraw; never copy their path data into components, never draw the Open Door or old pin mark). Brand colour tokens should follow the chosen logo: sun red-orange (`#DD341F` core, gradient `#F57045 → #BC171D`), hill greens `#0E643D` / `#189659` / overlap `#138450`, wordmark ink (dark green-black).
2. **Bring brand greens back.** Footer + dark bands in Forest `#0D3A24`; accent italics, section rules and links in green-ink `#0F6533` / brand green `#13783C`; light green `#2BB34B` decorative only. Red stays "the sun/pin" accent (logo pin, active nav dot, map pin, quote marks, primary AI CTA sparkle). Small red text uses red-ink `#B3171E` (AA).
3. **Tone down the conceit**: no "Vol. XI"; no giant Mkhedruli watermarks that read as Latin glyphs (e.g. ვ≈3). Section running heads lead with a Latin number ("04"), Georgian numeral letter small beside it.
4. Fraunces weight ≥ 360 below 40 px; Noto Serif Georgian ≥ 400 at small sizes.
5. Mobile: Caucasus triptych stacks to one column.
6. Board: working TBS/KUT tabs (re-flap on switch), "Showing N of 20 · All 20 cities" expansion; board exposed accessibly (role=table, row aria-labels). TBS lamps amber, KUT lamps brand-green LED. IATA codes must be correct (Riga = RIX).
7. Research-backed copy only (see below).
8. Section numbering matches nav order.

## Grafts from the runners-up

- **From Stamp (Passport & Postage):** visa/ink stamps for *Meet us* (fair stamps), *Proud member of* (residence-permit rectangles) and *Awards* (round seals) — ink + brand green only, rotation ≤ 2°; **passport-cover footer** in Forest with foil `#D8B86E` accents and faint guilloche, reversed logo and a "Meet us at the stand" strip; Experience stamp frames tinted brand green/red as thin perforated borders (alternating), not solid fills; the logo icon (sun + hills) inside the "Local Host · 2015" perforated seal; red-ink / green-ink small-text tokens.
- **From Cinematic (Highlands):** headline "Three countries. One local host." for the Caucasus section (the new mark is literally a host figure under the sun); ridge-line divider with the red pin on the highest peak (static ink hairline on paper, draws in on scroll only when motion is allowed); place captions with coordinates folded into the "Fig." captions; skip link; hovered country card widens (pure CSS).
- **"Night mode" for the high-tech layer (our addition):** the Connection board section, the AI Trip Designer and the AI Lab page use a dark Forest-night surface (`#0A1F15` → `#0D3A24`) with Cinematic's glowing brand-green ridge line and subtle grid — the "magazine by day, mission control by night" contrast. Everything else stays paper.
- **AI planner as a "travel document builder"** (Stamp): visitors tap country + experience stamps to select them (a postmark "cancels" each selected stamp), write in a "Dear Local Host, …" letter field; demo mode shows a red rubber stamp "SAMPLE ITINERARY — DEMO".

## Page structure (nav order)

Nav: **Caucasus · Experiences · Hosts · Getting here · Meet us · Sustainability · Contact** + language switcher (EN · KA · PL · IT · DE) + CTA **"Plan with AI ✦"** (SVG sparkle).

| # | id | Section | Notes |
|---|----|---------|-------|
| 00 | `top` | Hero | "Where every guest is a gift." + proverb სტუმარი ღვთის საჩუქარია; offer line; CTAs "Start a group request" / "Draft a trip with AI"; B2B fact strip (Est. 2015 · 3 countries, one team · For agencies & tour operators · Travelife Partner) |
| 01 | `caucasus` | Caucasus | Georgia / Armenia / Azerbaijan triptych + schematic map; headline "Three countries. One local host." |
| 02 | `experiences` | Experiences | carousel of 6 stamp cards: Culture, Wine, Trekking, Gastronomy, Pilgrim, Leisure |
| 03 | `hosts` | Hosts We Love | 6 hosts (Sisatura — Marika & Enry; Leila; Vacheishvili Family; Samvel; Aluda; Maia) |
| 04 | `airlines` | Airlines | typography wall of 12 carriers (names in type, never logos) |
| 05 | `connection` | Connection | night-mode split-flap boards TBS / KUT |
| 06 | `meet-us` | Meet us at | 6 fairs as visa stamps + calendar |
| 07 | `members` | Proud member of | GNTA, GTA, CEBG, PIT, ŚIT |
| 08 | `awards` | Awards | Welcome to Georgia! National Tourism Awards — round seals |
| 09 | `sustainability` | Sustainability | Travelife Partner, facts, 4 policy PDFs |
| 10 | `support` | We Support | see content rules |
| 11 | `plan` | Plan with AI | night-mode AI Trip Designer (map + streaming itinerary + voice) |
| 12 | `contact` | Contact | + passport-cover footer |

Extra pages: `/ai-lab/` (night mode; all AI features with live demos), `/styleguide/` (noindex), localized versions under `/ka/ /pl/ /it/ /de/`.

## Verified content to use (from `docs/research/` + `src/data/research-orgs.json`)

- **Travelife:** "Travelife Partner — independently assessed against the Travelife Partner criteria for tour operators and travel agents (recognised since November 2025)." Link the public register https://consumers.travelife.info/?lang=en#register. Never say "Travelife Certified", "certified sustainable" or "carbon-neutral". Official Partner logo is not in the repo → typeset badge "Travelife · Partner" in our type + slot for the official logo (CONTENT-TODO).
- **Awards (Welcome to Georgia! National Tourism Awards):** 2016 — Nominee, "The Fastest Growing Company of the Year" (SME segment); 2026 — Nominee, "Inbound Tour Company of the Year". Template has 4 nominee slots → show the 2 verified seals; the other two go to CONTENT-TODO.
- **Members:** GTA — Georgian Tourism Association; GNTA — Georgian National Tourism Administration; PIT — Polska Izba Turystyki (Polish Chamber of Tourism); ŚIT — Śląska Izba Turystyki (Silesian Chamber of Tourism); CEBG — listed by the owner; most likely the Convention & Exhibition Bureau of Georgia (confirm → CONTENT-TODO).
- **Hosts:** Sisatura — Marika & Enry: family-run Megrelian ethno-village in Chkhoria near Zugdidi (Samegrelo) — traditional houses, a lake and old water mill, Megrelian cooking (ghomi, elarji, gebzhalia), supra with a tamada; guests are greeted at the gate with a shot and a big smile. Leila: the best khinkali, with a life story worthy of an Oscar-winning film. Samvel & family: warm hospitality, lots of laughter, home-grown food. Vacheishvili Family, Aluda, Maia: no verified details — warm copy without specific claims, CONTENT-TODO. Landscape photos only; monogram seals; "Host portraits to follow".
- **We Support:** no verified projects. Render the section as "What we stand behind" with five commitments from their own policy (local families & hosts; nature & protected areas; heritage & customs; fair work; protecting children) and a line "Partner projects will be announced here." Research suggestions (Caucasus Nature Fund, Transcaucasian Trail, NACRES, Elkana, …) go ONLY to CONTENT-TODO, never on the page.
- **Flights + fairs:** `src/data/flights.json` (20 TBS + 20 KUT destinations, verified Oct 2026, plus alternates) and `src/data/fairs.json` (next editions; highlight the next upcoming fair automatically from `nextEdition`). Always show "Direct connections vary by season — ask us for the current schedule." Kutaisi is Wizz Air-only; label far-out airports as researched (Paris-Beauvais, Brussels-Charleroi, Frankfurt-Hahn).
- **Airlines wall:** the owner's 12 names, except **Air France**: it stopped its own Paris–Tbilisi flights in spring 2026, so show **"Transavia · Air France–KLM"** in that slot (Paris-Orly–Tbilisi) and list the question in CONTENT-TODO. Wizz Air = Kutaisi; Pegasus = both airports; never imply a carrier flies a route that `flights.json` doesn't list.
