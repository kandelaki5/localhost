# Requests from 01 · Caucasus

## Figure: credit on its own line, with links
- File: src/components/ui/Figure.astro
- What: render `credit` as its own line under the caption (no leading " · "), in a small sans (`--fs-3xs`, `--color-text-muted`), and accept an optional `creditHref` / `licenseHref` (or a `credit` object `{ creator, license, sourceUrl, licenseUrl }`) so the creator links to the source page and the licence links to the licence deed (`rel="license"`). CC BY-SA asks for title/author/source/licence. The /credits/ page covers all four, and a linked line under the photo is the best practice.
- Why: Armenia (CC BY-SA 4.0) and Azerbaijan (CC0) plates in the Caucasus triptych, and any section that uses the other openly licensed photos.
- Meanwhile: `sections/caucasus/CountryCard.astro` renders the credit itself in Figure's `caption` slot (`.ccard__credit`, `flex-basis: 100%`), with links built from `src/data/photo-credits.json` and the template `credit` in `i18n/*/caucasus.json` ("Photo: {creator}, {license}").

## Plan: preselect countries from "Plan a trip here"
- File: src/components/sections/Plan.astro (Plan section agent) / integration
- What: listen for `document.addEventListener('localhost:plan-preselect', e => …)`. `e.detail = { countries: ('GE' | 'AM' | 'AZ')[], source: 'caucasus' }`. Preselect (stamp) those countries in the AI trip designer. The event fires on click, just before the browser scrolls to `#plan`.
- Why: each country plate has "Plan a trip here" (`href="#plan"`, `data-plan-country="GE"`). The map notes have "Draft a three-country route" (`data-plan-country="GE AM AZ"`).
- Meanwhile: the links simply scroll to `#plan` (they work without JS, or if nobody listens).

## Map colour tokens (optional, for the designer)
- File: src/styles/tokens.css
- What: role tokens for maps, e.g. `--color-map-land` (paper-50), `--color-map-sea` (paper-300 mixed 72 % into paper-50), `--color-map-home` (brand green 13 % on map land), `--color-map-neighbour` (ink 6.5 % on map land).
- Why: Fig. 4 (and the AI planner's map, if it wants the same look) could then be re-skinned from tokens.css alone.
- Meanwhile: `sections/caucasus/CaucasusMap.astro` defines `--cmap-*` custom properties at the top of its styles, mixed only from role tokens (`--color-bg-raised`, `--color-bg-sunken`, `--color-brand-green`, `--color-text`) with `color-mix()`. No hex values.

## Content TODO
- **Georgia plate photo (`svaneti-1.jpg`)**: which village is it? It looks like Ushguli, but that is unverified (photo-plan.md §3), so the caption only says "Svan towers in Svaneti" and has no coordinates. Once Local Host confirms the village, add it to the caption and pass `coords` in `sections/caucasus/data.ts`. *(Local Host)*
- **Cross-border logistics wording**: the intro says the team arranges the border crossings when a programme combines countries ("…with the border crossings arranged by us"). The notes say "our team arranges the transfers, the timings and the border crossings". Please confirm this matches how Local Host operates in Armenia and Azerbaijan, e.g. own drivers vs. partner hand-over at the border. *(Local Host)*
- **Approximate drive times** (map notes): Tbilisi–Kazbegi ≈ 3 h · Tbilisi–Kutaisi ≈ 3.5 h · Kutaisi–Batumi ≈ 2.5 h · Tbilisi–Yerevan ≈ 5–6 h incl. border · Tbilisi–Sheki ≈ 5–6 h incl. border · Sheki–Baku ≈ 5 h. Source: `TRAVEL_TIMES` in `src/lib/ai/knowledge.ts`. Please confirm these are the figures Local Host quotes to partners. *(Local Host)*
- **Native review of `src/i18n/{ka,pl,it,de}/caucasus.json`**, especially:
  - ka: „ალის კოშკები“ for Baku's Flame Towers; "მეზობლად" as the "next door" tag; "ჩ" as the north-arrow letter.
  - pl: "Płonące Wieże" (Flame Towers); the "Po sąsiedzku" tag; the title "Jeden gospodarz.".
  - it: the title "Un solo padrone di casa."; the "Qui accanto" tag.
  - de: the title "Ein Gastgeber."; the "Nachbarland" tag.
- **Own photos from Armenia and Azerbaijan** (also in photo-plan.md §10): they would replace the openly licensed Khor Virap and Baku photos and remove the attribution lines under the plates. *(Local Host)*
