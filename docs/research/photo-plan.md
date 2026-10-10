# Photo plan — localhost.ge

_Prepared 2026-10-10. Covers every photo in `src/assets/photos/`: 33 company photos owned by Local Host and 8 openly licensed Armenia/Azerbaijan photos added today. Credits for all of them are in `src/data/photo-credits.json`._

How this was made: I built contact sheets of every file and looked at each one, plus 100 % crops of the hero candidates. The final Armenia/Azerbaijan sheet is `design/photos/caucasus-contact-sheet.jpg`.

**Focal points** are written as CSS `object-position` values (x% y%, measured from the top-left). Use them with `object-fit: cover`, so the subject stays in frame when a card crops a 3:2 photo to 4:5 or 1:1.

---

## 1. Quick allocation

| Slot | Photo | `object-position` | Why |
|---|---|---|---|
| **Hero** | `kazbegi-gergeti.jpg` | `45% 55%` | The best-known view in Georgia: Gergeti Trinity church on a green ridge below the Kazbegi massif. Pin-sharp at 100 %, 2400 px. |
| Hero (alt) | `tbilisi-1.jpg` | `45% 40%` | Old Tbilisi and Narikala at golden hour. The calm top third suits a headline. 16:9, 2400 px. |
| **Georgia card** | `svaneti-1.jpg` | `55% 65%` | Svan stone towers under snow peaks. It is green, unmistakably Georgian, and different from the hero. |
| **Armenia card** | `armenia-khor-virap.jpg` | `35% 60%` | Khor Virap monastery below snow-capped Mount Ararat, the image most people associate with Armenia. |
| **Azerbaijan card** | `azerbaijan-baku.jpg` | `45% 45%` | Old City (Icherisheher) rooftops with the Flame Towers behind. It says "Baku" at a glance. |
| Culture | `tbilisi-1.jpg` | `45% 40%` | Old town, fortress, churches and the river, all in one frame. |
| Wine | `rtveli-harvest.jpg` | `60% 45%` | The grape harvest (rtveli) in a vineyard, with baskets of black grapes. Warm and human. |
| Trekking | `truso-valley.jpg` | `50% 55%` | A river valley with layered ridges and light rays. Crisp at 100 %. |
| Gastronomy | `georgian-food.jpg` | `50% 70%` | The only food photo: a laid table with mtsvadi, bread, greens and a clay jug. |
| Pilgrim | `david-gareja.jpg` | `45% 65%` | David Gareja monastery complex in the semi-desert hills. |
| Leisure | `batumi.jpg` | `50% 55%` | Batumi seafront at blue hour. A calm, holiday mood, and it adds a dark card to the carousel for rhythm. |
| Host · Sisatura | `adjara-2.jpg` | `45% 60%` | Traditional wooden village houses on a lush hillside (generic). |
| Host · Leila | `kvevri-1.jpg` | `15% 45%` | Cropped to the carved-balcony family house and courtyard (generic). |
| Host · Vacheishvili Family | `kazbegi.jpg` | `50% 72%` | Horses grazing in a wide mountain valley (generic pastoral). |
| Host · Samvel | `lopota-lake.jpg` | `60% 55%` | A quiet lake with wooded hills (generic). |
| Host · Aluda | `chaukhi-valley.jpg` | `40% 40%` | A mountain pasture under rocky peaks (generic). |
| Host · Maia | `borjomi.jpg` | `45% 50%` | A small town in a forested gorge, shown with a duotone or blur treatment (generic). |
| **Sustainability** | `shatili.jpg` | `45% 45%` | A restored medieval stone village in green mountains beside a river: "nature and heritage" in one photo. |
| **Contact** | `tbilisi-2.jpg` | `55% 35%` | Daytime Old Tbilisi, near the office's city. Light and inviting. |
| AI Trip Planner backdrop (optional) | `mtskheta.jpg` | `50% 45%` | Hazy and low in contrast, so it sits well behind form controls with a light scrim. |
| OG / social image | `kazbegi-gergeti.jpg` | `45% 55%` | Crop to 1200×630 and add the logo. Recognisable even at thumbnail size. |

No company photo is used twice as a primary choice. The alternates below reuse some of them on purpose.

---

## 2. Hero

