# Content to-do

Everything the new site needs from people — the owner (Local Host), native speakers or the designer — before launch. Agents append here whenever they leave a slot or make a draft. Keep each item short: **what**, **where on the site**, **from whom**.

## Translations (drafts — need native review)

All copy was written in English first (canonical) and drafted by us in Georgian, Polish, Italian and German. **Every non-English file is a draft and needs a native speaker's review before launch.** Each draft file starts with `"_note": "Draft translation — needs native review"`.

| Language | Files | Reviewer |
|---|---|---|
| Georgian (ka) | `src/i18n/ka/*.json` | Local Host team (native) |
| Polish (pl) | `src/i18n/pl/*.json` | Polish partner agency or translator |
| Italian (it) | `src/i18n/it/*.json` | Italian partner agency or translator |
| German (de) | `src/i18n/de/*.json` | German partner agency or translator |

Points to check in particular:

- **Navigation labels** — ka „შთაბეჭდილებები“ (Experiences), „ჩამოსვლა“ (Getting here); pl „Doświadczenia“, „Dojazd“, „Spotkajmy się“; it „Host“; de „Treffen Sie uns“. They must be short and natural.
- **Georgian address** — „ა. ბაქრაძის ქ. 7, 0159 თბილისი“: confirm the official spelling of the street.
- **Hero** — the Georgian headline „სადაც ყოველი სტუმარი საჩუქარია.“ and the gloss of the proverb „სტუმარი ღვთის საჩუქარია“ in each language.
- **Legal name** — „შპს „Local Host““ in the Georgian footer.
- **Policy PDFs** are English only; other languages label the links "PDF · in English". Translated PDFs would be welcome.
- The Georgian ring text on the hero postmark (`hero.seal.ring`).
- Section strings: only English exists for the twelve home-page sections until each section agent adds ka/pl/it/de.

## Facts and assets from Local Host

- **Host details** — Vacheishvili Family, Aluda, Maia: no verified details yet (where they are, what guests do there). The site uses warm copy with no specific claims until we hear from you.
- **Host portraits** — real photos of the hosts, with their permission. Until then the site shows landscape photos and monogram seals ("Host portraits to follow").
- **Awards** — the template has four nominee slots; two are verified (Welcome to Georgia! National Tourism Awards — 2016 nominee "The Fastest Growing Company of the Year", SME segment; 2026 nominee "Inbound Tour Company of the Year"). Any other awards or certificates?
- **Travelife** — the official *Travelife Partner* logo and certificate (the site sets a typeset "Travelife · Partner" badge until then).
- **CEBG** — confirm it is the Convention & Exhibition Bureau of Georgia and that Local Host is a member.
- **We support** — partner projects to feature. Research ideas (for the owner to consider only, never shown on the site): Caucasus Nature Fund, Transcaucasian Trail, NACRES, Elkana.
- **Fairs** — TT Warsaw: dates of the next edition (the footer stamp shows no date for it). Confirm which fairs you will attend in 2026–27 and whether partners can book meetings by email.
- **Airlines** — Air France stopped its own Paris–Tbilisi flights in spring 2026; the site shows "Transavia · Air France–KLM" in that slot. Confirm.
- **Photo credits** — `src/data/photo-credits.json` (credits for the openly licensed Armenia/Azerbaijan photos). The `/credits/` page says "being compiled" until it exists.
- **Social / OG image** — `public/og/og-default.png` uses the company's Gergeti photo with the logo. Confirm you are happy for it to appear when the site is shared.

## Brand files

- **One-colour stacked logo** — `src/assets/brand/` has mono versions of the horizontal logo and the icon, but not of the stacked lockup. `Logo.astro` falls back to the horizontal one-colour logo when a one-colour stacked logo is requested.
