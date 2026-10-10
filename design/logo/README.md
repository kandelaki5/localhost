# Local Host: logo concepts

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

## Files

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

`public/favicon.svg` is the current-redraw icon on a square canvas. It is temporary, until a direction is chosen.

`source/` holds the Python generator that produces every SVG. To rebuild: `pip install fonttools brotli uharfbuzz skia-pathops`, then `python3 design/logo/source/make.py`. Fonts are read from the repo's `@fontsource` packages. Text is shaped with HarfBuzz (GPOS kerning plus a few optical kerning pairs) and outlined with fontTools. Shapes are combined with Skia path ops.

## The concepts

### 00 · Current mark, redrawn (`current-redraw/`)
This is a faithful vector redraw of the 2015 logo, built on its own geometry: the hills' curved base is an arc centred on the pin, and the two hills are mirror images. The wordmark is Outfit Black, tracked to match the original's width. "საქართველო" is set in Noto Sans Georgian Bold using Mtavruli (Georgian capitals), as in the original. The new site uses this mark until a direction is chosen.

### 01 · Open Door (`open-door/`), recommended
*The pin's round counter becomes an arched doorway, and through it you see the Caucasus. A local opens the door for you.*
- The red pin and the two greens stay. The old pair of hills becomes two peaks in dark and light green, seen through the door.
- The arch is shared architecture across Tbilisi balconies, Armenian portals and Baku's old town, so it represents the region without favouring one national symbol.
- The one-colour version stays strong because the door and the peaks form a single negative shape. The mark reads at 16 px as a red pin with a light opening.
- Type: Plus Jakarta Sans ExtraBold, tracked, with a few optical kerning pairs (L–O, A–L). The tagline is justified to the wordmark's width.

### 02 · Summit Monogram (`summit-monogram/`)
*L and H share one stem. The crossbar becomes a ridge with three summits, one for each country, and the red pin stands on the highest.*
- This is the most graphic and modern direction, and the strongest as an app icon, social avatar, guide badge or embroidered patch.
- It is less literal about hospitality. The LH ligature takes a moment to learn.
- Type: Unbounded SemiBold (wide, contemporary) with Manrope Bold for the tagline.

### 03 · Caucasus Stamp (`caucasus-stamp/`)
*A perforated postage roundel that carries on the stamp tiles of the old site: three ranges, the pin on the summit, and a postmark ring reading LOCAL HOST · SOUTH CAUCASUS.*
- This direction has the most heritage and is the most collectable. It suits stickers, luggage tags, envelopes, partner gifts and round social avatars.
- The full badge needs room (64 px or more). Below that, use `icon.svg`, the simplified stamp without ring text.
- Type: Outfit Bold, tracked.

### 04 · Pin Wordmark (`pin-wordmark/`)
*A warm, refined serif with one small surprise: the "o" of Local drops into a map pin. The name is the logo.*
- This is the most premium and editorial direction, closer to a boutique hotel than a booking engine. It is very legible for European B2B partners.
- The pin keeps the counter of the real Fraunces "o", so it sits naturally in the word. In the horizontal lockup, the tagline hangs right-aligned from the baseline and the pin's tip drops past it.
- The icon is "Lo", the first two letters. It works, but it is the weakest symbol of the four.
- Type: Fraunces (wght 580) with Manrope for the tagline.

## Colour

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

## Clear space and minimum size

Keep this much empty space around every lockup, on all sides:

| Concept | Clear space (x) | Minimum size, digital / print |
|---|---|---|
| Open Door | x = width of the door opening (about ½ the pin width) | Icon 16 px / 6 mm tall. Horizontal 140 px / 35 mm wide. Below 200 px wide, the tagline becomes hard to read, so drop it. |
| Summit Monogram | x = one stem width (about ⅙ of the icon width) | Icon 16 px / 5 mm. Horizontal 140 px / 35 mm wide |
| Caucasus Stamp | x = ¼ of the badge diameter | Full badge with ring text 64 px / 18 mm. Simple stamp icon 20 px / 6 mm. Horizontal 160 px / 40 mm wide |
| Pin Wordmark | x = height of the pin head (the x-height) | Wordmark 90 px / 22 mm wide. With tagline 200 px / 45 mm. "Lo" icon 16 px / 5 mm |

Never stretch, rotate, recolour (apart from the supplied one-colour and reverse versions), outline, add effects to, or place a logo on a busy photo without a solid panel.

## Recommendation

**Adopt 01 · Open Door as the primary logo, and keep 03 · Caucasus Stamp as a secondary emblem for merch and stationery.**

Open Door changes the least of what people already recognise: a red pin over green, read at a glance. It adds an idea the company can own ("a local opens the door for you"), which fits a DMC whose selling point is its hosts. It is the most legible at favicon size, it has the strongest one-colour version, and the arch-and-peaks shape works for Georgia, Armenia and Azerbaijan equally. The Stamp continues the old site's stamp tiles and gives partners and guests something collectable: stickers, luggage tags, envelopes.

If the owner prefers a more premium, typographic look, Pin Wordmark is the alternative. Its wordmark could also be paired with the Open Door icon.

## Before anything is final

- **Trademark check.** Check the chosen mark for conflicts before adoption and register it: with **Sakpatenti** (National Intellectual Property Center of Georgia), and with EUIPO / WIPO (Madrid) for the EU markets (Italy, Poland, Germany), and in Armenia and Azerbaijan if the brand is used there. "Local Host" is a descriptive phrase, and map-pin and mountain symbols are common in travel, so the distinctive parts (the door-in-pin, the LH ridge ligature, the pin-"o") are what a registration would rest on.
- **Designer refinement.** These are concepts generated as precise vectors, not final artwork. A professional designer should refine them: optical overshoots, curve tension, ink traps at small sizes, final kerning and a full brand guide.
- **Fonts.** All typefaces used are under the SIL Open Font License, which allows outlined text in logos. The licences are in the `@fontsource` packages.
- **Georgian.** The redraw uses Mtavruli capitals for "საქართველო". Any Georgian (or Armenian or Azerbaijani) tagline added later should be checked by a native speaker.
