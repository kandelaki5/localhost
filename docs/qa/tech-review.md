# Technical QA review: localhost.ge (frozen production build)

Date: 2026-10-11. Reviewer: front-end QA pass (read-only, no site files changed).
Build reviewed: `.vercel/output/static` snapshot served at `http://127.0.0.1:4650/`. Source: `/home/user/localhost`.

**How it was tested**
- Accessibility: axe-core 4.x on `/`, `/ka/`, `/de/`, `/ai-lab/` and `/credits/` at 1440 px and 390 px. Then hand checks in Playwright/Chromium: headings, landmarks, keyboard, focus, live regions, contrast on night surfaces, reduced motion, `lang` and alt text.
- Performance: Chrome DevTools Protocol (CDP), cache disabled, 1.6 Mbps down / 150 ms RTT for the slow runs. LCP was read with a `PerformanceObserver`.
  - The Python test server sends files uncompressed. Vercel sends them brotli-compressed, so I re-ran every page through a local brotli server. **Transfer figures below are the brotli ones**, with the uncompressed size in brackets where it matters.
- SEO: parsed `<head>`, JSON-LD, sitemap, robots and assets. Redirects were checked in `astro.config.mjs` and `.vercel/output/config.json`.
- Links: every `href`, `#anchor`, `aria-labelledby`/`aria-controls`/`for` and `<use href>` on the 5 language home pages and `/ai-lab/`.

## Metrics

| Metric | `/` (EN home) | `/ai-lab/` |
|---|---|---|
| Requests, first view | 28 | 13 |
| Transfer, first view | **1.07 MB** | **0.59 MB** |
| Transfer after scrolling the whole page | 1.31 MB (45 requests) | 0.63 MB (30 requests) |
| HTML | 107 KB br (776 KB raw, of which 458 KB is inline SVG) | 74 KB br (375 KB raw, 249 KB inline SVG) |
| CSS (render-blocking `<link>`) | 3 files, 36 KB br (258 KB raw; `HomePage.css` alone is 208 KB) | 2 files, 20 KB br (128 KB raw) |
| JS, initial | 7 files, 6.4 KB br (13.3 KB raw) | 2 files, 2.1 KB br (4.5 KB raw) |
| JS, lazy (loaded when its section is near the viewport) | `planner` 27 KB, `voice` (place index) 44 KB, `client`, `locales`, `types` (77 KB raw in total) | 14 chunks, 53 KB raw in total |
| **Fonts** | **10 files, 764 KB (71 % of first view)** | **7 files, 497 KB (84 %)** |
| Images | First view: 159 KB desktop, 364 KB mobile @3x. After scroll: 18 images, 367 KB. None over 300 KB | 3 images, 15 KB |
| LCP, desktop, no throttling | 0.70 s (Chrome picked a nav link; see P2-1) | 0.29 s (h1) |
| LCP, desktop, 1.6 Mbps / 150 ms | 2.1 s (hero headline). Uncompressed run: 5.4 s | 0.88 s (h1) |
| LCP, mobile 390 @3x, 1.6 Mbps / 150 ms | 2.2 s (hero headline). In the uncompressed run the hero photo (243 KB AVIF) became LCP at 5.5 s | 0.86 s (h1) |
| CLS | ≤ 0.044 | ≤ 0.033 |
| axe violations (both widths) | 3 rules: `color-contrast` (6 nodes), `label-content-name-mismatch` (1), `landmark-unique` (1) | 1 rule: `landmark-unique` (1) |
| Internal links and anchors | 0 broken | 1 missing anchor (`#top`) |

The `/ka/` and `/de/` results match `/`. `/credits/` has the same `landmark-unique` violation as `/ai-lab/`.

---

## Prioritised issues

Severity scale:
- **High**: fix before launch.
- **Medium**: fix soon.
- **Low**: polish.

### P1: High

