# Visual QA review: frozen build (http://127.0.0.1:4650)

Reviewer: senior web designer, read-only pass · 2026-10-11
Scope: home page in EN at 1440 / 1024 / 768 / 390 / 320 px; KA and DE at 1440 and 390; header, mobile menu (EN 390, 320 and 1024; KA and DE 390), footer, `/ai-lab/` (EN, DE, KA at 1440 and 390), `/credits/` and `/404.html`.
Screenshots: `design/build/qa-visual/`. Each section was captured on its own (`<lang>-<width>-<id>.png`) with the sticky header hidden. Tall mobile captures are re-tiled side by side in `tiles/`, and detail crops are in `crops/`. Automated measurements are in `<lang>-<width>-report.json` and `en-390-small-targets.txt`.

## Overall verdict

The site reads as **one coherent magazine**. It keeps the paper and ink palette, the running heads with "NN + Georgian numeral", a Fraunces display with green italic accents, figure captions and stamp/seal grafts all the way down. The night surface is limited to Connection, Plan, the AI Lab and two small AI teaser cards (in Sustainability and Contact). The craft is high: no page has horizontal scroll at any tested width (`scrollWidth == innerWidth` everywhere), there are no broken images and no JS errors. Georgian renders correctly in Noto Serif/Sans Georgian, with no faux italics and the `--fs-scale-ka` scaling applied.

The remaining problems are mainly:
- (a) the Plan stamps on phones,
- (b) one systemic rhythm issue in `SectionHead`,
- (c) a handful of "placeholder" elements that undercut the finished feel on a surprise launch,
- (d) italic accent phrases splitting across lines.

---

## HIGH

### H1. Plan: country names break mid-word on phones, and experience names clip at 320 px
- **Page / section / width:** `/`, `/de/` · `#plan` · 390 and 320 (EN), 390 (DE)
- **What's wrong:** In the three country stamps, `overflow-wrap: anywhere` wins (hyphenation dictionaries are not guaranteed), so the names break in the middle:

  | Width | Lang | Renders as |
  |---|---|---|
  | 390 | EN | **AZERBAIJ / AN** |
  | 390 | DE | **GEORGIE / N**, **ARMENIE / N**, **ASERBAI / DSCHAN** |
  | 320 | EN | **GEO / RGIA**, **ARME / NIA**, **AZER / BAIJ / AN** |

  At 320 the experience stamp label is also cut off: "Gastronon[my]". This is the primary AI call to action of the site, and it looks broken on the most common phone widths.
- **Files:** `src/components/sections/plan/StampToggle.astro` (≈ l. 355–370, `.pstamp--country .pstamp__label`; l. 221 `.pstamp--experience .pstamp__label`) and `src/components/sections/plan/TravelDocument.astro` (`.doc__stamps`, ≈ l. 430 and 898–904)
- **Fix:**
  ```css
  /* StampToggle.astro */
  .pstamp--country .pstamp__label { overflow-wrap: normal; hyphens: manual; }
  @media (max-width: 29.99em) {
    /* show the 2-letter code big, the name small and unbroken */
    .pstamp--country .pstamp__label { font-size: clamp(0.5rem, 2.3vw, 0.625rem); letter-spacing: 0; }
  }
  @media (max-width: 22.49em) {           /* ≤ 360 px */
    .pstamp--experience .pstamp__label { font-size: var(--fs-sm); overflow-wrap: normal; }
  }
  /* TravelDocument.astro: alternative for ≤ 360 px — one horizontal country stamp per row */
  @media (max-width: 22.49em) {
    .doc__stamps:not(.doc__stamps--six) { grid-template-columns: minmax(0, 1fr); }
  }
  ```
  If the outline SVG stays beside the text in the horizontal variant, the full names fit on one line. Recheck in DE ("ASERBAIDSCHAN" is the longest).
- **Screenshots:** `crops/en-390-plan-stamps.png`, `crops/de-390-plan-stamps.png`, `tiles/en-320-plan.png`

