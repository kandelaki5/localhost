# Direction: Passport & Postage

**One-paragraph idea.** Local Host's old site already had a lovely heritage detail: tour types set in green postage-stamp tiles. This direction makes that the whole brand world. Every piece of content is something that travels: the three countries are stamps on an airmail envelope addressed "To: your travellers, anywhere in Europe". Experiences are perforated stamps (brand green, brand red, cream). Hosts are postcards written by the Local Host team. Trade fairs, memberships and awards are visa ink stamps on a passport page. The flight connections are a classic black-and-yellow split-flap departure board, and the footer is a deep-green passport cover with foil type. The site feels warm and playful, like a letter from a friend, but it stays B2B-credible. The grid is strict, the type is confident, the facts are clear (IATA codes, policies, contact), and the playfulness never gets in the way of information.

Files: `index.html` (static mock with inline CSS and a little JS), `desktop.png` (1440, full page), `mobile.png` (390, full page).

---

## Palette

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#F4EDE0` | Page background (warm writing paper), with CSS linen + noise texture |
| `--paper-2` | `#EBE1CE` | Deeper paper band (Experiences) |
| `--card` | `#FFFBF3` | Stamp paper, envelope, postcards |
| `--ink` | `#1F1A14` | Body text, primary button, postmark ink |
| `--ink-2` | `#51483B` | Secondary text |
| `--red` | `#D02027` | **Brand red**: the pin, "Plan with AI" CTA, red stamps, airmail stripe |
| `--red-ink` | `#B3171E` | Red for small text on paper (labels, kickers) |
| `--green` | `#13783C` | **Brand dark green**: wordmark, green stamps, italic accents, airmail stripe |
| `--green-ink` | `#0F6533` | Green for small text on the sage strip |
| `--green-lt` | `#2BB34B` | **Brand light green**: the right-hand hill in the logo only (decorative, never text) |
| `--sage` | `#E3E8D6` | Sustainability strip |
| `--green-deep` | `#0C3F22` | Passport-cover footer |
| `--foil` | `#D8B86E` | Passport "gold foil" type and the emblem in the footer |
| `--board` / flap | `#121211` / `#1F1F1D` | Split-flap departure board housing and flaps |
| `--flap-ink` | `#FFC629` | Split-flap characters, active board tab |
| Armenia ink / Azerbaijan ink | `#B4541E` / `#0F6A5C` | Per-country stamp keylines (apricot and Caspian teal), used only inside their stamps |

**Airmail stripe:** `repeating-linear-gradient(-45deg, red 0 14px, card 14px 22px, green 22px 36px, card 36px 44px)`. It runs along the top edge of the page, around the hero envelope, and above and below the sustainability strip.

## Type pairing

- **Display:** **Fraunces** (variable, the `full` file with the `opsz`, `wght`, `SOFT` and `WONK` axes). Headlines use weight 800–850 with `SOFT 100`, which gives a warm, slightly inky "engraved stamp" serif. Italic accents use `WONK 1` (*local host*, *the Caucasus*) and are set in red or green.
- **Text/UI:** **DM Sans** (variable, optical size). Friendly, neutral and very readable for B2B copy.
- **Utility/labels/board:** **JetBrains Mono** (variable). Used for postal labels ("NO. 02 · EXPERIENCES"), IATA codes, postmarks and the split-flap characters at 800 weight.
- **Georgian:** **Noto Serif Georgian** pairs with Fraunces for display (the proverb "სტუმარი ღვთისაა", the footer greeting "მოგესალმებით"). **Noto Sans Georgian** pairs with DM Sans for small labels (country names საქართველო / სომხეთი / აზერბაიჯანი, experience names კულტურა, ღვინო …). Both are loaded with a Georgian `unicode-range`, so mixed strings fall through to them automatically. The `--display` and `--sans` stacks include them.
- Note: the Fraunces and DM Sans fontsource packages here only ship the `latin` subset, so the Azerbaijani "ə" is not covered. Country names are written in English plus Georgian script, and no Armenian or Azerbaijani native script is used until a font with those glyphs is added.

## Motifs

