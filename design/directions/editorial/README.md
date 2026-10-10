# Caucasus Quarterly — editorial direction

**Files:** `index.html` (self-contained static mock: inline CSS, ~3 KB of inline JS for the carousel and the split-flap board) · `desktop.png` (1440 × 900, full page) · `mobile.png` (390 × 844, full page).
Serve the repo root (`python3 -m http.server 8811 --directory /home/user/localhost`) and open `/design/directions/editorial/`.

## The idea

Local Host's site is laid out like the house magazine of a well-travelled host. Warm paper, deep green-black ink and confident serif headlines make it calm and premium, the kind of page a European tour-operator buyer trusts on sight. The warmth comes from the content: a Georgian proverb as the opening line (*სტუმარი ღვთის საჩუქარია*, "a guest is a gift from God"), hosts introduced by name, and captions written the way a person talks. Every section opens with a magazine running head numbered in **Georgian alphabet numerals** (ა = 1, ბ = 2, გ = 3 …, the traditional Georgian number system), so the script is part of how the page is organised and not only decoration. Brand red appears in very few places, always as "the pin": the logo, the active nav dot, the Tbilisi marker on the map, the opening quotation marks and the contact address. The one dark moment is the Tbilisi departure board, a black split-flap with amber letters that flip into place when it scrolls into view. It is the signature element.

## Palette

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#F4EEE3` | Page background (warm paper, with a very faint grain) |
| `--paper-2` | `#EAE1D1` | Bands (sustainability strip), image wells |
| `--paper-3` | `#FBF8F1` | Postage-stamp paper, certificate card |
| `--ink` | `#14231B` | Headlines, primary text, primary buttons, footer background |
| `--ink-2` | `#34423A` | Body copy |
| `--muted` | `#5C6258` | Captions, running heads, Georgian glosses |
| `--red` | `#D02027` | **Pin accent only** (logo pin, active nav dot, map pin, quote marks, address pin) |
| `--green` | `#13783C` | Brand dark green: big sustainability figures, logo hill |
| `--green-2` | `#2BB34B` | Brand light green: logo hill only |
| `--board` | `#0E0F0C` | Connection section background |
| flap | `#24241F → #161613` | Split-flap tiles (two-tone with a hinge line) |
| `--amber` | `#FFB54A` | Flap characters, highlight words on dark, sparkle icon |
| `--amber-2` | `#C98C35` | Board column labels |
| `--on-dark` / `--on-dark-2` | `#EFE7D8` / `#B9B2A3` | Text on the board and on the ink footer |
| plates | `#9C4A2F` / `#1E5559` | Armenia (tuff terracotta) / Azerbaijan (Caspian teal) placeholders until licensed photos arrive |

## Type

- **Display:** *Fraunces* (variable, self-hosted). Uses `opsz 144` at weight 300–340, so large sizes get the hairline contrast of the high-contrast cut. Italic uses `WONK 1` for the quirky *a / h / k* forms in the accent words ("*is a gift.*", "*a few hours*").
- **Text / UI:** *DM Sans* (variable, optical size). Body is 17–18 px at 1.6 line height; the 11.5 px letter-spaced small caps are used for running heads, kickers and place lists.
- **Georgian:** *Noto Serif Georgian*, light (300–380), for display lines: the proverb, country names, card glosses and the giant ornaments. *Noto Sans Georgian* is used for UI and for the board's "გაფრენა" (departures). Both are loaded with a Georgian-only `unicode-range`, so Latin text never pulls them in.
- **Board:** *JetBrains Mono* 700, uppercase, sized at 64 % of the flap height.

## Motifs

1. **Running heads**: a full-width ink rule; below it an italic numeral, the Georgian numeral letter, a small-caps section name, and a running title on the right.
2. **Giant Mkhedruli watermarks**: each section's numeral letter (ა, ბ, გ, ვ …) set at 440–620 px in 4–5 % ink (amber or paper tint on dark sections), cropped by the page edge.
3. **Postage stamps**: perforated frames made with a CSS mask, on the Experience cards and on the "Local Host 2015" seal stuck to the Georgia photo. This carries over the old site's stamp-shaped tour tiles.
4. **Figure captions**: "Fig. 1 — Gergeti Trinity Church, Kazbegi, 2,170 m". Every image gets an italic serif caption and a small-caps "Explore →" link.
5. **Schematic map (Fig. 4)**: a hand-set line map placing Tbilisi between two seas, with the Greater Caucasus drawn as a row of tick-mark peaks and lines out to Batumi, Kutaisi, Kazbegi, Yerevan, Sheki and Baku.
6. **Asymmetric magazine grid**: a 12-column grid with staggered tops (the Georgia, Armenia and Azerbaijan triptych; the middle Experience card set lower; the second host card dropped by 150 px) and pull-quotes with red hanging quotation marks.
7. **Monogram seals for hosts**: Georgian initials in an ink roundel (მ&ე for Marika & Enry, ლ for Leila) instead of portraits.

## Motion (in the mock, and proposed)

- **Implemented:** the headline lines rise in (1.1 s, staggered); the proverb, text and CTAs fade in; the stamp seal "lands" with a slight overshoot; images scale 1.035 slowly on hover; nav links get an ink underline on hover; the carousel slides on an ease-out curve and a progress bar tracks it.
- **Split-flap:** when the board enters the viewport (IntersectionObserver), each tile cycles through random characters and settles row by row. A 70 ms scale tick on each change gives the mechanical feel. The Tbilisi clock (Asia/Tbilisi time) is built from flaps too.
- **Proposed:** switching the TBS/KUT tabs re-flaps the whole board to the Kutaisi data. The giant watermark letters drift about 40 px on scroll (subtle parallax). Every motion above is switched off under `prefers-reduced-motion`, and the board then renders final characters straight away.