### H2. The gap between the section rule and the H2 swings from 86 px to 271 px (SectionHead bottom alignment)
- **Page / section / width:** every section that uses `SectionHead` with a tall aside, at ≥ 1024 px. The worst cases:
  - EN 1440: `#experiences` (rule→H2 139 px) and `#meet-us` (204 px), against 86 px everywhere else.
  - KA 1440: `#experiences` 271 px, `#caucasus` 181, `#meet-us` 183, `#members` 187, `#sustainability` 181.
  - AI Lab: "Sort the inbox before coffee." (~160 px void above the title).
- **What's wrong:** `.shead__body { align-items: end; }` pins the title to the bottom of the intro column. Whenever the intro is long (Georgian) or carries extra controls (the carousel arrows, the "Book a meeting" button), the headline floats down and leaves an empty block under the running head. As a result, the opening rhythm differs from section to section, which is the one thing a magazine must keep constant.
- **File:** `src/components/ui/SectionHead.astro` (`.shead__body`, ≈ l. 128). This is a shared file, so file the change as `docs/requests/<section>.md` for the foundation owner.
- **Fix:**
  ```css
  .shead__body { align-items: start; }
  .shead__aside { padding-top: 0.55em; padding-bottom: 0; } /* intro's first line sits on the title's x-height */
  ```
  Then move the slot content (carousel controls in Experiences, the "Book a meeting" button in Meet us) so it aligns to the bottom of the aside with `margin-top: auto` inside a `display: flex; flex-direction: column` aside, or put it under the title row.
- **Screenshots:** `en-1440-meet-us.png`, `en-1440-experiences.png`, `ka-1440-experiences.png`, `en-1024-meet-us.png`, `crops/ai-lab-1440-2.png`

### H3. Sustainability: the "Certificate image to come" mock document looks unfinished
- **Page / section / width:** `/` · `#sustainability` · all widths (it takes a full screen at 390)
- **What's wrong:** The Partner Certificate card draws grey bars where a document would be, with the caption "Certificate image to come". On a surprise reveal for the owner (and for B2B buyers judging trust), this reads as a wireframe left in production, right inside the Travelife proof.
- **File:** `src/components/sections/sustainability/CertificateCard.astro`
- **Fix:** Until the real scan exists, omit the image well entirely. Render the card as a typeset certificate: Holder / Level / First approved / Valid until, plus "Verify in the register". Optionally add a large typeset `Travelife · Partner` seal (reuse `Badge.astro`). Keep the slot behind a `data.certificateImage` check so it appears once the file lands, and leave the note in CONTENT-TODO.
- **Screenshots:** `crops/en-1440-sust-a.png`, `tiles/en-390-sustainability.png`

---

## MEDIUM

### M1. Italic accent phrases split across lines in display headings
- **Page / section / width:**
  - `#hosts` 390 / 320: "The people your / travellers *write* / *home* about."
  - `#contact` 1440: "Let's host your *next* / *group* together."
  - DE `#awards` 1440: "Anerkannt *im* / *eigenen Land.*"
- **What's wrong:** The coloured italic accent is meant to be read as one unit. When it splits, the last word of line 1 dangles in green italic.
- **Files:** `src/i18n/en/hosts.json` (title), `src/i18n/en/contact.json` (title), `src/i18n/de/awards.json` (title). Alternatively, the shared `src/styles/global.css`.
- **Fix:** Option 1: put a no-break space inside the accent (`*write home*`, `*next group*`, `*im eigenen Land.*` → better `Anerkannt im *eigenen Land.*`). Option 2: a global rule for short accents, `.display em:not(:lang(ka)) { white-space: nowrap; }`, after checking that no accent is longer than a line at 320 (all current EN/DE accents are ≤ 3 words).
- **Screenshots:** `tiles/en-390-hosts.png`, `en-1440-contact.png`, `de-1440-awards.png`

### M2. Placeholder feel: the Support stub and "Place photograph" stickers
- **Page / section / width:** `#support` and `#hosts`, all widths
- **What's wrong:**
  - Support ends with five empty perforated stamp outlines and "Partner projects will be announced here." It looks like an empty album.
  - In Hosts, every one of the six photos carries a "Place photograph" overlay, and the Sisatura photo adds "· Host portraits to follow". The section intro already explains this, so six repetitions make the section look provisional.