#### P1-1. Font payload is 764 KB on the home page (71 % of all bytes), and 235 KB of it is loaded for five Polish letters
- **Severity:** High (performance)
- **Pages:** all. The home page is worst.
- **What's wrong:**
  - Fraunces is loaded as the `full` variable font (opsz + wght + SOFT + WONK), and both normal and italic are loaded. Each style comes in a `latin` and a `latin-ext` file:
    - latin: 121 KB normal, 150 KB italic
    - latin-ext: 105 KB normal, 130 KB italic
  - On the English home page, the latin-ext files download only because of "**Ś**IT", "**Ś**l**ą**ska Izba Turystyki" (Members) and "Pozna**ń**" (Meet us).
  - Also loaded on the first view: DM Sans latin-ext (31 KB) and JetBrains Mono latin-ext (15 KB).
  - The IT, DE and KA home pages show the same Polish names, so they almost certainly pull the same files. I only measured EN.
  - The fonts compete with the hero photo for bandwidth on slow connections.
- **Source:** `src/styles/fonts.css` lines 16–24 (`@fontsource-variable/fraunces/full.css`, `full-italic.css`).
- **Fix:** the design really uses the SOFT and WONK axes (`--fvs-*` in `src/styles/tokens.css:169-172`), so keep `full`, but:
  1. Self-host one subset per style with `pyftsubset` (fonttools), covering Basic Latin, Latin-1 and the Latin Extended-A letters used in PL/DE/IT (`ąćęłńóśźżĄĆĘŁŃÓŚŹŻ`). Drop the separate latin-ext and vietnamese files. Expected saving: about 200–235 KB per page.
  2. Or, at minimum, set `.permit__native`, `.permit__acr` and `.fair__city` on non-Polish pages in DM Sans, or with `font-synthesis` fallback, so the latin-ext files are not triggered.
  3. Consider instancing SOFT to a fixed value. Only the caption style uses `SOFT 30`.

#### P1-2. 458 KB of inline SVG in every home page's HTML; the footer guilloche alone is 163 KB on every page
- **Severity:** High (performance and parse cost on mobile)
- **Pages:** all. The guilloche is also on `/ai-lab/`, `/credits/` and the 404 page.
- **What's wrong:** 176 inline `<svg>` on the home page. The largest:
  - `site-footer__guilloche`: 163 KB
  - `cmap__svg` (Caucasus map): 55 KB
  - `nmap__svg` (Plan night map): 30 KB
  - `passport__guilloche`: 16 KB, twice
  - `lseal__laurel`: 16 KB, twice
  - `lseal__engraving`: 10 KB, twice
  - The two maps also repeat the same 3.6 KB country path 8 times.

  Brotli shrinks the transfer to 107 KB, but the browser still parses about 0.8 MB of markup. None of it can be cached between pages.
- **Source:**
  - `src/components/Footer.astro:67-76` (generated `guilloche` paths)
  - `src/components/sections/caucasus/CaucasusMap.astro`
  - `src/components/sections/plan/NightMap.astro`
  - `src/components/sections/awards/LaurelSeal.astro`
  - the passport component in Connection/Hosts
- **Fix:**
  1. Emit the guilloche once, as a static file (`public/brand/footer-guilloche.svg`) or an Astro endpoint like `apple-touch-icon.png.ts`. Reference it with `background-image` or `<img alt="" aria-hidden="true">`. That file is cached across pages, and each page loses about 160 KB of raw HTML.
  2. Do the same for the passport guilloche and the laurel.
  3. For the maps, put shared country outlines in one hidden `<svg><symbol id="…">` sprite and use `<use href="#…">`.

### P2: Medium

#### P2-1. The hero entrance animation hides the real LCP element
- **Severity:** Medium (performance)
- **Pages:** all home pages
- **What's wrong:**
  - The hero headline lines and photo start at `opacity:0`/clipped (`animation: … both`, with delays up to 1.1 s).
  - On a fast desktop, Chrome therefore reported a 1,940 px² nav link ("Sustainability") as the LCP. The headline and photo are actually visible only after the curtain and rise animations end.
  - Field LCP will be timed by the animation, not by the network.
- **Source:** `src/components/sections/Hero.astro:540-600` (`hero-rise`, `hero-curtain`, `hero-fade`).
- **Fix:** animate `transform` (and `clip-path` on the photo) but not `opacity`, and start the h1 at opacity 1. Or drop the delay on the first headline line. Keep the existing `prefers-reduced-motion` override.