**Primary: `kazbegi-gergeti.jpg`** (2400×1600, company photo)
- Gergeti Trinity church on its ridge in front of a steep green mountainside. It is sharp right to the edges at 100 %, and the colours are natural.
- `object-position: 45% 55%`. The church cluster sits around x 30–63 %, y 44–73 %. On mobile portrait crops (9:16), keep the church in frame by moving x to about `42%`.
- Text: the mountainside behind is textured and mid-dark green. Place the headline on the left or bottom-left with a dark gradient scrim (for example `linear-gradient(90deg, rgb(0 0 0 / .55), transparent 60%)`). White text then passes AA.
- Load it eagerly with `fetchpriority="high"`, at widths 640/960/1280/1920/2400.

**Alternate: `tbilisi-1.jpg`** (2400×1354). Golden-hour Old Tbilisi below Narikala fortress. The top third is soft sky, the easiest place for text. Use it if the design wants a city-first, warmer message. `object-position: 45% 40%`.

A third option, if the hero becomes a 2–3 image cross-fade: `svaneti-1.jpg` and `armenia-khor-virap.jpg`. That tells the "whole South Caucasus" story, but keep it CSS-only and honour `prefers-reduced-motion`.

---

## 3. Caucasus cards (Georgia · Armenia · Azerbaijan)

All three are landscape-first and daylight, with similar brightness, so the row reads as a set.

| Card | Photo | `object-position` | Notes |
|---|---|---|---|
| Georgia | `svaneti-1.jpg` (2400×1597) | `55% 65%` | Svan tower village with a snow massif behind. Strong greens. Do not caption it with a specific village. It looks like Ushguli, but that is unverified. |
| Armenia | `armenia-khor-virap.jpg` (2400×1227, CC BY-SA 4.0, Diego Delso) | `35% 60%` | A wide panorama. The monastery sits lower-left and Ararat is centre-right. In a 4:5 card use `30% 60%` to keep the monastery in frame, which crops part of Ararat. In a 1:1 or wider card both stay visible. |
| Azerbaijan | `azerbaijan-baku.jpg` (2400×1800, CC0, Viceskeeni2) | `45% 45%` | Old City rooftops in the foreground with the Flame Towers and TV tower on the skyline. There is slight sun glare in the top-right corner, so avoid `object-position` values above x 70 %. |

Alternates: Georgia → `kazbegi-gergeti.jpg` (if the hero is Tbilisi) · Armenia → `armenia-tatev.jpg` · Azerbaijan → `azerbaijan-sheki.jpg`.

---

## 4. Experiences (carousel, 6 cards)

| Experience | Primary | `object-position` | Alternates (1–2+) | Notes |
|---|---|---|---|---|
| **Culture** | `tbilisi-1.jpg` | `45% 40%` | `vardzia.jpg` (`30% 55%`) · `rabati-castle.jpg` (`35% 40%`) · `azerbaijan-sheki.jpg` · `armenia-yerevan.jpg` | Tbilisi says "culture" for every market. Vardzia (cave town) is the strongest non-city alternative. |
| **Wine** | `rtveli-harvest.jpg` | `60% 45%` | `kvevri-1.jpg` (`65% 70%`, no people) · `kvevri-2.jpg` (`45% 55%`) · `sighnaghi.jpg` | It shows two people (an older man and a boy in chokhas). These are company photos, but **never caption them as hosts or name them**. If the team prefers no faces on cards, use `kvevri-1.jpg`. |
| **Trekking** | `truso-valley.jpg` (1920 px) | `50% 55%` | `shatili.jpg` · `chaukhi-valley.jpg` (1500 px, card only) · `azerbaijan-khinalug.jpg` · `tusheti.jpg` (1024 px, small thumbnails only) | 1920 px is plenty for a carousel card. |
| **Gastronomy** | `georgian-food.jpg` | `50% 70%` | `kvevri-2.jpg` (crop to the jugs and produce: `20% 65%`) · `sighnaghi.jpg` (dusk terraces, `55% 45%`) | **Gap:** this is the only true food photo. The dishes are mtsvadi skewers, flatbread, cheese and greens, **not khinkali**, so do not caption them as khinkali. Ask Local Host for khinkali, supra, market and churchkhela shots. |
| **Pilgrim** | `david-gareja.jpg` | `45% 65%` | `ananuri.jpg` (`50% 45%`) · `armenia-tatev.jpg` · `armenia-khor-virap.jpg` · `katskhi-pillar.jpg` (`50% 45%`) · `mtskheta.jpg` | Gergeti would be the obvious pilgrim photo, but it is the hero. Use `ananuri.jpg` if the card needs more colour (the turquoise reservoir). |
| **Leisure** | `batumi.jpg` | `50% 55%` | `adjara-1.jpg` (Black Sea coast, `55% 55%`) · `armenia-sevanavank.jpg` · `okatse-canyon.jpg` (1000 px) · `lopota-lake.jpg` | Batumi is a night shot (dark blue). It gives the carousel contrast. If the carousel looks too dark, swap in `adjara-1.jpg`. |