- **Files:** `src/components/sections/Support.astro`, `src/components/sections/Hosts.astro` (`src/i18n/*/hosts.json` → `photo.label`)
- **Fix:**
  - Support: remove the blank stamps and turn the line into a quiet invitation, for example `<p class="fig-caption">Partner projects will be announced here — know one we should support? <a>Write to us</a></p>`.
  - Hosts: keep the one disclaimer note under the intro and drop the per-image overlay. Or show it only on the two large photos, as a `fig-caption` below the image rather than on it.
- **Screenshots:** `en-1440-support.png`, `en-1440-hosts.png`, `tiles/en-390-hosts.png`

### M3. Mobile and 1024 hero: the primary CTAs sit below the fold
- **Page / section / width:** `#top` · 390 (CTA at y ≈ 1250 px, about 1.5 screens down) and 1024 (CTA at y ≈ 895 in a 900-high viewport)
- **What's wrong:** On phones the order is headline → proverb → full-height photo → 8-line lead → buttons. A buyer has to scroll past the photo to find "Start a group request".
- **File:** `src/components/sections/Hero.astro` (shared; file a request)
- **Fix:** Below 48em, reorder the hero grid: headline → lead → CTAs → photo → proverb (`order` on the grid children), and shorten the lead to two sentences on phones (`.hero__lead-more { display: none }` below 30em).
- **Screenshots:** `tiles/en-390-top.png`, `en-1024-header-viewport.png`

### M4. Hero at 1024: the proverb gloss is squeezed into a ~110 px column
- **Page / section / width:** `#top` · 1024 (applies to roughly 64–80em)
- **What's wrong:** "“A guest is a gift from God.” A Georgian saying — and the one house rule…" breaks into 7 ragged lines of 2–3 words, next to the proverb.
- **File:** `src/components/sections/Hero.astro`
- **Fix:** Between 64em and 80em, stack the gloss under the Georgian proverb (`grid-template-columns: 1fr` for the proverb block), or give it `min-width: 16rem`.
- **Screenshot:** `en-1024-header-viewport.png`

### M5. Menu numbers don't match the section numbers
- **Page / section / width:** mobile and tablet menu, all languages (≤ 1024)
- **What's wrong:** The menu numbers its items 01–07, but the running heads on the page say: Meet us = **06** (menu 05), Sustainability = **09** (menu 06), Contact = **12** (menu 07). A magazine's contents page should match its folios (DESIGN.md §8).
- **File:** `src/components/Header.astro` (`.menu__no`; shared)
- **Fix:** Render each item's real section number from `lib/sections.ts` (01, 02, 03, 04, 06, 09, 12). "Getting here" can show "04–05".
- **Screenshots:** `en-390-menu-open.png`, `en-1024-menu-open.png`

### M6. Plan unselected stamps are neutral grey and off-palette, so they read as "disabled"
- **Page / section / width:** `#plan` · all widths
- **What's wrong:** `filter: grayscale(1) brightness(0.62)` turns the unselected stamps into #161616 / #909090. That is pure grey on a forest-night surface, the only non-green neutral in the night palette. The default state of the form therefore looks switched off.
- **File:** `src/components/sections/plan/StampToggle.astro` l. 112 (and the hover state at l. 124)
- **Fix:** Use `filter: saturate(0.35) brightness(0.85);` instead, or drop the filter and set role colours: `background: color-mix(in srgb, var(--color-bg-raised) 70%, transparent); color: var(--color-text-muted);` with the perforation in `--color-rule`. Keep the grayscale only on the country outline SVG.
- **Screenshot:** `crops/en-1440-plan-expstamps.png`

### M7. Plan route map: labels clipped and axis labels colliding on phones
- **Page / section / width:** `#plan` · 390 and 320 (the axis also crowds at 768)
- **What's wrong:**
  - "lack Sea" is clipped on the left and "Caspian S…" on the right.
  - The longitude labels run together ("0°E41°E42°E43°E…").
  - The status line is truncated ("Your route will be drawn h…"), and the "ROUTE MAP" kicker wraps onto two lines at 320.
  - At ≥ 768 the bottom-left corner bracket crosses the "40°E" label.
