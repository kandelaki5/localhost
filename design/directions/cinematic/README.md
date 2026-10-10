# Direction: Highlands

**One-paragraph idea.** The site plays like the opening of a film shot in the Caucasus at dusk. The first frame is a full-bleed triptych, with Georgia, Armenia and Azerbaijan side by side as tall panels. Each panel drifts in a slow Ken Burns move, and the one you hover widens like a camera pushing in. The title sits over the triptych: *"Three countries. One open door."* Above it, in warm candle-coloured Georgian, is the epigraph **სტუმარი ღვთისაა** ("a guest is a gift from God"). Under the hero, layered mountain silhouettes fade the photo into a deep forest-night page. From then on, every section is a scene. A thin glowing ridge line, with the brand's red pin on its highest peak, separates the scenes. Brand light green is used as light (glows, LEDs, underlines), never as a flat fill. Brand red marks the things you can act on. The departure board is the signature moment: a dark housing with split-flap destination and IATA tiles that rattle into place when they scroll into view, and green dot-matrix LEDs for "DIRECT". The closing scene is Mestia's towers at night, with the contact details sitting on dark ground in front of them. The page is dark, so it needs warmth from somewhere: the candle-amber Georgian type, the quotes from hosts and the night-lit photography provide it, so the darkness reads as premium.

Files: `index.html` (one self-contained file: inline CSS and about 60 lines of inline JS, self-hosted fonts and photos, no CDN), `desktop.png` (1440 wide, full page), `mobile.png` (390 wide, full page).

---

## Palette

| Token | Hex | Role |
|---|---|---|
| `--night-950` | `#050D09` | Deepest ground: hero base, board section, footer |
| `--night-900` | `#07140E` | Page background |
| `--night-850` / `--night-800` | `#0A1B13` / `#0E2219` | Raised surfaces: quote cards, card backs |
| `--sust` band | `#0C2418 → #0A1E14` | Sustainability strip, the one "lit" band |
| `--mist` | `#EEF3EC` | Primary text and headlines (slightly green-tinted white) |
| `--fog` | `#B3C4B7` | Body and lede text |
| `--dim` | `#8A9D8F` | Metadata, mono labels, captions |
| `--glow` | `#2BB34B` | **Brand light green**, used as light: ridge lines, nav underline, LED dots, glows (decorative and non-text) |
| `--glow-soft` | `#6FDB8A` | Readable tint of the brand green for accent text: "One open door.", eyebrows, links, LED text |
| `--moss` | `#13783C` | **Brand dark green**: logo hill, small text on light chips (active board tab) |
| `--pin` | `#D02027` | **Brand red**: the pin, every primary CTA ("Plan with AI", "Request a proposal") |
| `--pin-hover` | `#E2343A` | CTA hover |
| `--ember` | `#F4BC74` | Warmth accent: Georgian script lines, quote marks, ticker LEDs, host monograms |
| `--board` / flap | `#090C0A` / `#1A201C`, ink `#F3F0E6` | Departure board housing, split-flap tiles and characters |

Photos get a light, consistent grade (`saturate(.82–.85) contrast(1.05)`) so the very saturated company photos sit inside the night palette.

## Type pairing

- **Display (Latin): Unbounded** (variable, 500–700). A wide, bold geometric sans used for headlines, country names, contact values, the wordmark *and the split-flap characters*. That makes the board feel like part of the brand rather than a widget. Tracking is set to −0.02 to −0.035em at large sizes.
- **Text (Latin): Manrope** (variable). A calm humanist-geometric sans for body copy, buttons and nav. Body size is 17px with 1.6 line height.
- **Georgian: Noto Sans Georgian** (variable, 500–700). It is sans to match Unbounded and Manrope. At weight 600 its stroke contrast matches Manrope 600. It is used for the hero epigraph (ember, 25px), panel native names, card chips (კულტურა, ღვინო …), eyebrow translations, the "გაფრენა" board label and the LED ticker. It is set as the fallback in every font stack, so any Georgian character renders correctly even inside Latin elements (needed for `/ka/`).
- **Utility: JetBrains Mono** (variable). Eyebrows, coordinates, captions, the airline column and the dot-matrix LEDs (with a radial-dot CSS mask).