1. **Perforated stamp**: a pure-CSS mask (`radial-gradient` holes tiled with `round` plus a centre rectangle) that cuts real perforations, so the page paper shows through. It is reusable at any size: hero country stamps, experience cards and the mini stamps on the postcards.
2. **Airmail envelope + stripe**: the hero's main visual is an envelope with a red and green chevron border, a "PAR AVION · BY AIR MAIL" label, the sender's address and a handwritten-style addressee.
3. **Round postmark** ("TBILISI • LOCAL HOST • SOUTH CAUCASUS • EST. 2015") and **wavy cancellation lines**, both in multiply-blended ink over the stamps.
4. **Postcards** for hosts: a landscape photo on the left and the written back on the right, with a stamp, postmark, kicker ("Postcard from · Host 01 of 06") and a quote signed "— The Local Host team". The quotes come from Local Host's own Sustainability Policy, so they are presented as the team's words, not the hosts'.
5. **Visa ink stamps**: rotated outline stamps in different shapes (round, rectangle, double-rule, dashed). They are used for Travelife and the trade fairs, and are planned for memberships and awards.
6. **Split-flap board**: the black housing has screws, and each flap has its own hinge line and pins. The yellow characters scramble into place, a green LED blinks "DIRECT", there is a TBS/KUT tab and a live Tbilisi clock (UTC+4).
7. **Passport cover footer**: deep green, a faint guilloche security print, a debossed foil seal ("GEORGIA • ARMENIA • AZERBAIJAN • LOCAL HOST") and foil headline type.
8. **Numbered postal labels** for sections: "NO. 01 … NO. 05" in a ruled mono box.

## Motion ideas

- **Board flip (built):** on load and on the TBS/KUT tab switch, each flap cycles random characters (about 55 ms per tick, with a tiny scaleY "clack"). Flaps settle left-to-right and row by row. A real build could add a very quiet, opt-in clack sound.
- **Stamp drop + postmark thunk (built):** the three country stamps drop onto the envelope in sequence, then the postmark lands with a slight overshoot.
- **Hover:** stamps straighten and lift (rotation goes to 0, then a small rise and scale). Experience photos slowly zoom, and arrows nudge.
- **Scroll ideas:** wavy cancellation lines "ink in" left-to-right as the section enters. Visa stamps "press" in with a 1.15 to 1 scale and an ink-bleed blur that clears. The airmail stripe could creep sideways very slowly, like a ticker. Postcards could flip on tap (mobile) to show the back.
- Everything respects `prefers-reduced-motion`: animations and transitions are disabled, and the board renders its final text immediately.

## How the remaining sections look in this direction

- **Airlines (typography wall):** a "luggage-tag wall". Twelve airline names (Turkish, Georgian, airBaltic, Air France, Aegean, Pegasus, Wizz Air, easyJet, Lufthansa, LOT, Austrian, British) are set in Fraunces and JetBrains Mono at mixed sizes on cream baggage tags with a punched hole and a string. Each tag shows a mono "TBS" or "KUT" destination code. There are no logos. The tags hang in two loose rows and sway slightly on hover.
- **Kutaisi board:** the same split-flap board, using the **KUT** tab already in the mock. Both boards expand to the full 20 cities (4 × 5) via "All 20 cities", which opens the board to full height with a flap cascade. The footnote "Direct connections vary by season — ask us for the current schedule" is always visible.
- **Meet us at (fairs):** a **passport page**: a cream spread with a faint guilloche pattern and page number, and six visa entry stamps (BIT Milano, BMT Naples, ITB Berlin, Tour Salon Poznań, TTG Rimini, TT Warsaw). Each stamp has its own shape and ink (red, green, ink, foil), a city, and a small "ENTRY" mark. Dates are shown only when confirmed. A teaser version is already in the footer.
- **Proud member of:** five rectangular "residence permit" stamps (GNTA, GTA, CEBG, PIT, SIT) in green ink, with the acronym large and the full name small. They are placed in a tidy row on the same passport spread so they read as official.
- **Awards:** a large circular wax-seal-style stamp for **"Welcome to Georgia" National Tourism Awards 2016 — Nominee, "The fastest growing company of the year in segment"**. It sits next to four perforated "commemorative issue" stamps left empty with a dashed "Award design / Nominee" slot until the facts are verified.
- **We Support:** "charity stamps", meaning small cream stamps with a green border and a "+" surcharge mark in the corner (the classic semi-postal stamp), one per supported project. They link to the project.
- **Contact:** the passport-cover footer already in the mock (address, phone, email, web, fairs), with a "Request a programme" form styled as an **airmail letter**: lined paper, a "To: Local Host, Tbilisi" header, and a submit button that is a red "Send by airmail" stamp.
- **AI Trip Planner ("Plan with AI ✦"):** a **travel-document builder**. The visitor picks countries by tapping the three country stamps, picks interests by tapping the six experience stamps (selected ones get "cancelled" with a postmark), and sets length, month and group type with mono pill selectors. The streamed itinerary types out as a **telegram / boarding-pass itinerary**: each day is a perforated tear-off section with "DAY 01 · TBILISI" in flap-style type. "Send this plan to Local Host" folds the itinerary into an envelope. In demo mode a red rubber stamp reads "SAMPLE ITINERARY — DEMO".

