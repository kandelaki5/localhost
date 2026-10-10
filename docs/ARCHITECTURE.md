# Architecture — the contract for section agents

The foundation (layout, tokens, i18n, shared components, Hero) is built. Every other home-page section is a **stub** that one agent replaces. Read this whole file, then `docs/BRIEF.md` and `docs/DESIGN.md`, before you start.

**Golden rule:** you own your section's files and nothing else. If a shared file needs a change, write a request in `docs/requests/<section>.md` (see [Requests](#requests-for-shared-files)) and work around it inside your own files until it lands.

---

## 1. Commands

```bash
npx astro dev --port 45xx --host 127.0.0.1   # your own port, see §13. Stop it with kill <pid> when done
npx astro check                              # must report 0 errors in your files
npx astro build                              # must pass
node scripts/shoot.mjs <url> <out.png> <w> <h> [--full] [--selector=css] [--wait=ms]
node scripts/export-tokens.mjs               # only the foundation owner runs this (tokens.css → design/tokens/tokens.json)
```

Astro 7 `astro dev` detaches and prints its PID. Don't run `astro dev stop` — it can stop other agents' servers.

## 2. Folder map

```
src/
  styles/        fonts.css · tokens.css (ALL design values) · global.css (reset, base type, utilities)
  layouts/       Base.astro — <html lang>, head/SEO/hreflang/OG/JSON-LD, skip link, Header, <main id="main">, Footer
  components/
    Header.astro · Footer.astro · HomePage.astro (section order)
    ui/          shared, presentational components (see §6)
    sections/    Hero.astro (done) + one STUB per section — yours to replace
    sections/<key>/   your sub-components, data helpers, scripts (create it)
    pages/       CreditsPage.astro · AiLabPage.astro (page bodies shared by / and /[lang]/)
  i18n/
    index.ts     LOCALES, getLang, useStrings, localizePath, alternateLinks …
    <lang>/<key>.json   strings — en is canonical; ka, pl, it, de merge over it
  lib/           sections.ts (ids, numbers, nav) · markup.ts · photos.ts · geo.ts · uid.ts · tokens.ts · css-tokens.mjs · brand-png.ts
  lib/ai/        AI core (owned by the AI agents — read docs/AI-ARCHITECTURE.md)
  data/          researched JSON (flights, fairs, research-orgs, caucasus-map, photo-credits …) — read-only for sections
  assets/brand/  the chosen logo (read-only)    assets/photos/  photographs    assets/inspiration/ (AI demos, read-only)
  pages/         index.astro · [lang]/index.astro · credits · ai-lab · styleguide · 404 · icon PNG endpoints
public/          favicon.svg · robots.txt · og/og-default.png · assets/policies/*.pdf (old URLs — keep)
design/tokens/   tokens.json (Tokens Studio) + README for the designer
docs/            BRIEF · DESIGN · ARCHITECTURE (this) · CONTENT-TODO · requests/
```

## 3. Ownership

### Sections

| # | id (URL) | Component (yours) | Folder (yours) | Strings (yours, all 5 languages) | Surface |
|---|---|---|---|---|---|
| 01 | `#caucasus` | `sections/Caucasus.astro` | `sections/caucasus/` | `i18n/*/caucasus.json` | paper |
| 02 | `#experiences` | `sections/Experiences.astro` | `sections/experiences/` | `i18n/*/experiences.json` | paper |
| 03 | `#hosts` | `sections/Hosts.astro` | `sections/hosts/` | `i18n/*/hosts.json` | paper |
| 04 | `#airlines` | `sections/Airlines.astro` | `sections/airlines/` | `i18n/*/airlines.json` | paper |
| 05 | `#connection` | `sections/Connection.astro` | `sections/connection/` | `i18n/*/connection.json` | **night** |
| 06 | `#meet-us` | `sections/MeetUs.astro` | `sections/meet-us/` | `i18n/*/meet-us.json` | paper |
| 07 | `#members` | `sections/Members.astro` | `sections/members/` | `i18n/*/members.json` | paper |
| 08 | `#awards` | `sections/Awards.astro` | `sections/awards/` | `i18n/*/awards.json` | paper |
| 09 | `#sustainability` | `sections/Sustainability.astro` | `sections/sustainability/` | `i18n/*/sustainability.json` | paper |
| 10 | `#support` | `sections/Support.astro` | `sections/support/` | `i18n/*/support.json` | paper |
| 11 | `#plan` | `sections/Plan.astro` | `sections/plan/` | `i18n/*/plan.json` | **night** |
| 12 | `#contact` | `sections/Contact.astro` | `sections/contact/` | `i18n/*/contact.json` | paper |

Section X owns **`src/components/sections/X.astro`, `src/components/sections/x/**` and `src/i18n/*/x.json`** — nothing else.

