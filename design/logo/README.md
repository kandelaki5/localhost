# Local Host: logo concepts

## Chosen logo

The owner chose the **sun-over-hills** mark: a red-orange sun (or a host's head) above two overlapping rounded green hills, with **LOCAL HOST** and a letter-spaced **GEORGIA** underneath. The brief was "use the last logo I sent you as a base". The original (`docs/reference/chosen-logo-options.jpg`) is an AI-generated raster mock-up in three colour options. Everything in `chosen/` keeps its concept, layout and colours, redrawn as precise vectors.

**The website uses Option 2, "Balanced & Versatile".** Its files are copied with fixed names into `src/assets/brand/` (`logo-horizontal.svg`, `logo-horizontal-reverse.svg`, `logo-stacked.svg`, `logo-stacked-reverse.svg`, `logo-icon.svg`, `logo-icon-reverse.svg`, `logo-icon-mono.svg`, `logo-mono.svg`, `logo-mono-white.svg`). `public/favicon.svg` is the Option 2 flat icon on a square canvas. In dark browser chrome it switches to the lifted reverse greens through a `prefers-color-scheme` rule.

**To view it:** serve the repo root (`python3 -m http.server 8815 --directory .`) and open `/design/logo/chosen/index.html`. Screenshots: `chosen/chosen-logo.png` (full page) and `chosen/chosen-logo-option-2.png` (the Option 2 section only).

### Files (`chosen/option-1/`, `option-2/`, `option-3/`)

| File | What it is |
|---|---|
| `stacked.svg`, `stacked-flat.svg` | Mark above the wordmark, as in the original. Gradient or solid colours. |
| `horizontal.svg`, `horizontal-flat.svg` | Mark on the left, wordmark on the right (LOCAL HOST stands on the hills' ridge line) |
| `icon.svg`, `icon-flat.svg` | Mark only, 120 × 120 |
| `mono.svg`, `mono-white.svg`, `mono-stacked.svg`, `icon-mono.svg` | One colour (ink or white). The three hill planes are separated by knock-out gaps |
| `reverse.svg`, `reverse-flat.svg`, `stacked-reverse.svg`, `icon-reverse.svg` | For Forest `#0D3A24` and other dark backgrounds: cream LOCAL HOST, lighter GEORGIA, lifted greens |

All text is outlined (no fonts needed). The hills use true SVG elliptical arcs and the sun is a `<circle>`. Every gradient id is prefixed with its file (`lh2-horizontal-sun`, `logo-icon-overlap` and so on), so any number of different logo files can be inlined on one page. To rebuild: `pip install fonttools brotli uharfbuzz skia-pathops`, run `python3 design/logo/chosen/source/build.py` (all SVGs, the site copies and the favicon), then `python3 design/logo/chosen/source/page.py` (the presentation page). Geometry is in `source/mark.py` and colours in `OPTIONS` in `source/build.py`.

### What was refined

1. **True geometry on a 12-unit grid** (U = 1/12 of the mark's width; the mark is exactly 12 × 12 U). The sun is a perfect circle, r = 3U, filling the top half. Each hill is a half-ellipse standing on the base line, 5.8U high, so its outer side meets the base vertically.
2. **45° slopes, a right-angled overlap.** The straight inner slopes run at exactly 45° (the original wobbles between about 40° and 44°) and meet the base 4U either side of the axis. Each dome's width is solved so the slope is exactly tangent to it (rx = 3.318U), so there is no kink. The slopes cross at a right angle 4U above the base, so the overlap is exactly half a square, the "diamond".
3. **Mirror symmetry.** The hills are exact mirror images about the sun's axis. In the original, the peaks, the slopes and the sun's centre are each a few pixels off, and the sun is slightly oval.
4. **Optical spacing.** As in the original, the sun hovers 0.2U above the ridge line, with the same 0.85U gap to both hills (the original's gaps differ left to right). That gap stays at least one pixel at 16 px. The outer base corners get a 0.16U fillet, as in the original.
5. **One geometry for all three options.** The AI drew a slightly different mark in each option (bigger, higher sun and fuller domes in Options 1 and 3). The options now differ only in colour and wordmark weight.
6. **Wordmark.** Outfit (geometric, circular O, pointed A) is the closest match to the original lettering among the repo's fonts. Text is shaped with HarfBuzz (Outfit's own GPOS kerning) plus optical pairs: a slightly wider word space, and E–O, R–G and I–A tightened in the letter-spaced GEORGIA. In the horizontal lockup the round G is nudged left by its overshoot, so it aligns optically with the L. Weights: Option 1 LOCAL HOST 700 / GEORGIA 620; Option 2 650 / 600; Option 3 500 / 520. Tracking: LOCAL HOST +8, +15 and +45/1000 em; GEORGIA +360, +380 and +420/1000 em (82 % of that in the horizontal lockup).
7. **Gradient and flat.** All gradients share one light source, top-left at 45°, with three stops. The middle stop is the flat colour, so the gradient and flat versions read as the same colour at small sizes and in print. Overlap planes sit on an underlay, so no light seams appear between shapes.
8. **Reverse.** On Forest, the original greens would sink (the Option 2 dark hill contrasts only 1.8 : 1 with Forest). The reverse files lift the greens in OKLCH lightness and chroma, keeping their order, and use cream text with a lighter GEORGIA.

### Colour specifications

Gradients use three stops (light → mid → dark, top-left to bottom-right). Use the **flat** colour wherever a single value is needed (CSS tokens, print spot colours, embroidery). Forest `#0D3A24` (13 58 36) and Cream `#F7F3EA` (247 243 234) are the background colours.

**Option 1 · Modern & Confident**

| Role | Flat (HEX · RGB) | Gradient: light → mid → dark | Reverse on Forest (flat) |
|---|---|---|---|
| Sun | `#D9381F` · 217 56 31 | `#F2643B` → `#D9381F` → `#B6161B` | unchanged |
| Left hill | `#57994D` · 87 153 77 | `#6AA758` → `#57994D` → `#458A45` | `#60A655` · 96 166 85 |
| Right hill | `#156B3D` · 21 107 61 | `#2A7B46` → `#156B3D` → `#055A36` | `#38945D` · 56 148 93 |
| Overlap | `#0A5A37` · 10 90 55 | `#0F653C` → `#0A5A37` → `#044C31` | `#2C7F55` · 44 127 85 |
| LOCAL HOST | `#122726` · 18 39 38 | — | `#F7F3EA` · 247 243 234 |
| GEORGIA | `#C93226` · 201 50 38 | — | `#F2704A` · 242 112 74 |

**Option 2 · Balanced & Versatile (website)**

| Role | Flat (HEX · RGB) | Gradient: light → mid → dark | Reverse on Forest (flat) |
|---|---|---|---|
| Sun | `#DC341F` · 220 52 31 | `#F57045` → `#DC341F` → `#BC171D` | unchanged |
| Left hill | `#0E643D` · 14 100 61 | `#126A42` → `#0E643D` → `#0A5836` | `#2B8D5C` · 43 141 92 |
| Right hill | `#189659` · 24 150 89 | `#2AA563` → `#189659` → `#0F884F` | `#32B872` · 50 184 114 |
| Overlap | `#138450` · 19 132 80 | `#178A53` → `#138450` → `#0F7848` | `#219F63` · 33 159 99 |
| LOCAL HOST | `#0D2524` · 13 37 36 | — | `#F7F3EA` · 247 243 234 |
| GEORGIA | `#C72F25` · 199 47 37 | — | `#F57A52` · 245 122 82 |

**Option 3 · Refined & Distinctive**

| Role | Flat (HEX · RGB) | Gradient: light → mid → dark | Reverse on Forest (flat) |
|---|---|---|---|
| Sun | `#E0552C` · 224 85 44 | `#F7804B` → `#E0552C` → `#BC2F1C` | unchanged |
| Left hill | `#789E56` · 120 158 86 | `#8AAB61` → `#789E56` → `#64904B` | `#80A85B` · 128 168 91 |
| Right hill | `#265F37` · 38 95 55 | `#3D7340` → `#265F37` → `#164F2D` | `#498A5A` · 73 138 90 |
| Overlap | `#1C532F` · 28 83 47 | `#2A6237` → `#1C532F` → `#124527` | `#3C7A4F` · 60 122 79 |
| LOCAL HOST | `#0B1F17` · 11 31 23 | — | `#F7F3EA` · 247 243 234 |
| GEORGIA | `#A15F3F` · 161 95 63 | — | `#E39A71` · 227 154 113 |

The colours were sampled from the original raster (region-averaged and fitted with a linear gradient per shape), then adjusted only where needed: the Option 1 and Option 3 overlaps were darkened a step so the triangle stays distinct from the right hill in the flat versions. One-colour files use each option's LOCAL HOST ink, or white.

### Usage

- **Clear space:** keep at least **3U** clear on all sides of every lockup. That is the sun's radius, a quarter of the mark's width (8 px when the horizontal logo is 32 px high). For icon-only use (avatars, app tiles), keep at least 2U of padding inside the container.
- **Minimum sizes:**

  | Version | Screen | Print |
  |---|---|---|
  | Icon | 16 px (below 24 px use `icon-flat` or the favicon) | 5 mm |
  | Horizontal | 32 px high (GEORGIA becomes unreadable below this; use the icon instead) | 10 mm high |
  | Stacked | 96 px wide | 22 mm wide |

- **Which file:** use the gradient versions on screen at 32 px and up. Use the flat versions for small sizes, print, signage, embroidery and anywhere a gradient could band. Use mono and mono-white for one-colour jobs (foil, stamps, engraving, fax). Use the reverse versions on Forest or on dark, quiet photos. On mid-tone or busy backgrounds, use mono-white on a solid panel.
- **Inlining:** ids are unique per file, so the header logo and a footer reverse logo can be inlined together. If the *same* file is inlined twice on one page, both copies share their ids. That is harmless while the first copy is visible, but gradients disappear if the first copy is `display:none`. For repeated logos, use `<img>` or import the file once.
- **Do not** stretch, rotate, re-colour (other than the supplied versions), outline, add shadows to, or redraw the mark, and do not separate the sun from the hills. Always use the files.

## Earlier concepts (superseded)

The sections below document the first round of concepts. The owner chose the logo above instead, so they are kept for reference only.

The owner asked for a new logo: "something cool and attractive". This folder holds a clean redraw of the current mark and four new directions. Each direction keeps something people already recognise (the pin, the hills, the red-and-green, the stamp tiles) and moves the brand from Georgia-only to the whole South Caucasus.

**To view it:** serve the repo root (`python3 -m http.server 8814 --directory .`) and open `/design/logo/index.html`. You can also look at the screenshots:

| Screenshot | Contents |
|---|---|
| `logo-concepts.png` | The full presentation |
| `logo-concepts-current-redraw.png` | 00: the current mark, redrawn |
| `logo-concepts-open-door.png` | 01: Open Door (recommended) |
| `logo-concepts-summit-monogram.png` | 02: Summit Monogram |
| `logo-concepts-caucasus-stamp.png` | 03: Caucasus Stamp |
| `logo-concepts-pin-wordmark.png` | 04: Pin Wordmark |

### Files

Each concept folder `<slug>/` contains:

| File | What it is |
|---|---|
| `horizontal.svg` | Primary lockup: icon + wordmark + tagline (full colour, for light backgrounds) |
| `stacked.svg` | Icon above wordmark + tagline |
| `icon.svg` | Symbol only, for favicons, avatars and app icons |
| `mono.svg` | One-colour horizontal lockup in Ink `#0B1F14` (current-redraw: stacked) |
| `*-reverse.svg` | Versions for dark backgrounds (Forest `#0D3A24`) |
| `mono-white.svg`, `mono-stacked*.svg`, `icon-mono.svg` | More one-colour versions (white for knock-outs, foil and embroidery) |
| `caucasus-stamp/badge.svg` | The full emblem with ring text |
| `pin-wordmark/wordmark*.svg` | Wordmark without tagline (for nav bars) |

All text is converted to outlines, so the files need no fonts. Each SVG is flat: one `<path>` per colour, no overlaps, no masks, no editor metadata, coordinates at 2-decimal precision. The colour artwork is already flattened, so it separates cleanly for print.

`public/favicon.svg` was originally the current-redraw icon. It has since been replaced by the chosen logo's Option 2 icon (see above).

`source/` holds the Python generator that produces every SVG. To rebuild: `pip install fonttools brotli uharfbuzz skia-pathops`, then `python3 design/logo/source/make.py`. Fonts are read from the repo's `@fontsource` packages. Text is shaped with HarfBuzz (GPOS kerning plus a few optical kerning pairs) and outlined with fontTools. Shapes are combined with Skia path ops.

### The concepts

#### 00 · Current mark, redrawn (`current-redraw/`)
This is a faithful vector redraw of the 2015 logo, built on its own geometry: the hills' curved base is an arc centred on the pin, and the two hills are mirror images. The wordmark is Outfit Black, tracked to match the original's width. "საქართველო" is set in Noto Sans Georgian Bold using Mtavruli (Georgian capitals), as in the original. The new site uses this mark until a direction is chosen.

#### 01 · Open Door (`open-door/`), recommended
*The pin's round counter becomes an arched doorway, and through it you see the Caucasus. A local opens the door for you.*
- The red pin and the two greens stay. The old pair of hills becomes two peaks in dark and light green, seen through the door.
- The arch is shared architecture across Tbilisi balconies, Armenian portals and Baku's old town, so it represents the region without favouring one national symbol.
- The one-colour version stays strong because the door and the peaks form a single negative shape. The mark reads at 16 px as a red pin with a light opening.
- Type: Plus Jakarta Sans ExtraBold, tracked, with a few optical kerning pairs (L–O, A–L). The tagline is justified to the wordmark's width.

#### 02 · Summit Monogram (`summit-monogram/`)
*L and H share one stem. The crossbar becomes a ridge with three summits, one for each country, and the red pin stands on the highest.*
- This is the most graphic and modern direction, and the strongest as an app icon, social avatar, guide badge or embroidered patch.
- It is less literal about hospitality. The LH ligature takes a moment to learn.
- Type: Unbounded SemiBold (wide, contemporary) with Manrope Bold for the tagline.

#### 03 · Caucasus Stamp (`caucasus-stamp/`)
*A perforated postage roundel that carries on the stamp tiles of the old site: three ranges, the pin on the summit, and a postmark ring reading LOCAL HOST · SOUTH CAUCASUS.*
- This direction has the most heritage and is the most collectable. It suits stickers, luggage tags, envelopes, partner gifts and round social avatars.
- The full badge needs room (64 px or more). Below that, use `icon.svg`, the simplified stamp without ring text.
- Type: Outfit Bold, tracked.

#### 04 · Pin Wordmark (`pin-wordmark/`)
*A warm, refined serif with one small surprise: the "o" of Local drops into a map pin. The name is the logo.*
- This is the most premium and editorial direction, closer to a boutique hotel than a booking engine. It is very legible for European B2B partners.
- The pin keeps the counter of the real Fraunces "o", so it sits naturally in the word. In the horizontal lockup, the tagline hangs right-aligned from the baseline and the pin's tip drops past it.
- The icon is "Lo", the first two letters. It works, but it is the weakest symbol of the four.
- Type: Fraunces (wght 580) with Manrope for the tagline.

### Colour

| Role | Name | HEX | RGB | CMYK (approx., coated) | Pantone starting point* |
|---|---|---|---|---|---|
| Core | Pin Red | `#D02027` | 208 32 39 | 0 95 90 5 | 1795 C / 485 C |
| Core | Highland Green | `#13783C` | 19 120 60 | 85 15 90 25 | 356 C |
| Core | Meadow Green | `#2BB34B` | 43 179 75 | 75 0 95 0 | 361 C |
| Support | Forest (dark backgrounds) | `#0D3A24` | 13 58 36 | 85 35 80 65 | 3435 C |
| Support | Cream (light backgrounds) | `#F7F3EA` | 247 243 234 | 2 3 7 0 | — |
| One-colour | Ink | `#0B1F14` | 11 31 20 | 75 45 70 85 | Black 3 C |
| Reverse only | Mint (light green on Forest) | `#7FD08F` | 127 208 143 | 50 0 55 0 | — |

The three core colours are sampled from the original logo. The CMYK values are visual approximations, not colour-managed conversions. \*Pantone references are only starting points: confirm them against a printed swatch book before production.

On dark backgrounds, the reverse files lift the greens (Highland Green to Meadow Green, Meadow Green to Mint) so the hills stay visible against Forest. Pin Red stays the same everywhere.

### Clear space and minimum size

Keep this much empty space around every lockup, on all sides:

| Concept | Clear space (x) | Minimum size, digital / print |
|---|---|---|
| Open Door | x = width of the door opening (about ½ the pin width) | Icon 16 px / 6 mm tall. Horizontal 140 px / 35 mm wide. Below 200 px wide, the tagline becomes hard to read, so drop it. |
| Summit Monogram | x = one stem width (about ⅙ of the icon width) | Icon 16 px / 5 mm. Horizontal 140 px / 35 mm wide |
| Caucasus Stamp | x = ¼ of the badge diameter | Full badge with ring text 64 px / 18 mm. Simple stamp icon 20 px / 6 mm. Horizontal 160 px / 40 mm wide |
| Pin Wordmark | x = height of the pin head (the x-height) | Wordmark 90 px / 22 mm wide. With tagline 200 px / 45 mm. "Lo" icon 16 px / 5 mm |

Never stretch, rotate, recolour (apart from the supplied one-colour and reverse versions), outline, add effects to, or place a logo on a busy photo without a solid panel.

### Recommendation (superseded by the chosen logo)

**Adopt 01 · Open Door as the primary logo, and keep 03 · Caucasus Stamp as a secondary emblem for merch and stationery.**

Open Door changes the least of what people already recognise: a red pin over green, read at a glance. It adds an idea the company can own ("a local opens the door for you"), which fits a DMC whose selling point is its hosts. It is the most legible at favicon size, it has the strongest one-colour version, and the arch-and-peaks shape works for Georgia, Armenia and Azerbaijan equally. The Stamp continues the old site's stamp tiles and gives partners and guests something collectable: stickers, luggage tags, envelopes.

If the owner prefers a more premium, typographic look, Pin Wordmark is the alternative. Its wordmark could also be paired with the Open Door icon.

### Before anything is final

- **Trademark check.** Check the chosen mark for conflicts before adoption and register it: with **Sakpatenti** (National Intellectual Property Center of Georgia), and with EUIPO / WIPO (Madrid) for the EU markets (Italy, Poland, Germany), and in Armenia and Azerbaijan if the brand is used there. "Local Host" is a descriptive phrase, and map-pin and mountain symbols are common in travel, so the distinctive parts (the door-in-pin, the LH ridge ligature, the pin-"o") are what a registration would rest on.
- **Designer refinement.** These are concepts generated as precise vectors, not final artwork. A professional designer should refine them: optical overshoots, curve tension, ink traps at small sizes, final kerning and a full brand guide.
- **Fonts.** All typefaces used are under the SIL Open Font License, which allows outlined text in logos. The licences are in the `@fontsource` packages.
- **Georgian.** The redraw uses Mtavruli capitals for "საქართველო". Any Georgian (or Armenian or Azerbaijani) tagline added later should be checked by a native speaker.