- **File:** `src/components/sections/plan/NightMap.astro`
- **Fix:**
  ```css
  @media (max-width: 29.99em) {
    .nmap__grat text:nth-of-type(even) { display: none; }          /* every other degree label */
    .nmap__bar { flex-wrap: wrap; row-gap: 0.25rem; }
    .nmap__status { flex-basis: 100%; white-space: normal; }
  }
  ```
  Also move the sea labels inside the viewBox: `x` + `text-anchor="start"` for the Black Sea and `text-anchor="end"` for the Caspian, inset by about 12 units.
- **Screenshots:** `tiles/en-320-plan.png`, `tiles/en-390-plan.png`, `tiles/en-768-plan.png`

### M8. Footer and fair links are too small to tap on phones
- **Page / section / width:** footer and `#meet-us` · 390 / 320
- **What's wrong:** The footer Explore, Policies and language links are 18–22 px tall and the fair website links (`.fair__link`) are 16 px tall, against the ≥ 44 px target in ARCHITECTURE.md §11. Full list: `en-390-small-targets.txt`.
- **Files:** `src/components/Footer.astro` (shared) and `src/components/sections/MeetUs.astro` (`.fair__link`)
- **Fix:**
  ```css
  @media (max-width: 47.99em) {
    .site-footer nav a, .site-footer__policies a, .site-footer .langs__link {
      display: inline-flex; align-items: center; min-height: 2.75rem;
    }
    /* then tighten the list gap so the visual rhythm stays the same */
  }
  .fair__link { position: relative; }
  .fair__link::after { content: ""; position: absolute; inset: -0.75rem -0.5rem; }
  ```
- **Screenshot:** `tiles/en-390-footer.png`

### M9. AI Lab, Proposal builder: a large empty void beside the long form at 1440
- **Page / section / width:** `/ai-lab/` · `#proposal` · 1440 / 1024
- **What's wrong:** The preview ("Your proposal will be typeset here") is about 400 px tall beside a form of about 1,100 px, leaving a dark void about 700 px tall.
- **File:** `src/components/ai-lab/ProposalBuilder.astro`
- **Fix:** Make the preview column `position: sticky; top: calc(var(--header-h, 4.5rem) + var(--space-m)); align-self: start;`. Or give the empty preview `min-height: 100%` with the ghost lines repeated, so the paper fills the column.
- **Screenshot:** `crops/ai-lab-1440-1.png`

### M10. Credits page shows raw Wikimedia filenames as display headings
- **Page / section / width:** `/credits/` · all widths
- **What's wrong:** Entries are titled "20160821T071234 Lat 41 9 48.01728000 N Long 48 7 36.10008000 E", "Shaki KhanPalace 004 3721", "adjara-1" and "adjara-2", in large Fraunces italic. This is the only page where the type system displays machine strings.
- **Files:** `src/components/pages/CreditsPage.astro` (read-only data: `src/data/photo-credits.json`)
- **Fix:** Use the human caption already used by the site's `Figure` (for example "Khinalug, Azerbaijan") as the title. Show the original file title small in mono under a "File" row (`font: var(--fs-2xs)/1.4 var(--font-mono)`). For the `adjara-*` own photos, show "Adjara coast" and so on.
- **Screenshot:** `crops/credits-1440-top.png`

### M11. KA mobile: the primary hero button label wraps onto two lines inside the pill
- **Page / section / width:** `/ka/` · `#top` · 390
- **What's wrong:** "ჯგუფური / მოთხოვნის გაგზავნა" sits on two left-aligned lines inside the dark pill, while the secondary button stays on one line.
- **Files:** `src/components/ui/Button.astro` and `src/i18n/ka/hero.json` (shared)
- **Fix:** Add `.btn { text-wrap: balance; text-align: center; }`, plus `.btn:lang(ka) { font-size: var(--fs-sm); }` below 30em, or shorten the copy to "მოთხოვნის გაგზავნა".
- **Screenshot:** `tiles/ka-390-top.png`

---

## LOW

### L1. Airlines wall: sun dots dangle at row ends
- **Page / section / width:** `#airlines` · 1440 / 1024 / 768
- **What's wrong:** Rows 1 and 2 end with a red dot after "Transavia" and "easyJet". Row 3 does not, because the last item has no separator.
- **Files:** `src/components/sections/Airlines.astro` (`.al__sep`) and `airlines/client.ts`
- **Fix:** At ≥ 48em, switch to `display: grid; grid-template-columns: repeat(4, auto); justify-content: space-between;` and draw the dot as `.al__item:not(:nth-child(4n+1))::before`. Alternatively, in `client.ts`, set `data-row-end` on items whose next sibling has a larger `offsetTop` and hide their `.al__sep`.
- **Screenshot:** `en-1440-airlines.png`