## How the remaining sections look in this direction

The final page keeps nav order, so its numbers run 01 ა Caucasus · 02 ბ Experiences · 03 გ Hosts · 04 დ Airlines · 05 ე Connection · 06 ვ Meet us · 07 ზ Members · 08 ჱ Awards · 09 თ Sustainability · 10 ი We Support · 11 ია Contact. (ჱ is the archaic letter that still stands for 8.)

- **Airlines: typography wall.** A paper spread like a magazine index page. The 12 carriers are set as one justified block of large Fraunces type, alternating roman and italic and separated by small red pins: *Turkish* · Georgian · *airBaltic* · Air France · *Aegean* · Pegasus … Hovering a name turns it ink-black and shows a caption with the gateways it serves from TBS/KUT. Real logos are never used.
- **Connection: Kutaisi board.** A second board in the same black housing, reached with the TBS/KUT tabs. The full version is the 20-city grid from the template, laid out as 4 × 5 flap "destination cards" (city + IATA), each with a small "DIRECT" lamp. The seasonal-schedule note always sits under the board.
- **Meet us at the fairs.** A "calendar" spread: six tall columns (BIT Milano, BMT Naples, ITB Berlin, Tour Salon Poznań, TTG Rimini, TT Warsaw) separated by thin rules, each with the city in italic serif, the fair name in small caps and a month. The fair's logo sits in a neutral grey frame. A footer line reads "Book a meeting with us at the stand →".
- **Proud member of.** A single quiet row of five acronyms (GNTA · GTA · CEBG · PIT · SIT) set in Fraunces, with the full organisation name in small caps underneath. Official logos go in uniform paper-3 cards.
- **Awards.** A "certificate" layout: the confirmed *Welcome to Georgia* 2016 nomination as a framed card (double-rule border, as on the Travelife card), with dashed "award slot" frames beside it until other awards are verified.
- **Sustainability.** The compact strip in this mock expands into a two-column essay: a pull-quote from the policy, the Travelife logo and certificate screen in a framed card, the figures (−10.1 %, −36.3 %) in large green Fraunces, and the four policy PDFs as an index list.
- **We Support.** Five postage stamps (the perforated motif), one per project, each with a project name and a one-line caption.
- **Contact.** As in the mock: ink footer, a big serif sign-off, მოგესალმებით, an address with the red pin, and a schematic map panel (Fig. 4 redrawn at street level for A. Bakradze 7).
- **AI planner ("Plan with AI ✦").** Opens as a full-height paper "correspondence" sheet that slides in from the right. Choices are pill chips (countries, the six experiences, month, group type), with a free-text field set like a letter ("Dear Local Host, …"). The streamed itinerary appears as a typeset day-by-day column ("Day 1 · ა — Tbilisi"), using the same running-head and numeral system, with a small amber "DEMO" flap label in demo mode. The closing CTA is "Send this plan to Local Host".

## Accessibility notes

WCAG 2.x contrast ratios of the main pairs:

| Pair | Ratio | Use |
|---|---|---|
| ink `#14231B` on paper `#F4EEE3` | **14.1 : 1** | headlines, primary text, buttons (inverse is the same) |
| ink-2 `#34423A` on paper | **9.2 : 1** | body copy |
| muted `#5C6258` on paper / paper-2 | **5.4 : 1 / 4.8 : 1** | captions, small caps (AA) |
| red `#D02027` on paper | **4.6 : 1** | AA for text; used mostly for non-text accents |
| green `#13783C` on paper-2 | **4.3 : 1** | only at 50–64 px (AA large); hover states use ink and an underline |
| amber `#FFB54A` on board `#0E0F0C` / on a flap | **11.0 : 1 / 8.9 : 1** | board characters |
| amber-2 `#C98C35` on board | **6.7 : 1** | board column labels |
| on-dark `#EFE7D8` / on-dark-2 `#B9B2A3` on board | **15.7 : 1 / 9.1 : 1** | |
| on-dark / on-dark-2 on ink | **13.3 : 1 / 7.7 : 1** | footer |

- The split-flap board is `aria-hidden`. A visually hidden `<table>` with a caption carries the same flight data for screen readers.
- Georgian text is marked `lang="ka"`. Decorative letters and monograms are `aria-hidden`. The map has a `<title>`, and placeholder plates have `role="img"` with labels.
- Focus is a 2 px red outline offset 3 px. Carousel buttons have labels and a `disabled` state, and the counter is `aria-live`. Tabs use `role="tab"` and `aria-selected`.
- `prefers-reduced-motion` turns off all animation, including the flaps. Smooth scrolling only applies while focus is inside the page.
- Body text is 16–18 px, and line lengths are capped at about 40–65 characters.

## Content flags (also for `docs/CONTENT-TODO.md`)

- **Flight rows** (IST/Turkish, WAW/LOT, MUC/Lufthansa, VIE/Austrian, RIX/airBaltic, ATH/Aegean) are illustrative sample data. Verify them against `docs/research` before launch. The seasonal note is always shown.
- **Armenia / Azerbaijan** use colour plates until the openly licensed photos land in `src/assets/photos/`. Their credits must then appear under "Photo credits".
- **Travelife:** the framed card is set in our own type and is not their logo. Swap in the official logo and certificate.
- **Host images** are place photographs, labelled as such. The quotes are adapted from the Sustainability Policy ("Local Communities") and attributed to it. Vacheishvili Family, Samvel, Aluda and Maia appear by name only.
- "Vol. XI" in the folio is an editorial wink (the 11th year since 2015). Drop it if the owner finds it confusing.