## Motifs

1. **The triptych.** Three countries are always shown together as equal-height panels. Each has a mono index (01/02/03), its English name, its native name and its coordinates, like the location cards in a film.
2. **Ridge line + pin.** A single glowing mountain-ridge stroke is used as the section divider, with the red map pin (from the logo) on the highest peak. The same ridge returns as a glowing rim on the hero's bottom silhouette.
3. **Layered silhouettes.** Three translucent mountain layers sit at the bottom of the hero and the footer scene. They give depth, and they move at a different scroll speed from the photo (parallax).
4. **Location captions.** Mono uppercase captions ("USHGULI · UPPER SVANETI · 42°55′N 43°01′E") in the style of film subtitles. They also give the photos an honest place name.
5. **Glow as light.** Green appears only as emitted light (LEDs, strokes, underlines with a soft blur). Red appears only on the pin and on CTAs.
6. **Candle-amber Georgian.** Georgian script is always set in ember, so it reads as the "warm voice" of the site.
7. **Placeholder art.** Until the Armenia and Azerbaijan photos land, those panels show stacked topographic ridgelines with a clear "Photo pending · openly licensed image" tag. The build picks up any `armenia*.jpg` or `azerbaijan*.jpg` that appears.

## Motion

- **Ken Burns** on the hero panels and the footer scene: 30–36 s alternating scale and translate. The panels are offset in time so they never move in sync.
- **Hover push-in.** Hovering a hero panel widens it (flex transition, 1.2 s, film easing). Hovering an experience card scales its photo by 1.07 over 1.6 s.
- **Scroll reveals.** Content blocks fade up 34 px with staggered delays (0 / .12 / .24 / .36 s). The ridge divider *draws itself* with a stroke-dashoffset animation, and the pin pulses on the peak.
- **Split-flap settle.** When the board scrolls into view, every tile cycles through random letters for 0.3–1.1 s. Columns stop in sequence, each tile with a 90 ms flip. This runs once. The LED dots on the "DIRECT" rows blink out of phase. The ticker scrolls "WELCOME TO THE CAUCASUS · კეთილი იყოს თქვენი მობრძანება · Direct connections vary by season". The clock shows live Tbilisi time (UTC+4) with a blinking colon.
- **Nav.** It is transparent over the hero and becomes a blurred solid bar after 40 px of scroll.
- **Film grain** is a 7 % overlay noise on the hero only.
- `prefers-reduced-motion` turns off every animation and transition. Reveals show immediately, the board renders in its final state and the ridge is drawn statically.

## How the remaining sections would look

- **Airlines (typography wall).** A full-width night band where the 12 airline names are set in Unbounded at very large sizes in mixed weights (300 to 700). The names run as two slow counter-scrolling marquee rows, like end credits moving sideways. Hovering a name lights it in glow-green and shows a mono caption with the routes it flies to TBS or KUT. No logos.
- **Kutaisi board.** The second tab of the same board (KUT · ქუთაისი). The housing is identical, but the LED accent switches to ember amber so the two airports are told apart by colour. Switching tabs makes all tiles flap to the new cities. The full spec of 20 cities per board fits as 2 × 10 rows on desktop, and as a "show all 20" expanding board on mobile.
- **Meet us at (fairs).** A horizontal "tour itinerary" timeline over a faint ridge line. Each fair is a stop: city in Unbounded, fair name, month in mono, and a red pin on the next upcoming fair. The fair logos sit in monochrome mist chips (logo use needs permission).
- **Proud member of.** Quiet mono-labelled chips (GTA, PIT, ŚIT …) in a single row with thin dividers, each linking to its public member listing. GNTA and CEBG stay hidden until the owner confirms them (see research notes).
- **Awards.** One cinematic "laurel" card: "Nominee — Welcome to Georgia! National Tourism Awards 2016" in Unbounded, with an ember hairline frame and a 2016 mono stamp. Next to it are three dashed outline "slots" labelled "Award to be confirmed" (no invented awards).
- **We Support.** Hidden until real projects exist. Then: five landscape-photo tiles, each with a short mono caption in the same style as the hosts.
- **Contact.** The footer scene above, extended with an inline enquiry form on dark glass (name, agency, travel month, group size, message). The send button is pin red. The office address links to a dark-styled static map with the red pin.
- **AI planner ("Plan with AI ✦").** A full-screen "night console". On the left are choice chips styled like board tiles: countries, the six experiences, length, month and group type. On the right, the itinerary streams in day by day like a departure board updating. Each day appears as a row whose title flaps into place, followed by the plain-text plan in Manrope. In demo mode, a mono "SAMPLE ITINERARY · DEMO MODE" LED banner stays visible. The final CTA is a red "Send this plan to Local Host".