### L2. Support: the five columns don't share a text baseline
- **Page / section / width:** `#support` · 1440 / 1024
- **What's wrong:** Two-line titles ("Local families / and hosts") push their body copy about 25 px below the one-line columns ("Fair work").
- **File:** `src/components/sections/Support.astro` (`.sup__title`)
- **Fix:** `@media (min-width: 64em) { .sup__title { min-height: 2lh; } }`. Alternatively, use `grid-template-rows: subgrid` across the list.
- **Screenshots:** `en-1440-support.png`, `en-1024-support.png`

### L3. Members on phones: the seal covers the ŚIT permit, and the URL breaks
- **Page / section / width:** `#members` · 390 / 320
- **What's wrong:** The Local Host 2015 seal sits on top of the ŚIT permit's MRZ line and frame. At 320, "tourism-/association.ge" breaks onto two lines and the GNTA name takes four lines.
- **File:** `src/components/sections/Members.astro` (and `members/`)
- **Fix:** Below 48em, make the seal `position: static; margin: var(--space-s) 0 0 auto; width: 5.5rem`. Below 22.5em, stack the monogram box above the text (`grid-template-columns: 1fr`) and set `overflow-wrap: anywhere` only on the URL.
- **Screenshots:** `tiles/en-390-members.png`, `tiles/en-320-members.png`

### L4. Footer: the TT Warsaw stamp has no date and sits on the watermark seal
- **Page / section / width:** footer · all widths and pages
- **What's wrong:** Footer stamps drop their date once a fair has started; this is computed at **build time** (`start > Date.now()`). TT Warsaw therefore prints only "TT / WARSAW" while the other five show "MON YYYY". The stamp also sits on the faint round guilloche watermark, which makes it look muddled. Because the dates are baked into a static build, the footer will go stale as fairs pass.
- **File:** `src/components/Footer.astro` (≈ l. 38–45; shared)
- **Fix:** Always print the edition month (`start` regardless of `Date.now()`), or print "ON NOW" for fairs within their dates. Move the watermark to `bottom`/`left` or lower its opacity where it overlaps the stamp row.
- **Screenshots:** `crops/en-1440-footer-stamps.png`, `tiles/en-390-footer.png`

### L5. Caucasus map: label collisions
- **Page / section / width:** `#caucasus` · 1440 / 1024 / 390
- **What's wrong:** "KAZBEGI" overlaps the ridge hatching; "BATUMI" and "Armenia" sit on line work. At 390, "100 km" and the "N" arrow collide and the "N" is clipped at the right edge.
- **File:** the map component in `src/components/sections/caucasus/`
- **Fix:** Give map labels a paper halo: `paint-order: stroke; stroke: var(--color-bg); stroke-width: 3px; stroke-linejoin: round;`. Nudge Kazbegi and Batumi by 6–10 units, and on phones move the north arrow above the scale bar.
- **Screenshots:** `en-1440-caucasus.png`, `crops/en-390-caucasus-map.png`

### L6. Meet us timeline uses "SEPT" among 3-letter months
- **Page / section / width:** `#meet-us` · 1440
- **What's wrong:** en-GB short months give "Sept", while every other month has three letters.
- **File:** `src/components/sections/MeetUs.astro` (`monthName`, l. 48)
- **Fix:** For the axis only, use `.slice(0, 3)` for Latin locales, or `month: 'narrow'` styled with letter-spacing.
- **Screenshot:** `en-1440-meet-us.png`

### L7. Straight and curly apostrophes are mixed
- **Page / section / width:** `#contact` "Let's *work together*." (straight) under the H2 "Let’s host…" (curly); AI Lab copy is mostly straight ("Local Host's", "can't", "isn't")
- **Files:** `src/i18n/en/contact.json` (`b2b.title`), `src/i18n/en/ai-lab-*.json`
- **Fix:** Replace `'` with `’` in user-facing strings. A one-off lint (`grep -nE "[a-z]'[a-z]" src/i18n/en/*.json`) finds them.
- **Screenshot:** `en-1440-contact.png`