#### P2-2. Dev harnesses and the styleguide are shipped to production
- **Severity:** Medium (technical and SEO hygiene)
- **Pages:**
  - `/ai-lab/dev/{trip-designer,photo-match,proposal,policy-qa,triage,mcp}/`
  - `/styleguide/` (381 KB)
- **What's wrong:**
  - These pages are correctly left out of `sitemap-0.xml` and carry `noindex,nofollow`, but they are publicly reachable.
  - `/ai-lab/dev/triage/` is the staff inbox-triage UI.
  - `robots.txt` disallows `/styleguide/` and `/ai-lab/dev/`. A crawler that obeys `robots.txt` never fetches these pages, so it never sees their `noindex`. If someone links to them, the bare URLs can still be indexed.
- **Source:**
  - `src/pages/ai-lab/dev/*.astro`
  - `src/pages/styleguide.astro`
  - `public/robots.txt`, or wherever `robots.txt` is generated
- **Fix:**
  1. Don't build them for production. For example, move them to `src/dev-pages/` and inject them only in dev with an integration (`injectRoute` when `command === 'dev'`). Or add a post-build step: `rm -rf .vercel/output/static/{styleguide,ai-lab/dev}`.
  2. Then remove those two `Disallow` lines from `robots.txt`.

#### P2-3. Text contrast on the Members "permit" cards
- **Severity:** Medium (WCAG 1.4.3, axe `color-contrast`)
- **Pages:** `/`, `/ka/`, `/de/` (and `/pl/`, `/it/`), both widths
- **What's wrong:**
  - `.permit__site`: `#3e8259` on `#fbf8f1` gives **4.35:1** at 10.5 px. It needs 4.5:1. Cause: `opacity: 0.8`. Three nodes.
  - `.permit__mrz`: 2.57:1. This line is `aria-hidden` decoration, so WCAG technically exempts it, but axe still flags it.
- **Source:** `src/components/sections/members/Permit.astro:270-278` (`.permit__site { opacity: 0.8 }`) and `:288-297` (`.permit__mrz { opacity: 0.55 }`).
- **Fix:** set `.permit__site` to `opacity: 1`, or use `--color-green-ink` at full strength. For a clean axe run, raise the MRZ opacity to about 0.8 or exclude it.

#### P2-4. The native file input appears when the Photo Match drop zone gets keyboard focus
- **Severity:** Medium (visual focus bug)
- **Page:** `/ai-lab/` (and its localised copies), Photo Match
- **What's wrong:**
  - The global `.visually-hidden` rule is the *focusable* variant: `.visually-hidden:not(:focus):not(:active)`.
  - When the visually-hidden `<input type="file">` receives Tab focus, it un-hides. A raw grey "Choose File · No file chosen" control then appears across the top of the styled drop zone. Screenshot: `out/focus-file.png` in the scratch folder.
- **Source:** `src/styles/global.css:286`, used by `src/components/ai-lab/PhotoMatch.astro:98` and `:106` (the camera input).
- **Fix:** give these inputs a non-focus-revealing class, e.g. `.lab-drop__input { position:absolute; inset:0; opacity:0; width:1px; height:1px; }`. The visible focus ring already comes from `.lab-drop:focus-within`.

#### P2-5. Two navigation landmarks are both named "Choose a language"
- **Severity:** Medium (axe `landmark-unique`)
- **Pages:** all, at desktop width
- **What's wrong:** the header switcher (`.langs--inline`) and the footer switcher are both `<nav aria-label="Choose a language">`. Screen-reader landmark lists show two identical entries.
- **Source:** `src/components/ui/LangSwitch.astro:25` (`aria-label={t.aria.languageNav}`), used by `Header.astro` and `Footer.astro`.
- **Fix:** add a `label` prop. In the footer, pass for example "Language (footer)". Or render the footer copy as `<div role="group">` instead of a second `<nav>`.

#### P2-6. hreflang uses region codes only
- **Severity:** Medium (international SEO)
- **Pages:** every page; the sitemap too
- **What's wrong:**
  - hreflang values are `ka-GE`, `pl-PL`, `it-IT` and `de-DE`. These tell Google the pages target only Georgia, Poland, Italy and Germany.
  - German speakers in Austria or Switzerland, and Italian speakers in Ticino, match no alternate and get `x-default` (English).
  - Positives: the set is complete (5 languages + `x-default`), it is reciprocal on every home page and on `/ai-lab/`, and every canonical points to itself.
  - Negative: the sitemap `xhtml:link` alternates omit `x-default`.
