# Design tokens — for the designer

Every colour, typeface, size, space, radius, shadow and motion value on localhost.ge comes from **one file**: `src/styles/tokens.css`. Components never hard-code a value, so re-skinning the site means editing tokens, not templates.

`design/tokens/tokens.json` is a mirror of that file in the **W3C Design Tokens format** (`$value`, `$type`, `$description`), laid out for **Tokens Studio for Figma**.

## Import into Figma (Tokens Studio)

1. In Figma, open the Tokens Studio plugin → **Settings → Token format: W3C DTCG**.
2. **Tools → Load from file / folder → `design/tokens/tokens.json`** (or sync the repo through the plugin's GitHub storage, path `design/tokens/tokens.json`).
3. Six token sets appear:

| Set | What is in it |
|---|---|
| `core` | Brand colours from the logo, the palette, font families, weights, line heights, letter spacing, fixed spaces, layout, radii, borders, stamp perforation, opacity, shadows, motion, z-index |
| `surface/paper` | Colour **roles** (`color.bg`, `color.text`, `color.emphasis`, `color.red-ink` …) for the default paper pages |
| `surface/night` | The same roles re-mapped for the dark "mission control" sections (Connection board, AI planner, AI Lab) |
| `surface/forest` | The same roles re-mapped for the passport-cover footer |
| `viewport/desktop` | Fluid sizes at a 1440 px screen (type scale, section spacing, gutters) |
| `viewport/mobile` | The same fluid sizes at a 360 px screen |

4. Six **themes** combine them: *Paper · desktop*, *Paper · mobile*, *Night · desktop* … Switch theme to preview a frame on another surface or screen size.

Design with the **role** tokens (`color.*`), not the palette. That is what lets one component work on paper, night and Forest.

## How the site uses them

- `src/styles/tokens.css` — the source. One declaration per line; the comment after a value becomes its description here.
- `[data-surface="night"]` and `[data-surface="forest"]` blocks at the end of that file re-map the roles. Any element with that attribute (and everything inside it) switches automatically.
- Fluid values are CSS `clamp()` between the mobile and desktop numbers in the two viewport sets.
- `/styleguide/` on the running site shows every token, the type scale in Latin and Georgian, contrast ratios for every role pair, and every component.

## Handing a new design back

You can change values in either place:

- **Edit `src/styles/tokens.css`** (simplest), then run `node scripts/export-tokens.mjs` to refresh this JSON; or
- **Edit in Tokens Studio** and send us the exported JSON. A developer copies the new values into `tokens.css` (the names map 1 : 1 — every token carries its CSS name in `$extensions["ge.localhost"].css`) and re-runs the script.

`node scripts/export-tokens.mjs --check` fails if this JSON is older than `tokens.css`, so CI can catch drift.

### Naming

| CSS | Token path | Example |
|---|---|---|
| `--brand-*` | `brand.*` | `--brand-sun` → `brand.sun` |
| `--palette-*` | `palette.*` | `--palette-paper-200` → `palette.paper-200` |
| `--color-*` | `color.*` (surface sets) | `--color-text-muted` → `color.text-muted` |
| `--font-*` / `--fs-*` / `--lh-*` / `--fw-*` / `--tracking-*` | `font.family.*` / `font.size.*` / `font.lineHeight.*` / `font.weight.*` / `font.letterSpacing.*` | |
| `--space-*`, `--layout-*`, `--radius-*`, `--border-*`, `--shadow-*` | `space.*`, `layout.*`, `radius.*`, `border.*`, `shadow.*` | |
| `--dur-*`, `--ease-*`, `--z-*` | `motion.duration.*`, `motion.easing.*`, `z.*` | |

### Values that stay in CSS only

Some tokens have no Figma equivalent and are not exported (they are listed in `$metadata.cssOnlyTokens`):

- `--texture-paper`, `--texture-ink` — the faint paper grain and the rubber-stamp ink mask (inline SVG noise).
- `--fvs-*` — Fraunces variation settings (optical size 144 for display, `WONK` 1 for the italic accents, 14 for captions). In Figma, pick the matching named instances: *Fraunces 144pt Light* for display, *Fraunces 9pt* for captions.
- `--filter-*` — CSS `drop-shadow()` filters used on perforated (masked) shapes and glowing lines.

## Typefaces (all SIL Open Font License, self-hosted)

| Role | Family | Notes |
|---|---|---|
| Display | **Fraunces** (variable: wght, opsz, SOFT, WONK) | 330 at 40 px and up; never lighter than 360 below 40 px. Italic accents use WONK 1. |
| Text / UI | **DM Sans** (variable, optical size) | 16–17.5 px body at 1.6 line height |
| Georgian display | **Noto Serif Georgian** | ≥ 400 at small sizes; scaled by `font.scale-ka` (0.76) at display sizes; no italics, no letter-spacing, no capitals |
| Georgian UI | **Noto Sans Georgian** | |
| Data / boards | **JetBrains Mono** | split-flap board, coordinates, codes |

## Logo

Use the files in `src/assets/brand/` (the owner's chosen logo, Option 2). Its flat colours are the `brand.*` tokens. Clear space and minimum sizes are in `design/logo/README.md` → "Chosen logo".