- Keep the **root element, its `id` and its `aria-labelledby`** exactly as in the stub. The header's active-section dot, the language switcher's "keep my place" and every nav link depend on them. Night sections keep `<NightSurface as="section" id=… labelledby=…>`.
- Keep the `<SectionHead number={…} id="<id>-title" …>` (number = the table above). You may pass extra content into its slot (tabs, arrows).
- Delete the `<Placeholder>` when you ship.

### Shared files — never edit

Everything else: `src/styles/**`, `src/layouts/**`, `src/components/{Header,Footer,HomePage}.astro`, `src/components/ui/**`, `src/components/pages/**`, `src/components/sections/Hero.astro`, `src/i18n/index.ts`, `src/i18n/*/{common,hero,ai-lab,credits}.json`, `src/lib/*` (except `lib/ai`), `src/pages/**`, `public/**`, `astro.config.mjs`, `package.json`, `scripts/export-tokens.mjs`, `design/tokens/**`, this file.

AI agents own `src/lib/ai/**`, `src/pages/api/**`, `src/pages/ai-lab/dev/**`, `scripts/mock-anthropic.mjs`. Research/data agents own `src/data/*.json`, `scripts/data/**`, `docs/research/**`. Read their files; don't edit them.

### Requests for shared files

Need a new token, an icon, a component prop, a nav change, a common string? Create or append to **`docs/requests/<your-key>.md`**:

```markdown
## <short title>
- File: src/components/ui/Icon.astro
- What: add a `suitcase` icon (24 × 24, 1.5 px stroke)
- Why: Experiences "Leisure" card
- Meanwhile: inline SVG inside sections/experiences/LeisureIcon.astro
```

The foundation owner applies requests and removes your workaround afterwards.

## 4. i18n

```astro
---
import { getLang, useStrings, localizePath, localeInfo } from '../../i18n';
const lang = getLang(Astro);                  // 'en' | 'ka' | 'pl' | 'it' | 'de'
const t = useStrings(lang, 'experiences');    // typed from src/i18n/en/experiences.json
const common = useStrings(lang, 'common');    // shared strings (nav, CTAs, contact, countries …)
---
<h3>{t.cards[0].title}</h3>
<a href={localizePath('/credits/', lang)}>{common.footer.photoCredits}</a>
```

| API | What it does |
|---|---|
| `LOCALES` | `[{ code, short, native, english, bcp47, ogLocale }]` in display order (en, ka, pl, it, de) |
| `getLang(Astro)` | Language of the page being rendered (works in any component) |
| `useStrings(lang, key)` | Loads `src/i18n/<lang>/<key>.json` and deep-merges it over the English file. Missing keys fall back to English and print a dev warning (`[i18n] ka/hosts.json is missing "cards[2].text"`). Keys starting with `_` are notes. |
| `localizePath(path, lang)` | `/credits/` → `/de/credits/`; keeps `?query` and `#hash`; leaves URLs, `mailto:`, `#anchors` and files (`/assets/*.pdf`) alone |
| `alternateLinks(path)` | hreflang list incl. `x-default` (Base.astro already emits them) |
| `localeInfo(lang).bcp47` | For `Intl.DateTimeFormat` / `NumberFormat` (dates, months, numbers) |
| `contentLang(lang, key)` | `lang` if `src/i18n/<lang>/<key>.json` exists, else `'en'`. The stubs put `lang="en"` on the section root while a section is untranslated, so English fallback text keeps English typography on /ka/. Keep that line — it switches itself off once your translations exist. |
| `fmt(template, vars)` (`lib/markup`) | `"© {year} Local Host"` placeholders |
| `inline(text)` (`lib/markup`) | `*accent*` → `<em>`, `**bold**`, `\n` → `<br>`; HTML-escaped, safe for `set:html` |

**Adding strings**

1. Add the key to `src/i18n/en/<key>.json` first — English is canonical and defines the type.
2. Add the same key to **ka, pl, it, de**. Draft natural copy (not word-for-word); Georgian in Mkhedruli. Put `"_note": "Draft translation — needs native review (docs/CONTENT-TODO.md)."` at the top of each translated file.
3. Titles may carry one `*italic accent*` (rendered in the emphasis colour). Georgian has no italics — the accent keeps only its colour.
4. Data that isn't copy (IATA codes, coordinates, ids) belongs in your component or `sections/<key>/data.ts`, not in JSON strings.
5. Georgian text inside a Latin page needs `lang="ka"` on its element (fonts, line height and casing switch automatically).
6. No facts beyond `docs/BRIEF.md`, `docs/DESIGN.md` and `docs/research` — unknowns go to `docs/CONTENT-TODO.md`.

## 5. Design tokens