- **Source:** `src/i18n/index.ts:34ff` (the `bcp47` field is used for hreflang at `:249`) and `astro.config.mjs` (sitemap `i18n.locales`).
- **Fix:**
  1. Use language-only codes for hreflang (`ka`, `pl`, `it`, `de`, `en`). Keep the region form only for `og:locale` and `<html lang>` if you like.
  2. In `astro.config.mjs`, set `locales: { en:'en', ka:'ka', pl:'pl', it:'it', de:'de' }`.

### P3: Low

#### P3-1. Travelife badge: visible text is not in the accessible name
- **Severity:** Low (axe `label-content-name-mismatch`)
- **Pages:** all home pages
- **What's wrong:** the visible spans "Travelife", then a dot, then "Partner" have no space between them in the DOM ("TravelifePartner"). So axe can't find the visible text inside `aria-label="Travelife Partner: check our entry… (opens in a new tab)"`. This affects voice-control users.
- **Source:** `src/components/sections/sustainability/Badge.astro:28-32`
- **Fix:** add `{' '}` between the name, dot and level spans, or put a real space inside `.tl-badge__dot`.

#### P3-2. "Back to top" points at `#top`, which doesn't exist off the home page
- **Severity:** Low (broken anchor)
- **Pages:** `/ai-lab/`, `/credits/`, 404, and every localised copy
- **What's wrong:**
  - The footer link `href="#top"` has no `id="top"` target on these pages.
  - HTML's special-case still scrolls to the top, but keyboard focus stays in the footer.
  - On the home page, `#top` is the hero `<section>`.
- **Source:** `src/components/Footer.astro:185`
- **Fix:** use `href="#main"` (it exists on every page, and the skip link already uses it). Or put `id="top" tabindex="-1"` on the site header in `src/components/Header.astro`.

#### P3-3. Meta descriptions and titles are too long for search results
- **Severity:** Low (SEO)
- **Pages:** all
- **What's wrong:**
  - Description lengths:
    - EN 203
    - KA 214
    - PL 214
    - IT 202
    - DE 226
    - `/ai-lab/` 222
    - `/ka/ai-lab/` 256

    Google truncates at about 155–160.
  - The DE title is 82 characters; about 60 is shown.
- **Source:** `src/i18n/*/common.json` (`meta.description` and title strings) and `src/i18n/*/ai-lab.json`
- **Fix:** trim descriptions to ≤ 155 characters, starting with the value proposition. Shorten the DE title, e.g. "Local Host · Incoming-DMC für Georgien, Armenien & Aserbaidschan".

#### P3-4. The 404 page has a canonical URL
- **Severity:** Low (SEO hygiene)
- **What's wrong:** `404.html` sends `noindex,nofollow`, which is correct. But it also has `<link rel="canonical" href="https://www.localhost.ge/404/">`, `og:url` pointing to `/404/`, and the generic site description.
- **Source:** `src/layouts/Base.astro`. The canonical and OG URL are emitted even when `noindex` is set.
- **Fix:** skip the canonical and `og:url` when `noindex` is true.

#### P3-5. No `/favicon.ico`
- **Severity:** Low
- **What's wrong:**
  - `/favicon.ico` returns 404. Some clients request it blind: older browsers, RSS readers, some crawlers.
  - What does exist: `/favicon.svg`, `/favicon-32x32.png` and `/apple-touch-icon.png` (180×180) all return 200 and are linked. There is no web manifest (optional).
- **Source:** `src/pages/` (next to `favicon-32x32.png.ts`)
- **Fix:** add `favicon.ico` (32×32) to `public/`, or as an endpoint.

#### P3-6. The hero image's fallback `src` is the 2400 w original (1.38 MB JPEG)
- **Severity:** Low (performance)
- **Page:** all home pages
- **What's wrong:**
  - The `srcset` offers 1920 w and 2400 w for an image that is `32vw` on desktop.
  - The `<img src>` fallback, which crawlers and non-`srcset` clients use, is the 2400 w JPEG.
  - Mobile @3x pulls the 1440 w AVIF (243 KB). That photo is the mobile LCP candidate.
  - The build contains 53 JPEGs over 300 KB. Chrome downloaded **no** image over 300 KB on any page tested; those files only serve browsers without AVIF/WebP support.