## Accessibility notes

Contrast ratios (WCAG 2.x, computed):

| Pair | Ratio | Use |
|---|---|---|
| Ink `#1F1A14` on paper `#F4EDE0` | **14.8 : 1** | Body and headlines (AAA) |
| Ink-2 `#51483B` on paper | **7.7 : 1** | Secondary text (AAA) |
| Ink-2 on paper-2 `#EBE1CE` | **6.9 : 1** | Experiences intro (AA) |
| Red-ink `#B3171E` on paper | **5.9 : 1** | Small labels (AA) |
| Brand red `#D02027` on paper | 4.6 : 1 | Large display only ("local host.") (AA large) |
| White on brand red `#D02027` | **5.4 : 1** | "Plan with AI" CTA, red stamps (AA) |
| Cream `#FFF7EA` on brand green `#13783C` | **5.2 : 1** | Text on green stamps (AA) |
| Cream `#FFF7EA` on brand red | **5.0 : 1** | Text on red stamps (AA) |
| Brand green on paper | **4.8 : 1** | Italic accents, Georgian labels (AA) |
| Green-ink `#0F6533` on sage `#E3E8D6` | **5.7 : 1** | Small labels in the sustainability strip (AA) |
| Flap yellow `#FFC629` on flap `#1F1F1D` | **10.5 : 1** | Departure board (AAA) |
| Board label `#8A8374` on board | 4.9 : 1 | Column headers (AA) |
| Foil `#D8B86E` on passport green `#0C3F22` | **6.3 : 1** | Footer headings (AA) |
| Footer text `#CFC8B4` on passport green | **7.2 : 1** | Footer body (AAA) |
| Light green `#2BB34B` on paper | 2.4 : 1 | **Decorative only** (logo hill), never text |

Other notes:
- The split-flap board is `aria-hidden`, and a visually hidden `<table>` with the same rows (caption "Direct flights to Tbilisi") is updated whenever the tab changes. Tabs use `role="tab"` and `aria-selected`.
- The carousel uses real `<button>`s with labels and a disabled state at the ends. The track is keyboard-scrollable (`tabindex=0`, scroll-snap) and the counter is `aria-live="polite"`.
- Decorative postmarks, waves, emblem and stripes are `aria-hidden`. The illustrated Armenia and Azerbaijan placeholders have `role="img"` and labels, and are visibly marked "Illustration".
- Georgian strings carry `lang="ka"`, and language links carry their own `lang`.
- Focus ring: a 3 px red outline with offset. Tap targets are ≥ 40 px on mobile.
- Rotations stay small (≤ 3°) so text remains easy to read, and all body copy is set horizontally.
- `prefers-reduced-motion` disables all animation.

## Content & honesty flags (for `docs/CONTENT-TODO.md`)

- **Flight rows are placeholders**, chosen to match the template's airline list. TBS: Istanbul/Turkish, Warsaw/LOT, Munich/Lufthansa, Riga/airBaltic, Athens/Aegean, Vienna/Austrian. KUT: Wizz Air routes. They must be verified against `docs/research/` before launch.
- The Armenia and Azerbaijan stamps use SVG engraving-style illustrations until licensed photos land in `src/assets/photos/` (with credits in the footer "Photo credits").
- Host postcards use **landscape** photos marked "illustrative", never portraits. Quotes are the team's words from the Sustainability Policy.
- Sustainability figures (−36.3 % gas, −10.1 % energy, Jan–Oct 2025 vs 2024) come from the brief and the report. The Travelife wording is "work to the Travelife criteria" until the certificate level is confirmed.
- The hero proverb "სტუმარი ღვთისაა" ("A guest is a gift from God") is a well-known Georgian saying. A native speaker should still review it along with the other Georgian strings.