- Every colour, size, space, radius, border, shadow, duration, easing and z-index comes from `src/styles/tokens.css`. **No hex codes, px font sizes or ad-hoc durations in components.** Need a value that doesn't exist? Request a token.
- Use **role** tokens (`--color-text`, `--color-text-muted`, `--color-emphasis`, `--color-red-ink`, `--color-green-ink`, `--color-accent`, `--color-rule`, `--color-bg-raised` …), never `--palette-*` or `--brand-*` directly. Surfaces re-map roles, so role-based styles work on night and Forest for free.
- Type: `.display .display--xl|l|m|s` for headlines (accent words in `<em>`), `.kicker` for small caps, `.fig-caption` for italic captions, `.lead` for intro paragraphs. Sizes `--fs-3xs … --fs-5xl` are fluid. Fraunces: weight ≥ 360 below 40 px (`--fw-display-sm` / `--fw-display-m`), Noto Serif Georgian ≥ 400 at small sizes.
- Layout: `.container` (max 1312 px + fluid gutter), `.grid-12` (12 columns, `--layout-gap`), `.section` (vertical padding `--space-section`).
- Red is the sun/pin accent only (`--color-accent`): marks, the active dot, map pins, quote marks, the AI sparkle. Small red **text** uses `--color-red-ink`.
- `/styleguide/` shows every token with contrast ratios and every component.

## 6. Shared components (`src/components/ui/`)

| Component | Props (all optional unless marked) |
|---|---|
| `SectionHead` | `kicker`*, `title`* (`*accent*`), `intro`, `running`, `number`, `id` (heading id), `level` 1–3, `size` xl/l/m, `layout` split/stack; default slot = extra content under the intro |
| `Button` | `href` (→ `<a>`, else `<button>` with `type`), `variant` primary/secondary/ai, `size` sm/md/lg, `icon` (end), `iconStart`, `full`, `external`, `newTabLabel`, plus any `<a>`/`<button>` attribute |
| `Icon` | `name`* (see `ui/icons.ts`), `size` (20), `label` (makes it `role="img"`), `tone` current/sun, `strokeWidth` |
| `Figure` | `alt`*, `photo` (file name in `src/assets/photos`, no extension) or `src`, `ratio` ("4/5"), `focal` ("45% 55%"), `widths`, `sizes`, `fig` (number → "Fig. 1"), `caption`, `coords` [lat, lon], `credit`, `priority`, `zoom`, `align`; slots `overlay` (on the photo) and `caption` (after the caption) |
| `Stamp` | `tint` paper/green/red, `perf`, `pad`, `shadow`, `rotate` (±2°), `as`, `href` |
| `Seal` | `variant` round/permit, `tone` ink/green/red/foil/current, `ring` (round: curved text, end with " •"), `top`, `main`, `bottom`, `serial`, `rotate` (±2°), `size`, `inked`, `label` (else decorative); default slot replaces the centre (e.g. a mono logo) |
| `RidgeDivider` | `variant` paper/night, `seed`, `label`, `height`, `pin` |
| `NightSurface` | `as`, `id`, `labelledby`, `grid`, `glow` top/center/bottom/none, `ridge`, `ridgeSeed`, `padded` |
| `Logo` | `variant` horizontal/stacked/icon, `tone` light/reverse/mono, `label`, `decorative`, `height` — always loads `src/assets/brand/*`; ids are scoped per instance |
| `LangSwitch` | `variant` inline/list, `path` |
| `Placeholder` | stub helper — delete it when your section ships |

**Styling a child component from your section:** Astro scopes styles with an attribute, and that attribute is *not* passed to a child component's root. Target it with `:global()` under one of your own classes:

```css
.experiences :global(.stamp) { … }      /* ✓ */
.stamp { … }                             /* ✗ never matches the Stamp component */
```

## 7. Photos

- `<Figure photo="svaneti-1" alt="…" ratio="4/5" focal="55% 65%" sizes="(min-width: 64em) 33vw, 100vw" />`. Names = files in `src/assets/photos/` (see `PHOTO_NAMES` in `lib/photos.ts`). Focal points and the allocation per section are in `docs/research/photo-plan.md` — follow it so no photo is used twice as a primary choice.
- Always set `sizes` to the rendered width; only the hero uses `priority`. Output is AVIF + WebP, lazy by default.
- Captions: `fig`, `caption` and, where it helps, `coords` (e.g. `[42.6622, 44.6203]`). Number figures within your section, starting at 1.
- Openly licensed photos (Armenia/Azerbaijan) must be credited in `src/data/photo-credits.json` (the /credits/ page reads it). Never generate or imply photos of the real hosts.

## 8. The night surface