## Accessibility notes

Measured WCAG 2.x contrast ratios:

| Pair | Ratio | Use |
|---|---|---|
| mist `#EEF3EC` on night-900 `#07140E` | **16.7 : 1** | headlines, primary text |
| fog `#B3C4B7` on night-900 | **10.3 : 1** | body, ledes |
| dim `#8A9D8F` on night-900 / night-950 | **6.5 / 6.8 : 1** | captions, mono labels (passes AA for small text) |
| glow-soft `#6FDB8A` on night-900 | **10.9 : 1** | accent headline, links, LEDs |
| brand glow `#2BB34B` on night-900 | **6.9 : 1** | decorative strokes (would also pass for text) |
| ember `#F4BC74` on night-900 | **11.0 : 1** | Georgian lines, quotes |
| white on pin `#D02027` | **5.4 : 1** | all red CTAs (AA) |
| pin `#D02027` on night-900 | 3.5 : 1 | non-text only (pin icon, ≥ 3:1 UI component) |
| flap ink `#F3F0E6` on flap `#1A201C` | **14.5 : 1** | split-flap characters |
| airline `#E9E3D2` on board `#090C0A` | **15.3 : 1** | airline column |
| moss `#13783C` on mist `#EEF3EC` | **4.9 : 1** | IATA code on the active tab |
| mist / fog / dim on sustainability band `#0C2418` | **14.6 / 9.0 / 5.7 : 1** | strip text |

Other notes:
- Text over photos always sits on a gradient scrim (≥ .6 alpha behind the hero copy). This was checked visually in the screenshots, not measured pixel by pixel. Re-check it with the final photos.
- The dot-matrix mask is used only on short, large LED strings ("DIRECT", the clock, the ticker). Information-bearing text (airline names, cities) uses solid glyphs. Every flap row has `aria-label`s with plain city names and codes, and the board is exposed as a table with `role="table"`, `row`, `cell` and column headers. The ticker is `aria-hidden` because its content is repeated in the visible note under the board.
- Included: a skip link, a visible `:focus-visible` glow ring, `aria-current` in the nav and the language switcher, `hreflang` on language links, carousel buttons with labels plus `aria-live` counting, and `lang="ka"` on every Georgian string.
- Motion is fully disabled under `prefers-reduced-motion`. Ken Burns uses only transforms (GPU), and the grain is limited to the hero.
- Honesty: hosts are shown with **landscape photos marked "Illustrative landscape"**, plus a note that portraits come with the hosts' permission. Travelife wording is "Partner", never "Certified". The six TBS routes are **sample data for the mock** (they include the seasonal-variation note) and must be checked against the flight research before launch. The Armenia and Azerbaijan panels are clearly marked as pending.
- Performance note for the build: the mock references the 2400 px source JPGs directly. In Astro, these become `<Picture>` avif/webp at responsive widths. Only the Georgia hero image is eager-loaded with `fetchpriority="high"`, and everything else is lazy.
