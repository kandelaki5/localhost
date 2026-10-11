# Design proposals for review (October 2026)

Changes that alter layout, structure or content order. **None of these is live** unless marked "previewable"; they wait for the owner's decision. Measurements are from the live site at 1440 px (desktop) or 390 px (phone), English, unless noted.

Already applied (confirmed fixes, not listed here): stacked small host cards and shorter featured host cards on phones, carousel controls above the cards with section-specific names, the floating section pill that steps aside, the shorter hero with "Request a programme", the compact phone flight board, the planner's demo mode made explicit (notice, wording, "Sample" labels, request vs sample, "Send my choices"), months with their year, an interim "Request a programme by email" template in Contact, and tighter spacing (desktop 22,018 → about 20,600 px).

---

## 1. Phone formats per card group

Rule of thumb: swipeable cards for rich, visual items you browse one by one (destinations, experiences, hosts); compact lists or grids for short facts you scan (fair dates, memberships, nominations).

| Group | Items | Now | Proposal | Why |
|---|---|---|---|---|
| Caucasus countries | 3 | swipe cards | **keep swipe** | big photo + story per country |
| Experiences | 6 | swipe cards | **keep swipe** | visual stamps, one theme each |
| Featured hosts | 2 | swipe cards | **keep swipe** | photo + quote; facts fold behind "At a glance" |
| More hosts | 4 | swipe cards | **keep swipe** | photo + short line each |
| Trade fairs | 2 × 3 | swipe stamps | **compact dated list** — previewable | name + city + dates fit one row; scan by date |
| Memberships | 3 + 2 | swipe permits | **2-column mini permits** — previewable | acronym + name is all a visitor needs |
| Award nominations | 2 | swipe seals | **2-up grid** — previewable | two items; both visible at once |
| Policy commitments | 5 | swipe cards | **numbered fold-out list** (five titles visible, text opens on tap), or merge with We support (§3.1) | text-only cards: the track is as tall as the longest card, leaving 130–260 px blank under short ones; titles-only list 279 px vs 356 px today (en 390), 374 vs 566 (ka 320) |
| We support | 5 | swipe cards | keep swipe until §3.1 is decided (seal now sits beside the title on phones) | short text with a seal icon |

**Previewable:** open any page with `?proposal=compact` (for example `https://localhost-ge.vercel.app/?proposal=compact` on a phone). The setting is kept while you switch language; `?proposal=off` turns it off. Without the parameter the site is unchanged (checked pixel for pixel at 320–1280 px).

What the preview shows (390 px, English; Georgian 320 px in brackets):

| Group | Carousel now | Compact preview | What you see |
|---|---|---|---|
| Trade fairs | 1,171 px (1,525) | 1,130 px (1,399) | one 64 px row per fair: a mini ink stamp, city and fair name, dates in a right-hand column, NEXT / ON NOW kept |
| Memberships | 1,148 px (1,333) | 1,080 px (1,411) | mini permits: GNTA across the page, GTA and CEBG side by side, PIT and ŚIT on the Polish page; one column below 360 px so long names fit |
| Award nominations | 1,070 px (1,207) | 880 px (1,033) | both seals side by side with year, category and segment |

All six fairs, five memberships and both nominations are visible without swiping. Experiences, destinations and hosts stay as swipe cards.

## 2. Enquiry form ("Request a programme")

Today "Request a programme" scrolls to Contact, where an interim "Request a programme by email" button opens the visitor's email app with a template. A mailto depends on a configured mail app and arrives unstructured; the planner's email cannot capture the agency, name or group size (those lines arrive blank). Proposal: a short form in the Contact section, in the right column where the envelope illustration sits (the envelope becomes a small header graphic).

**Fields** (all on one card; 6 fields + consent):

1. Agency / your name — required
2. Email — required (validated)
3. Destinations — Georgia / Armenia / Azerbaijan (checkboxes; prefilled from the planner or a country card)
4. Dates — month + year, or "flexible" (free text allowed: "late May 2027")
5. Group size — number, or "to be confirmed"
6. Requirements — textarea (interests, hotel category, language of the guide …)
7. Consent line: "We use these details only to answer your enquiry." + link to a privacy note (to be written; the site has no privacy page yet)

**Behaviour**

- "Request a programme" (hero, header, country and experience cards, the planner) opens the form with what is already known prefilled: the planner's countries, length, month, travellers, pace and notes; the card's country or experience.
- Email and phone stay visible beside the form for anyone who prefers them.
- Success state: "Thank you — we'll reply within one working day" (only if the owner confirms that promise) with a copy of what was sent. Error state keeps everything typed and offers the email link.
- Spam protection: a hidden honeypot field and the existing rate limiter; Cloudflare Turnstile only if spam appears.
- Accessible: real labels, error messages tied to fields, no colour-only cues, ≥ 44 px targets.

**Delivery — owner decision needed.** The form cannot go live until one of these is chosen and set up:

| Option | What it needs | Pros | Cons |
|---|---|---|---|
| A. Microsoft 365 (Graph API `sendMail`) from a Vercel function | an app registration in the company's Microsoft 365 with admin consent; a mailbox to send from | uses the existing company email; no DNS changes; replies go straight back to the visitor | needs a Microsoft 365 admin for 20 minutes |
| B. Email service (Resend, Postmark or SendGrid) from a Vercel function | an account + API key; DNS records (SPF/DKIM) for the sending domain at ProService, added **alongside** the Microsoft 365 records | reliable, cheap or free at this volume, delivery logs | DNS work must not touch the Microsoft 365 MX/SPF setup |
| C. Form service (Formspree, Basin) | an account | fastest to set up | a third party stores the enquiries; branding on free tiers |
| D. Keep email only | nothing | zero setup | no structured enquiries |