Connection (05) and Plan (11) are night sections. The stub already wraps them in `NightSurface` (Forest-night gradient, faint survey grid, green glow, optional glowing ridge on top). Inside, everything uses the same role tokens and components; the surface re-maps them (cream text, mint accents, mint focus ring). Board specifics (amber `--color-amber` TBS lamps, `--color-led` KUT lamps, `--shadow-board`, `--radius-md`) are tokens too.

## 9. Motion

- Durations and easings are tokens (`--dur-*`, `--ease-*`). Under `prefers-reduced-motion: reduce` every duration token becomes 0 and global CSS cancels animations.
- **Content must be complete and visible without JS and without motion.** Put entrance animations inside `@media (prefers-reduced-motion: no-preference)`. In scripts, check `matchMedia('(prefers-reduced-motion: reduce)')` and render final states directly (the split-flap board shows final characters).
- Scroll-triggered effects: IntersectionObserver, run once, unobserve. No scroll-jacking, no parallax over ~40 px, nothing that blocks reading.

## 10. Client JS

- Use Astro `<script>` in your component (bundled as a module, deduped, deferred). **No UI frameworks**, no third-party CDNs, no runtime fonts.
- Keep it small: aim under ~3 KB gzipped per section. Progressive enhancement only — links and anchors work without JS.
- Scope queries to your section root: `const root = document.getElementById('experiences')`. Hook onto `data-*` attributes, not styling classes. No globals.
- AI features: import only `src/lib/ai/{types,locales,places,markers,client}` in the browser (see `docs/AI-ARCHITECTURE.md`).

## 11. Accessibility checklist

- [ ] One `<h2>` per section (from `SectionHead`); sub-headings `h3`/`h4` in order.
- [ ] Every image has a meaningful `alt` (or `alt=""` if purely decorative); decorative SVG/letters are `aria-hidden="true"`.
- [ ] Text contrast AA (≥ 4.5 : 1; ≥ 3 : 1 for 24 px+ or bold 19 px+) — use role tokens and check `/styleguide/`.
- [ ] Everything works with the keyboard; focus is visible (global `:focus-visible` ring — don't remove it); no keyboard traps.
- [ ] Buttons are `<button>`, links are `<a href>`; icon-only controls have a visible-or-hidden label.
- [ ] Carousels: prev/next buttons with labels and `disabled` states, an `aria-live="polite"` counter, no autoplay.
- [ ] Tabs: `role="tablist"` / `tab` / `tabpanel`, `aria-selected`, arrow-key support.
- [ ] Visual-only content (split-flap board) has an equivalent: `role="table"` with row labels, or a visually hidden table.
- [ ] Georgian inside Latin pages has `lang="ka"`; dates and numbers through `Intl` with `localeInfo(lang).bcp47`.
- [ ] Reduced motion honoured; nothing flashes more than 3 times a second.
- [ ] Touch targets ≥ 44 × 44 px; no horizontal scroll at 320 / 390 / 768 / 1024 / 1440 px.

## 12. Screenshots

```bash
node scripts/shoot.mjs "http://127.0.0.1:4512/" out/experiences-1440.png 1440 900 --selector=#experiences --wait=1500
node scripts/shoot.mjs "http://127.0.0.1:4512/" out/experiences-390.png 390 844 --selector=#experiences --wait=1500
node scripts/shoot.mjs "http://127.0.0.1:4512/ka/" out/experiences-ka.png 1440 900 --selector=#experiences --wait=1500
```

`--selector=#<id>` captures just your section (the sticky header can overlap its top edge in that capture — expected). Check desktop (1440) and phone (390), and at least one other language (Georgian runs long and tall). Read every screenshot and fix what you see before reporting done. The Astro dev toolbar appears at the bottom centre in dev; it is not part of the site.

## 13. Ports

| Who | Port |
|---|---|
| Foundation | 4500 |
| Section agents | 4510–4530 — Caucasus 4511 · Experiences 4512 · Hosts 4513 · Airlines 4514 · Connection 4515 · Meet us 4516 · Members 4517 · Awards 4518 · Sustainability 4519 · Support 4520 · Plan 4521 · Contact 4522 (spares 4523–4530) |
| AI agents | 4400–4499 (see `docs/AI-ARCHITECTURE.md`) |

Kill your dev server (`kill <pid>`) when you finish.

## 14. Definition of done (per section)

1. Stub replaced; `id`, `aria-labelledby`, `SectionHead` number unchanged; `Placeholder` removed.
2. Strings in all five languages (`_note` on the four drafts); facts only from the brief, design spec and research; unknowns in `docs/CONTENT-TODO.md`.
3. Only tokens and shared components for visual values; no edits outside your files (requests filed instead).
4. `npx astro check` — 0 errors in your files; `npx astro build` passes.
5. Screenshots at 1440 and 390 (EN + one other language) reviewed; no horizontal scroll; keyboard and reduced-motion pass.