### L8. Slightly soft images at 1024
- **Page / section / width:** `#top` and `#hosts` · 1024
- **What's wrong:** `kazbegi-gergeti` and `kvevri-1` are served from the 327 w candidate but drawn at 377 px, because the `sizes` value underestimates the column width at 64em.
- **Files:** `src/components/sections/Hero.astro` and `src/components/sections/Hosts.astro` (`Figure` `sizes`)
- **Fix:** Set `sizes="(min-width: 80em) 30vw, (min-width: 64em) 38vw, 100vw"` (Hero) to match the real column widths, or add a 480 w candidate to `widths`.
- **Screenshot:** `en-1024-header-viewport.png` (see `en-1024-report.json` → `brokenImgs`)

### L9. Small Georgian kickers in KA
- **Page / section / width:** `/ka/` · all sections · 1440 / 390
- **What's wrong:** Georgian kickers and running heads ("ოფისი", "ელფოსტა", "ექვსი გზა") inherit the Latin caps size (`--fs-3xs`, about 11 px). Without uppercase they look a size smaller and weaker than their Latin counterparts. They are still legible; the ≥ 400 weight rule is respected.
- **File:** `src/styles/global.css` (`.kicker:lang(ka)`; shared)
- **Fix:** `.kicker:lang(ka) { font-size: var(--fs-2xs); letter-spacing: 0.02em; }`
- **Screenshot:** `ka-1440-contact.png`

### L10. Night teaser cards inside paper sections
- **Page / section / width:** `#sustainability` "Ask our policies" and `#contact` "Rather sketch a trip first?" · all widths
- **What's wrong:** DESIGN.md limits night mode to Connection, Plan and the AI Lab. These two cards are small and belong to the AI layer, so they read as intentional "windows into the night layer" and are acceptable. Keep it at these two and do not add more.
- **Files:** `src/components/sections/sustainability/AskPolicies.astro`, `src/components/sections/Contact.astro`
- **Fix:** none required. Optionally give both the same corner treatment and header pattern (the Contact card's title is fully italic; the Sustainability card is roman with a sparkle).
- **Screenshots:** `crops/en-1440-sust-b.png`, `en-1440-contact.png`

### L11. Connection board frame overhangs the container by 8 px
- **Page / section / width:** `#connection` · 1440
- **What's wrong:** The board's outer frame starts at x = 56 while the heading, footnote and rules start at x = 64, so its left edge doesn't line up with anything.
- **File:** `src/components/sections/Connection.astro`
- **Fix:** Either bleed deliberately by a full gutter step (`margin-inline: calc(var(--space-m) * -1)`) or align it to the container (`margin-inline: 0`).
- **Screenshot:** `en-1440-connection.png`

---

## Checks that passed

- **Horizontal scroll:** none on `/`, `/ka/`, `/de/`, `/ai-lab/` (EN, DE, KA), `/credits/` or `/404.html` at any tested width (`scrollWidth === innerWidth`). The open menu dialog also does not scroll horizontally.
- **Images:** no broken images. Photo crops are good (Svaneti, Ararat, Baku, Truso, Rtveli).
- **Errors:** no console or page errors on any page.
- **Night-section contrast:** sampled values pass (board labels 6–9 : 1, Plan helper text 7.5–8.5 : 1). The weakest is "Map data: Natural Earth" at about 4.3 : 1 in 10 px mono, which is borderline. Raise it to `--color-text-muted`.
- **Georgian:** Noto Serif Georgian for display and Noto Sans Georgian for UI. Accents keep their colour without a fake slant, and line heights do not collide, even in the three-line KA H1.
- **German:** long words (Aserbaidschan, Incoming-Reiseveranstalter, Nachhaltigkeit) fit in the nav, the running heads and the awards seals at 1440 and 390. The one exception is the Plan stamps (H1).
- **Menu:** the mobile menu is clean in EN, KA and DE. At 1024 the full-width "Plan with AI" pill is very wide (933 px); `max-width: 28rem` would look calmer.