Recommendation: **A** if a Microsoft 365 admin is available, otherwise **B**.

## 3. Desktop compaction of supporting sections

Supporting sections (Airlines, Connection, Meet us, Members, Awards, Sustainability, We support) take about 44 % of the desktop page; destinations, experiences, hosts and contact about 36 %.

| # | Proposal | Saving (1440) | Notes |
|---|---|---|---|
| 3.1 | **Sustainability: one list of commitments.** Its "What our policy asks of us" list repeats We support (child protection, excursions, partners). Keep We support as the single list (the brief requires the section); show the three office-only rules (offset business travel, transport pass and remote days, accommodation target) as one-line bullets under the energy and gas figures; put Documents and "Ask our policies" side by side. | about −460 px (more in ka) | content moves between sections |
| 3.2 | **Sustainability: remove the decorative landscape photo + quote row**, or move the quote (Svaneti, Samtskhe-Javakheti, Telavi …) into Caucasus beside the map, where it gives destinations more weight. | −549 px | |
| 3.3 | **Travelife told once.** Badge + one sentence + the certificate card with a single "Verify in the register" link (today: 11 mentions, three links to the same register). | −68 px | clearer message |
| 3.4 | **Memberships as one row of five slim permits** (acronym, name, country, link) instead of the 813 px passport spread; or merge Members and Awards into one "Recognition" section (memberships 7 columns, awards 5). | −450 to −510 px; merged: about −330 px more | the passport look stays in the permit frames |
| 3.5 | **Airline wall inside the flights section.** Airlines and Connection are two sections with near-identical intros under one menu item ("Getting here"). Make the 12-airline wall a band under the departure boards. | about −340 px | one fewer section head |
| 3.6 | **Contact: replace the repeated "Plan with AI" card** (it sits right under the planner) with the enquiry form of §2. | about −287 px | |
| 3.7 | **Planner form in two columns** (7/12 width; days + month and travellers + pace side by side; "How it works" shortened to one line). | −232 px (1440), −407 px (1280) | |
| 3.8 | **Caucasus map 7 columns, notes 5**, notes cut to the drive times. | −146 px | |
| 3.9 | Smaller award seals; drop the repeated "Doors we keep" quote in Hosts; hide "Partner projects will be announced here" until projects exist. | about −245 px | |

All of 3.1–3.9 together bring the desktop page to about 18,300 px at 1440 (from 22,018 before this round).

## 3b. Smaller layout questions found by the audits

| # | Proposal | Why | Trade-off |
|---|---|---|---|
| 3.10 | **Hero on large screens (≥ 1280 px): offer and buttons across 8 columns, the Georgian proverb under them** (the layout already used at 1024–1279 px) | the two buttons wrap onto two rows in it, ka and at 1280 in en/de/pl; this keeps them on one row everywhere | moves the proverb below the offer |
| 3.11 | **"How it works" (planner) as a stacked list** with the number on the left, or one line per step | three narrow columns give up to 12 lines of ~15 characters in Georgian, and the sticky map column is taller than the screen in ka at 1280 | layout change in the planner sidebar |
| 3.12 | **We support on desktop as 3 + 2 columns** with the seal beside the title (or merged with Sustainability, §3.1) | five 200 px columns give 5–6 lines in English and 8–12 in Georgian | |
| 3.13 | **Experience photos 4:3 on phones** (instead of 4:5), and **1:1 on desktop** | phone cards are 670–810 px tall, taller than the visible screen in Georgian at 320 px (4:3 brings them to 570–680 px); on desktop a focused card (840–865 px) is taller than the space under the header at 1280–1440 × 900 | smaller photos in a section the brief wants prominent |
| 3.14 | **Sustainability on phones**: the five commitments as a numbered list with expandable text, recognition + certificate in one card, the energy/gas figures as one row of stats, the policy documents collapsible | the longest section on phones (4,300 px in English, about 6,000 px in Georgian at 320) | combines with §3.1 |
| 3.15 | **Section pill on phones inside the header** (current section + chevron next to the menu button) instead of floating | removes any overlap with text for good | the pill now already hides while scrolling down and 3 s after scrolling stops |
| 3.16 | **Contact on phones: "Write & call" before "Office"** | the email and phone sit below the address and two map links (about 470 px at 390, more in ka at 320); the new "Request a programme by email" button is already first | address moves below |

## 4. More prominence for destinations, experiences, hosts and the enquiry

- Header button: **"Request a programme"** as the main action, "Plan with AI" next to it as the secondary one (today the header offers only "Plan with AI"; 12 links on the page lead to the planner and 2 to Contact).
- A **"Request this programme"** link next to "Plan a trip here" / "Plan this with AI" on every country and experience card, opening the enquiry form with that country or experience prefilled (needs §2).
- The spacing work already applied brings Contact about 1,400 px sooner on desktop; §3 would bring it about 3,700 px sooner in total.

---

_Owner decisions are also listed in `docs/CONTENT-TODO.md` → "Decisions this round"._