- **Source:** `src/components/sections/Hero.astro`, the `<Picture>`/`Figure` widths (via `src/components/ui/Figure.astro`)
- **Fix:** set `widths={[400,640,860,1100,1440]}` and a 1100 w fallback `src`. Optionally make the mobile `sizes` value slightly smaller so @3x phones pick 1100 w.

#### P3-7. The `/sustainabilitypolicy` redirect only matches the exact path
- **Severity:** Low
- **What's working:** the redirect is in `astro.config.mjs` and compiles to `.vercel/output/config.json` as a **301** from `^/sustainabilitypolicy$` to `/assets/policies/sustainability.pdf`. All five PDFs under `/assets/policies/` return 200: `sustainability`, `report`, `excursions`, `accomodations`, `inbound`.
- **What's wrong:** `/sustainabilitypolicy/`, with a trailing slash, does not match. It falls through to the 404 route. The static test server can't run redirects, so this was checked in config.
- **Source:** `astro.config.mjs`, `redirects`
- **Fix:** add `'/sustainabilitypolicy/': '/assets/policies/sustainability.pdf'`. Note that `accomodations.pdf` is misspelled, but it's the legacy URL, so keep it.

#### P3-8. Fair and member headings include link boilerplate
- **Severity:** Low (accessibility, heading navigation)
- **Pages:** all home pages (Meet us, Members)
- **What's wrong:** the h4 headings read, for example, "BIT Milano — official website (opens in a new tab)" and "GNTA — Georgian National Tourism Administration — official website (opens…)". Navigating by heading becomes noisy.
- **Source:** `src/components/sections/meet-us/FairStamp.astro`, `src/components/sections/members/Permit.astro`
- **Fix:** keep only the name in the heading. Put the link next to it, or wrap the card in the link with the heading inside and the "official website / new tab" text outside the `<hN>`.

#### P3-9. Georgian fonts load on every English page (~107 KB)
- **Severity:** Low (by design)
- **Pages:** all EN/PL/IT/DE pages
- **What's wrong:**
  - Georgian glosses are a design motif everywhere: `shead__ka`, the footer greeting, the hero gloss, the card glosses. They are all correctly marked `lang="ka"`. So Noto Serif Georgian (65 KB) is genuinely needed.
  - Noto Sans Georgian (42 KB), however, renders only the 7-glyph "ქართული" label in the language switcher on `/ai-lab/` and `/credits/`.
  - Positive: Georgian fonts are preloaded only on `/ka/` pages.
- **Source:** `src/styles/fonts.css:28-45`, `src/components/ui/LangSwitch.astro`
- **Fix (optional):** set the switcher's `langs__native` in the serif Georgian face, which is already loaded. Or ship a tiny glyph subset for it.

#### P3-10. Smaller notes
- **Experiences carousel:** every card is a focusable `<article tabindex=0>` and also holds a link. That's 12 Tab stops for 6 cards. Arrow keys on a card move to the next or previous card and scroll the track, and the counter is an `aria-live` region. Optional: use a roving tabindex so the cards take one Tab stop. Source: `src/components/sections/experiences/carousel.ts`, `ExperienceCard.astro`.
- **JSON-LD:** the `TravelAgency` block is valid. It has `@id`, `name`, `legalName`, `url`, `logo` (200), `image` (200), `description`, `foundingDate`, `email`, `telephone`, a `PostalAddress` and `areaServed` ×3. To add for local rich results: `geo` (lat/long), `openingHoursSpecification`, `sameAs` (social profiles) and optionally `priceRange`. Source: `src/layouts/Base.astro`.
- **OG image:** `og-default.png` is 376 KB. A 1200×630 JPEG at q80 would be about 120 KB. The `og:image` and `twitter:image` URLs return 200.
- **Credits page:** all 44 thumbnails have `alt=""`. That's fine, because each one sits beside a caption that names the photo. Keep it that way.

