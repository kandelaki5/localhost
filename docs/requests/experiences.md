# Requests — 02 Experiences (`#experiences`)

No shared-file changes are needed. The section uses only shared components (`SectionHead`, `Stamp`, `Icon`), role tokens and `astro:assets`.

## Coordination with 11 Plan (`#plan`)
- Each card's "Plan this with AI ✦" link is a plain `<a href="#plan">`, so it works without JS. With JS, the click also runs
  `window.dispatchEvent(new CustomEvent('lh:plan-preset', { detail: { interests: ['<experienceId>'] } }))`,
  where the id is one of `culture | wine | trekking | gastronomy | pilgrim | leisure` (`ExperienceId` in `src/lib/ai/types.ts`).
  The event fires before the browser follows the link, so the Plan section should preselect the interest when the event arrives.
- The preview page `src/pages/preview/experiences/[lang].astro` (noindex) can go once the integrated home page is stable.
  It includes a stand-in `#plan` target. Astro dev returns a 404 *status* for its `/en/` route but still renders the page (the same applies to `/preview/hosts/en/`).

## Content TODO
- **Native review**: `src/i18n/{ka,pl,it,de}/experiences.json` are drafts. Check in particular:
  - ka: the title „ექვსი გზა კავკასიისკენ.“ and the CTA „დაგეგმე AI-ით“, which follows the nav's informal „დაგეგმე“; switch both to „დაგეგმეთ“ if the site goes formal.
  - pl/it/de: experience names come from the AI knowledge base (`src/lib/ai/knowledge.ts`), e.g. it „Relax“ and de „Erholung“ for Leisure. Change them there so that the planner stays consistent.
- **Seasons line**: each card shows a 12-month strip and a short line condensed from the knowledge base's `seasons` text. Local Host should confirm:
  - Culture: year-round, best Apr–Jun and Sep–Oct.
  - Wine: year-round, harvest (rtveli) Sep–Oct.
  - Trekking: high routes Jun–Sep, lower routes May–Oct.
  - Gastronomy: year-round, "harvest flavours" Aug–Nov. The knowledge base only says "late summer and autumn", so the months are our reading of that.
  - Pilgrim: year-round, "feast dates checked every year".
  - Leisure: year-round, beach Jun–Sep, ski Dec–Apr.
- **Places per card** (all taken from the knowledge base lists). Confirm that Local Host runs programmes there, especially Armenia and Azerbaijan:
  - Culture: Tbilisi, Vardzia, Yerevan, Baku.
  - Wine: Telavi, Tsinandali, Sighnaghi, Areni.
  - Trekking: Mestia, Ushguli, Truso Valley, Khinalug.
  - Gastronomy: Kutaisi, Batumi, Yerevan, Sheki.
  - Pilgrim: Mtskheta, David Gareja, Khor Virap.
  - Leisure: Batumi, Borjomi, Gudauri, Lake Sevan.
- **Wine photo** (`rtveli-harvest.jpg`) shows two identifiable people, an older man and a boy. It is a company photo, never captioned with names. Confirm they agreed to appear on the website. Otherwise swap it for `kvevri-1.jpg` (focal `65% 70%`, no people) in `src/components/sections/experiences/data.ts`.
- **Gastronomy photo**: `georgian-food.jpg` is the only food photo. It shows mtsvadi, bread and greens, so it is not captioned as khinkali. Khinkali, supra, market or churchkhela photos from Local Host would strengthen this card.