---

## 5. Hosts We Love: landscape backgrounds (places only, no people)

**Rules:** do not use any photo with people on a host card (`rtveli-harvest.jpg` and `kvevri-2.jpg` are excluded). Visitors would read those people as the host, and the brief forbids fake host photos.

Apart from Sisatura, **the hosts' locations are unknown** (see `docs/research/organisations-awards-hosts.md`). So every background below is an **evocative, generic Georgian countryside, village or table scene, not the host's actual place.** Do not caption any of them with a location.

Recommended treatment: a soft duotone in brand green, or a light blur, with the host's illustrated monogram on top. That makes them read as mood, not documentation.

| Host | Background | `object-position` | Reasoning |
|---|---|---|---|
| **Sisatura: Marika & Enry** | `adjara-2.jpg` (2400×1157) | `45% 60%` | Traditional wooden houses on a green West-Georgian hillside with chimney smoke. It suits a family ethno-village. Research places Sisatura in Chkhoria, Samegrelo. This photo is **not** Sisatura (it looks like Adjara), so keep it uncaptioned. Sisatura's own photos exist on its Facebook page; ask the hosts for permission and originals. |
| **Leila** | `kvevri-1.jpg` | `15% 45%` | Crop to the carved-balcony house and courtyard: a family home where a meal is cooked. In a 4:5 card the clay kvevri stays at the edge. The only known fact is her khinkali, so if a real khinkali photo arrives, use it here. |
| **Vacheishvili Family** | `kazbegi.jpg` (1818×1204) | `50% 72%` | Horses on an open valley pasture. Pastoral and warm, with no implied profession. **Avoid wine or kvevri imagery**: the Ateni winery link is unconfirmed. The photo looks like a film scan with visible grain, which is fine at card size. |
| **Samvel** | `lopota-lake.jpg` | `60% 55%` | A calm lake, hills and a village edge. Research notes Samvel may live in Armenia or in an Armenian community in Georgia, so use a neutral scene with no landmark. There is a heavy vignette and HDR sky, so crop to the centre and use the duotone. |
| **Aluda** | `chaukhi-valley.jpg` (1500×996) | `40% 40%` | A high pasture and rocky peaks. **Do not** use `tusheti.jpg`: the "Omalo" guesthouse link is unverified, and a Tusheti photo would imply a location. 1500 px is enough for a card. |
| **Maia** | `borjomi.jpg` (1200×795) | `45% 50%` | A small town in a deep forested gorge. Nothing is known about Maia, so blur or duotone it so the town is not identifiable. At 1200 px it is fine for a card of 600 px or less. |

Spare generic backgrounds: `georgian-food.jpg` (crop to bread and jug: `35% 55%`), `gudauri.jpg` (snow, very low detail, good under text), `truso-valley.jpg` crop (`70% 85%`).

---

## 6. Sustainability section

**Primary: `shatili.jpg`** (2400×1657), `object-position: 45% 45%`. A restored medieval stone village above a clear river in green mountains, with no people. It matches the policy's "protecting nature and heritage" and "positive impact on local communities". It is slightly HDR-processed but sharp. Use a light scrim if text overlaps.

Alternates: `svaneti-2.jpg` (2400×935 panorama of a village under a mountain, ideal as a full-width band, `45% 65%`) · `tusheti.jpg` (1024 px, half-width only).

---

## 7. Contact section

**Primary: `tbilisi-2.jpg`** (2400×1350), `object-position: 55% 35%`. Daylight Old Tbilisi: carved balconies, brick bathhouse domes and greenery. The office is in Tbilisi, so the photo grounds the address. There is one small figure (a photographer) at lower-centre, not identifiable.

Alternate: `tbilisi-4.jpg` (night riverside below lit cliffs, very dark, mean luminance about 40/255). It is good as a dark backdrop for white contact text, but noisy and with a blown street lamp, so use it with a blur or as a narrow band only.

