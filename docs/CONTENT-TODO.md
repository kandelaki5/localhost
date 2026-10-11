# Content to-do

Everything the new site needs from people — the owner (Local Host), native speakers or the designer — before launch. Agents append here whenever they leave a slot or make a draft. Keep each item short: **what** is needed, **why**, and **from whom**.

_Merged on 11 Oct 2026 from the section requests (`docs/requests/*.md`), the research open questions (`docs/research/*.md`) and the final fact-check of the English copy. Grouped by site section, in nav order._

---

## Top 10 before launch

1. **2026 award nomination: is it yours?** The Awards section shows a 2026 "Inbound Tour Company of the Year" seal. The official public-voting list names "Local Host" with no website or logo, so the match is on the name only. *Why:* we must not show a nomination that may belong to another company. *From:* owner (yes/no, plus the result after the ceremony).
2. **CEBG: what is it, and are you a member?** The site expands it as the Convention & Exhibition Bureau of Georgia and links gceb.ge, but Local Host is not in that bureau's current DMC directory. *Why:* a wrong membership claim on a "Proud member of" page. *From:* owner.
3. **GNTA: what is the relationship, and may we show it?** GNTA is a government agency with no members, yet it sits under "Proud member of". *Why:* wording and logo permission. *From:* owner (and GNTA, for the logo).
4. **Travelife Partner logo and certificate.** The official Partner logo files, the certificate image or PDF, and the Communication Guidelines. *Why:* the site shows a typeset "Travelife · Partner" badge and a "certificate image to come" card until then. *From:* owner (Travelife toolkit).
5. **Hosts: details, spelling and consent.** Where the Vacheishvili Family, Aluda and Maia are and what guests do there; the spelling "Enry"; every host's consent to be named, and real portraits with permission. *Why:* three host cards carry warm copy with no facts, and every card uses a landscape photo. *From:* owner, then each host.
6. **Partner kit: does one exist?** The Contact section promises "we will send you our partner kit". *Why:* the site must not promise something that doesn't exist. *From:* owner (send the PDF, or we reword `contact.json`).
7. **Trade fairs 2026–27: which ones, and with a stand?** Which fairs you will attend, whether you exhibit (own stand, or on the Georgia national stand) and whether partners can book meetings by email. *Why:* the site says "Meet us at the stand" and "Book a meeting at the stand". *From:* owner.
8. **Contact basics.** Office hours, the languages your team speaks, and official social media links. *Why:* the structured data (JSON-LD) currently claims English, Georgian, Polish, Italian and German, and the footer has no social links. *From:* owner.
9. **Logo option.** Confirm Option 2 "Balanced & Versatile" (the site's default) or choose Option 1 / 3, and gradient or flat for the header. *Why:* the redraw is based on an AI raster mock-up and needs a final sign-off. *From:* owner and the designer.
10. **Native review of every ka / pl / it / de string.** *Why:* all four languages are drafts written by us. *From:* native reviewers (see Translations).

---

## Company and contact (Hero · Contact · footer)

- **Team list.** Names and roles of the current team, if the owner wants a team block (the old site's team list must not be reused). *Why:* nothing on the site names staff yet. *From:* owner.
- **Office hours** and **languages spoken** by the team. *Why:* both are missing on the page, and the JSON-LD `knowsLanguage` (in `src/layouts/Base.astro`) lists all five site languages, which may overstate it. *From:* owner.
- **Social media links:** Facebook, Instagram, LinkedIn, TripAdvisor or Google Business. *Why:* no account tied to the company could be verified, so the footer shows none. *From:* owner.
- **Partner kit** (see Top 10 #6). *From:* owner.
- **How you operate in Armenia and Azerbaijan.** Own guides and drivers, or local partner agencies with a hand-over at the border? *Why:* the fact-check softened the hero from "run by our own team on the ground" to "run from Tbilisi by our own team", since you also have an Inbound Partner Agency Policy. If your own team does run tours on the ground in all three countries, we can restore the stronger wording. *From:* owner.
- **AI Lab triage desks.** The staff-tool demo routes emails to an "Italy desk", "Poland desk", "DACH desk", "CIS & Ukraine desk", "UK, US & Nordics desk" and "Western Europe & Asia desk". Do these desks exist, or should they be renamed (e.g. by person or by market)? *Why:* it implies an internal structure we have not confirmed. *From:* owner.
- **Social / OG image.** `public/og/og-default.png` uses your Gergeti photo with the logo. Confirm you are happy for it to appear when the site is shared. *From:* owner.
- **Directory listings with old contact details.** Please ask them to switch to A. Bakradze 7, 0159 Tbilisi · +995 514 37 44 33 · info@localhost.ge. *From:* owner, then each organisation.
  - **ŚIT** shows 61 Aghmashenebeli Ave and +995 32 215 87 77.
  - **PIT** shows "Marshal Archil Gelovani 23, 0102 Tbilisi" and a personal staff email.
  - **GTA** shows no address, but its profile text dates from about 2016 and could be refreshed.

## 01 · Caucasus

- **Georgia plate photo (`svaneti-1.jpg`).** Which village is it? It looks like Ushguli, but that is unverified, so the caption only says "Svan towers in Svaneti" and has no coordinates. *From:* owner. Then add the village to the caption and `coords` in `src/components/sections/caucasus/data.ts`.
- **Cross-border logistics wording.** The intro says "with the border crossings arranged by us", and the map notes say "our team arranges the transfers, the timings and the border crossings". Confirm this matches how you work in Armenia and Azerbaijan. *From:* owner.
- **Approximate drive times** (map notes): Tbilisi–Kazbegi ≈ 3 h · Tbilisi–Kutaisi ≈ 3.5 h · Kutaisi–Batumi ≈ 2.5 h · Tbilisi–Yerevan ≈ 5–6 h incl. border · Tbilisi–Sheki ≈ 5–6 h incl. border · Sheki–Baku ≈ 5 h. *Why:* they come from `TRAVEL_TIMES` in `src/lib/ai/knowledge.ts`; please confirm they are the figures you quote to partners. *From:* owner.
- **Azerbaijan land border.** Azerbaijan has kept its land borders closed to most incoming passengers since 2020. The Tbilisi–Baku night train restarted on 26 May 2026, and the special quarantine regime behind the closure was reportedly extended to January 2027 (AZERTAC, Sept 2026). The note under the drive times now says that border rules change, "Azerbaijan's above all", and asks visitors to check with you. Tell us how you currently move groups between Georgia and Azerbaijan (flight, train, or road in the Azerbaijan → Georgia direction only), so the wording can be precise. *From:* owner.
- **Own photos from Armenia and Azerbaijan.** They would replace the openly licensed Khor Virap and Baku photos and remove the attribution lines under the plates. *From:* owner.

## 02 · Experiences

- **Seasons line on each card.** Please confirm:
  - Culture: year-round, best Apr–Jun and Sep–Oct.
  - Wine: year-round, harvest (rtveli) Sep–Oct.
  - Trekking: high routes Jun–Sep, lower routes May–Oct.
  - Gastronomy: year-round, "harvest flavours" Aug–Nov. The knowledge base only says "late summer and autumn", so the months are our reading of that.
  - Pilgrim: year-round, "feast dates checked every year".
  - Leisure: year-round, beach Jun–Sep, ski Dec–Apr.
  
  *From:* owner.
- **Places per card** (from the knowledge base). Confirm you run programmes there, especially in Armenia and Azerbaijan:
  - Culture: Tbilisi, Vardzia, Yerevan, Baku.
  - Wine: Telavi, Tsinandali, Sighnaghi, Areni.
  - Trekking: Mestia, Ushguli, Truso Valley, Khinalug.
  - Gastronomy: Kutaisi, Batumi, Yerevan, Sheki.
  - Pilgrim: Mtskheta, David Gareja, Khor Virap.
  - Leisure: Batumi, Borjomi, Gudauri, Lake Sevan.
  
  *From:* owner.
- **Wine photo consent.** `rtveli-harvest.jpg` shows two identifiable people, an older man and a boy (never captioned with names). Did they agree to appear on the website? If not, swap it for `kvevri-1.jpg` (focal `65% 70%`, no people) in `src/components/sections/experiences/data.ts`. *From:* owner.
- **Gastronomy photos.** `georgian-food.jpg` (mtsvadi, bread and greens) is the only food photo, so it is not captioned as khinkali. Khinkali, supra, market or churchkhela photos would strengthen the card. *From:* owner.

## 03 · Hosts We Love

- **Vacheishvili Family:** where they are, what the place is (guesthouse, winery, farm) and what guests do there. One unconfirmed candidate, matched on the surname only: "Nika Vacheishvili's Marani and Wine Guest House" in Didi Ateni, Gori (atenuri.ge). Is that them? *From:* owner.
- **Aluda:** the same questions. A "Guest House Aluda" in Omalo was once listed online (the page is now gone, and there are two villages called Omalo). Is that them? *From:* owner.
- **Maia:** the same questions. There is no public information, and Maia is not in the Sustainability Policy. *From:* owner.
- **Leila and Samvel & family:** village or region and what guests do there. The site only uses the policy's words (khinkali and life stories; warm hospitality and home-grown food). *From:* owner.
- **Sisatura (Marika & Enry):**
  - Confirm the spelling "Enry" (the policy has "Ermine" and "Henry").
  - Ask the hosts to check the facts the site takes from GNTA and travel listings: Chkhoria near Zugdidi; a family-run Megrelian ethno-village with traditional houses, a lake and an old water mill; ghomi, elarji, gebzhalia and a supra led by a tamada.
  
  *From:* owner, then the hosts.
- **Consent.** Every host's consent to be named on the website. *From:* owner, then each host.
- **Real host portraits, with permission.** Until then the site shows landscape photos and monogram seals ("Host portraits to follow"). Start with Sisatura, which already has photos online. *From:* owner, then each host.
- **Anzor (Jokolo, Pankisi Gorge)** is in your Sustainability Policy but not in the template. Should he appear too? *From:* owner.

## 04 · Airlines and 05 · Connection

- **Air France vs Transavia.** Air France stopped its own Paris–Tbilisi flights in spring 2026 (trip reports; no AF flight on the Tbilisi board in Oct 2026), so the wall shows "Transavia · Air France–KLM" in that slot. *Why:* the template lists Air France, and the wall must not imply routes that don't exist. Please confirm, or name another airline. Note: one report says Transavia's Paris flights run only in the four summer months. *From:* owner.
- **Seasonal re-check.** Both departure boards are from the airports' own schedules, checked 10–12 Oct 2026. Re-check before launch and each season. Frankfurt (Condor) only restarts on 2 May 2027. *From:* site maintainer.

## 06 · Meet us at

- **Fairs you will attend in 2026–27,** and whether you exhibit (own stand, or on the Georgia national stand). The page and the footer say "Meet us at the stand". *From:* owner.
- **Meetings:** may partners book meetings by email (info@localhost.ge)? *From:* owner.
- **TT Warsaw 2027 dates:** not announced yet (the 2026 edition ended 11 Oct 2026), so the stamp shows "Next dates to be announced". Add them to `src/data/fairs.json` when published. *From:* site maintainer (ttwarsaw.pl).
- **BIT Milano 2027 (9–11 Feb):** these dates come from fair-listing sites, because the official site blocks automated checks. Confirm them on bit.fieramilano.it. *From:* owner or site maintainer.

## 07 · Proud member of

- **CEBG** (see Top 10 #2): what does it stand for, and is the membership current? *From:* owner.
- **GNTA** (see Top 10 #3): what is the actual relationship, what wording do you want, and do you have permission to use the GNTA logo? *From:* owner.
- **Official member logos** (GTA, PIT, ŚIT and the others), with permission to use them. Until then each permit card shows the acronym. *From:* owner, or each organisation's press kit.

## 08 · Awards

- **The other two nominations.** The template has four "Award design / Nominee" slots; only two are verified, and empty slots are not shown. What are the other two (name, year, category, result)? *From:* owner.
- **Certificates.**
  - The 2016 nomination certificate, with the exact category name ("The Fastest Growing Company of the Year in the SME Segment").
  - Certificates for the "best incoming" and "best MICE" nominations mentioned on your GTA profile, with their years.
  
  *From:* owner.
- **2026 nomination** (see Top 10 #1): confirm it is yours. Also: the ceremony date (one unverified source says 28 Oct 2026, Tbilisi Opera), and may we show the result? *From:* owner.
- **Programme wording.** The fact-check changed "held every year since 2015" to "first held in 2015". The awards' own About page doesn't say "every year", and an "11th ceremony" in 2026 suggests at least one year was skipped. *From:* nothing needed unless you know otherwise.

## 09 · Sustainability

- **Travelife Partner logo, certificate and guidelines** (see Top 10 #4). *From:* owner.
- **Certified target date.** Do you have a target date for Travelife *Certified*? (The site says only "Partner", never "Certified".) *From:* owner.
- **Re-check the register before 26 Nov 2027,** when the current Partner recognition expires. *From:* site maintainer.
- **2026 accommodation target.** The site now states the target precisely: at least half of accommodation partners meeting at least one environmental or community criterion of the Accommodations Policy. If you have the actual 2026 figure, we can show it. *From:* owner.
- **Translated policy PDFs.** The policy PDFs are English only, and other languages label the links "PDF · in English". Translations would be welcome. *From:* owner.

## 10 · We Support

- **Partner projects to feature** (five slots in the template). Until then the section shows five commitments from your own policies and "Partner projects will be announced here." *Why:* no project could be verified, and your report puts criterion 1.6 "Donations" at April 2027. *From:* owner.
- **Research suggestions**, for the owner to consider only and **never shown on the site**:
  1. **Caucasus Nature Fund**: protected areas in Armenia, Azerbaijan and Georgia, with a corporate-support programme (caucasus-naturefund.org).
  2. **Transcaucasian Trail**: a long-distance trail across all three countries, which fits the Trekking product (transcaucasiantrail.org).
  3. **NACRES**: Georgian biodiversity conservation NGO (nacres.org).
  4. **Elkana**: Biological Farming Association; organic farming and rural tourism (elkana.org.ge; the site was down when checked, so re-check before linking).
  5. **SOS Children's Villages Georgia**: child welfare, consistent with your child-protection policy.

## Brand and design

- **Logo option** (see Top 10 #9): Option 1 "Modern & Confident", Option 2 "Balanced & Versatile" (current site default) or Option 3 "Refined & Distinctive"; gradient or flat in the header. *From:* owner and designer (`design/logo/chosen/index.html` shows all three).
- **One-colour stacked logo.** `src/assets/brand/` has mono versions of the horizontal logo and the icon, but not of the stacked lockup. `Logo.astro` falls back to the horizontal one-colour logo when a one-colour stacked logo is requested. *From:* designer.
- **Trademark check** of the chosen mark before adoption (Sakpatenti; EUIPO / WIPO for the EU markets). *From:* owner.

## Photos

- **Host portraits, with permission** (see Hosts).
- **Food photos:** khinkali, a supra table, markets, churchkhela.
- **Larger originals** of `bagrati.jpg` (800 px) and `tusheti.jpg` (1024 px).
- **Own photos from Armenia and Azerbaijan** (see Caucasus).
- **Ownership of company photos.** The 33 Georgia photos from the old site are credited "© Local Host LLC". Confirm you own them all, or name the photographers to credit. *From:* owner.
- **Photo credits** are compiled: 41 photos in `src/data/photo-credits.json`, shown on `/credits/`. Nothing needed unless photos change.

## Translations (drafts — need native review)

All copy was written in English first (canonical) and drafted by us in Georgian, Polish, Italian and German. **Every non-English file is a draft and needs a native speaker's review before launch.** Each draft file starts with `"_note": "Draft translation — needs native review"`. All sections and AI Lab pages now exist in all five languages.

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
- The Georgian ring text on the hero postmark (`hero.seal.ring`).
- **Formal or informal address.** ka mixes „დაგეგმე“ (informal, nav and the Experiences CTA) with „დაგეგმეთ“ (formal); pl uses the informal „Zaplanuj“ / „zapytaj nas“. Pick one register per language for a B2B site.
- **Caucasus** (`caucasus.json`):
  - ka: „ალის კოშკები“ for Baku's Flame Towers; „მეზობლად“ as the "next door" tag; „ჩ“ as the north-arrow letter.
  - pl: "Płonące Wieże" (Flame Towers); the "Po sąsiedzku" tag; the title "Jeden gospodarz.".
  - it: the title "Un solo padrone di casa."; the "Qui accanto" tag.
  - de: the title "Ein Gastgeber."; the "Nachbarland" tag.
- **Experiences** (`experiences.json`): ka title „ექვსი გზა კავკასიისკენ.“. Experience names in pl/it/de come from the AI knowledge base (`src/lib/ai/knowledge.ts`), e.g. it „Relax“ and de „Erholung“ for Leisure; change them there so the planner stays consistent.
- **Fact-check edits of 11 Oct 2026.** These strings were re-drafted in all four languages and need a native check:
  - `awards.programme.text`
  - `common.meta.description`
  - `hero.lead`
  - `caucasus.aside.note`
  - `connection.airports.KUT.footnote`
  - `sustainability.practice.items[1].text` and `items[2].text`

---

## Fact-check log (English copy, 11 Oct 2026)

What was softened, so it can be restored once you confirm it:

| Where | Was | Now | Restore if… |
|---|---|---|---|
| Hero lead | "run by our own team on the ground" | "run from Tbilisi by our own team" | your own team runs tours in Armenia and Azerbaijan too |
| Meta description | "Since 2015 we have designed … across Georgia, Armenia and Azerbaijan" | "founded in 2015. We design … across Georgia, Armenia and Azerbaijan" | you sold all three countries from 2015 |
| Awards | "held every year since 2015" | "first held in 2015" | the organisers confirm an unbroken annual series |
| Sustainability | "Everyone works from home one day a week" | "Everyone can work from home one day a week" | remote days are compulsory (the policy says they are granted) |
| Sustainability | "at least half of our accommodation with sustainability credentials" | "…partners meeting at least one of the environmental or community criteria in our Accommodations Policy" | (keeps the policy's own definition; EU green-claims rules favour the precise wording) |
| Caucasus map note | "border queues can change them" | adds that border rules change, Azerbaijan's above all | Azerbaijan fully reopens its land borders |
| Connection (KUT) | airport distances | now marked as road distances | — |