---

## Passed checks

**Headings**
- Exactly one `h1` on each of the 5 pages, at both widths.
- No skipped levels anywhere.
- The only visually hidden heading is the Plan output's "Draft itinerary" `h3`, before a draft exists. That's fine.

**Landmarks and skip link**
- `header`, `main#main` and `footer` are present. Navs are labelled "Main", "Footer" and "Choose a language".
- Every section is a labelled `section`.
- The skip link is the first focusable element. It is visible on focus at 16/16 px and moves focus to `#main`.

**Keyboard and focus**
- Visible focus: a 2 px outline on every focusable element tested. On night surfaces the outline is green or gold.
- Custom checkboxes, radios and the range slider show the ring on the styled pill (checked by screenshot).

**Header navigation**
- Logical order: brand → 7 nav links → 5 language links → "Plan with AI" → hero call to action.

**Mobile menu (390 px)**
- It is a native modal `<dialog>`. Opening it moves focus to "Close menu".
- Focus stays trapped: 20 Tabs cycle inside the dialog.
- Esc closes it and returns focus to the burger button. `aria-expanded` stays in sync.
- Tapping a link closes the menu and scrolls to the section.

**Connection board**
- Uses the correct ARIA tabs pattern: `tablist` named "Airport", roving `tabindex`, ←/→ wrap, Home/End work, selection follows focus, and the tab panel is focusable.

**Plan stamps**
- They are `<button aria-pressed>` and toggle with Space and Enter.
- Accessible names are clean ("Georgia"); the decorative ring text is `aria-hidden`.
- The rest of the Plan form follows in a logical order.

**AI Lab forms**
- Every input, select and textarea has a label.
- Tab order follows the visual order.
- Sample-photo buttons have names such as "Vineyards in Tuscany — Match this photo".

**Live regions (streaming output)**
- Plan: `role=status` announces phase changes ("Writing day n of N"), and the sheet has `aria-busy` while streaming. Streamed text is not live, so there is no token-by-token chatter. Errors use `role=alert`.
- AI Lab:
  - Each tool has a visually hidden `role=status`, and its root has `aria-busy`.
  - Policy Q&A uses `role=log`. The answer is appended once, not streamed.
  - The character counter is `aria-live=off`.

**Night-section contrast**
- I computed the contrast of every visible text node on a dark background: Plan, Connection, footer and the AI Lab. 0 failures.

**Reduced motion**
- With `prefers-reduced-motion: reduce`: 0 running animations on `/` and `/ai-lab/`, all reveal elements visible, and `scroll-behavior` is `auto`.
- Without it there are 247 animations, including the infinite `nmap-pulse`. That's acceptable.

**`lang` attribute**
- On EN and DE pages, 0 Georgian text nodes or attributes are missing `lang="ka"`.

**Alt text**
- The 17 home-page images have specific, descriptive alt text, e.g. "Khor Virap monastery on a hill above the Ararat plain…". None are file names or "image of…".

**Layout**
- No horizontal overflow at 360 px or 390 px on any page tested.

**Links**
- Of 298 unique `href`s on 6 pages, every internal URL returns 200.
- All `#anchors` resolve except `#top` on `/ai-lab/` (P3-2).
- All `aria-labelledby`, `aria-controls` and `for` references resolve.
- No duplicate ids.
- I listed 24 external links but did not fetch them (offline review).

**SEO**
- Every page has a self-referencing canonical.
- `og:*` is complete: type, site_name, title, description, url, locale, 4 × `locale:alternate`, image at 1200×630, and image alt.
- `twitter:card` is `summary_large_image`.
- `<html lang>` is correct for each language.
- `sitemap-index.xml` → `sitemap-0.xml` lists 15 URLs (5 languages × home/ai-lab/credits) and excludes `/styleguide/` and `/ai-lab/dev/`.
- `robots.txt` points to the sitemap.
- The 404 route in `config.json` returns status 404 with `404.html`, which has one `h1` and language links.

**JavaScript**
- No render-blocking JS: all scripts are modules, plus one tiny inline head script.
- Heavy features load on demand: the planner and voice/place index load when `#plan` nears the viewport, and the AI Lab tools load the same way. No large unused JS.