---

## 8. Quality notes and things to avoid

| File | Size | Issue | Guidance |
|---|---|---|---|
| `bagrati.jpg` | **800×420** | Far too small for anything large | **Avoid full-bleed.** Use only as a thumbnail or card of 400 px or less. Ask for a larger original. |
| `tusheti.jpg` | 1024×576 | Small, with a strong teal colour grade | Thumbnails or half-width cards of 500 px or less only. |
| `okatse-canyon.jpg` | 1000×664 | Small | Cards of 500 px or less only. |
| `borjomi.jpg` | 1200×795 | Small and dark (mean luminance about 51) | Cards of 600 px or less, or blurred backgrounds. |
| `chaukhi-valley.jpg` | 1500×996 | Mid-size | Cards and half-width only, not hero. |
| `adjara-1.jpg` | 2400×1600 | Fisheye or barrel distortion and high saturation | Fine as a card, but not as hero or full-bleed, where the curved horizon shows. |
| `prometheus-cave.jpg` | 2400×1602 | Garish magenta and green show-cave lighting | Small accent only, never next to the natural-colour photos. |
| `mestia.jpg` | 2400×1600 | Night shot with heavy orange fog | Moody. Avoid in rows of daylight cards. |
| `tbilisi-3.jpg` | 1920×1152 | Strong HDR, oversaturated, wide-angle lean | Prefer `tbilisi-1` or `tbilisi-2`. |
| `tbilisi-4.jpg` | 2400×1597 | Very dark, noisy, blown lamp | Only as a dark, blurred backdrop. |
| `lopota-lake.jpg` | 2400×1600 | Heavy vignette in the corners, HDR sky | Crop to the centre. Avoid tall crops that show the dark corners. |
| `mtskheta.jpg` | 1920×1080 | Hazy and low contrast (little edge detail) | That softness makes it a good text backdrop. As a feature image it looks flat. |
| `gudauri.jpg` | 2400×1581 | Almost monochrome snow, very little detail | A texture or background only. |
| `kazbegi.jpg` | 1818×1204 | Film grain, slightly soft | Fine for cards. Not hero. |
| `svaneti-2.jpg`, `adjara-2.jpg` | 2400×935 / 2400×1157 | Panoramic aspect | Bands and wide cards. In 4:5 cards they crop hard, so check the focal point. |
| `rtveli-harvest.jpg`, `kvevri-2.jpg` | — | Identifiable people as the main subject | Never on host cards and never captioned with names. OK for experience cards. |

All other company photos (`ananuri`, `david-gareja`, `georgian-food`, `katskhi-pillar`, `kazbegi-gergeti`, `kvevri-1`, `rabati-castle`, `shatili`, `sighnaghi`, `svaneti-1`, `tbilisi-1`, `tbilisi-2`, `truso-valley`, `vardzia`, `batumi`) are 1920–2400 px wide with no visible defects.

---

## 9. Armenia and Azerbaijan photos (openly licensed)

ARMENIA_AZERBAIJAN_SECTION

---

## 10. Implementation notes

- Use `astro:assets` `<Picture>` with `formats={['avif','webp']}`, `widths` up to the source width (never upscale: `bagrati` max 800, `tusheti` max 1024 and so on), and `loading="lazy"` for everything below the hero.
- Card crops: set `object-fit: cover` plus the `object-position` above as a per-image prop (for example a `focus` field in the content data), not a global value.
- Text on photos: always add a scrim (gradient or overlay at 35–55 % black). Several photos have bright skies (`katskhi-pillar`, `kazbegi`, `truso-valley`).
- Credits: `src/data/photo-credits.json` covers all 41 files. Each **CC BY / CC BY-SA** photo needs title, author, licence and a link, shown in the footer "Photo credits" (or a credits page linked from it). CC BY-SA also needs any edits declared: resizing and cropping for the web are worth a one-line "resized/cropped" note in the credits. The CC0 Baku photo needs no attribution, but crediting it is good practice.
- **Gaps to request from Local Host** (add to `docs/CONTENT-TODO.md`): (1) real photos of each host, with consent, starting with Sisatura (they have photos online); (2) food photos, especially khinkali and a supra table; (3) a larger original of `bagrati.jpg` and `tusheti.jpg`; (4) any own photos from Armenia and Azerbaijan, which would replace the openly licensed ones and remove attribution duties.
