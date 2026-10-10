# Research: direct flights to Tbilisi (TBS) and Kutaisi (KUT)

Researched 10 Oct 2026. Machine-readable version: `src/data/flights.json` (`airports[].destinations` gives the 20 cities for each departure board in priority order; `airports[].alternates` gives verified swaps; `airlines[]` covers the 12 airlines in the template).

**Confidence key.**
- *High*: seen in an official airport schedule in October 2026, usually backed by airline or trade-press sources too.
- *Medium*: consistent secondary evidence, or an official source that is incomplete.
- *Low*: weak or conflicting evidence.

**`seasonal`**: `false` means the route flew in winter 2025/26 and/or is filed for winter 2026/27. `null` means unknown. `true` means summer-only.

Nothing below is invented. Flight schedules change all the time, so the site must show: *"Direct connections vary by season — ask us for the current schedule."*

---

## TL;DR for the site builders

| Item | Verdict |
|---|---|
| **Airlines section (12 names)** | 10 of the 12 fly to TBS in Oct 2026. **Wizz Air** flies to **KUT only**, with 24 routes. **Pegasus** flies to both. **Air France no longer flies to Georgia with its own aircraft** (it stopped around late March 2026). Either drop it, replace it (e.g. with *Transavia* or *Qatar Airways*), or ask the owner. |
| **Tbilisi board (20)** | Warsaw, Berlin, Munich, Milan, Rome, Vienna, Paris, Amsterdam, Athens, Riga, London, Copenhagen, Istanbul, Dubai, Doha, Tel Aviv, Almaty, Tashkent, Baku, Yerevan. 18 are high confidence; Copenhagen and Tel Aviv are medium. |
| **Kutaisi board (20)** | All Wizz Air: Warsaw, Katowice, Poznań, Wrocław, Berlin, Dortmund, Hamburg, Memmingen, Frankfurt-Hahn, Milan, Rome, Venice, Budapest, Prague, Bratislava, Vilnius, Athens, Paris-Beauvais, Brussels-Charleroi, Madrid. All high confidence. |
| **Not on the boards (on purpose)** | Frankfurt-TBS: Condor moved its restart to **May 2027**. Düsseldorf-TBS: Eurowings cancelled it. Vienna-KUT: no flights in the current schedule. Thessaloniki-TBS (Aegean): no 2026 schedule found. Air France Paris-TBS: ended. |
| **Airport labels** | Several KUT airports are far from the city they're named after. Label them honestly: **Paris-Beauvais**, **Brussels-Charleroi**, **Frankfurt-Hahn**, **Memmingen** (sold as "Munich West"). |

---

## Method

1. **Tbilisi airport, official live board.** tbilisiairport.com loads its flight board from `GET /Home/searchFlights?flightLeg=DEPARTURE&date=YYYY-MM-DD`, which only returns about today ±1 day. I pulled **10, 11 and 12 Oct 2026**: 461 arrivals and departures. Every one of the 20 TBS board cities, and every airline marked "servesTBS: true", was seen there. Board page: https://tbilisiairport.com/en-EN/flights/departures
2. **Tbilisi airport route map** (https://tbilisiairport.com/en-EN/flights/page/airport-route-map). It is official but **out of date**: it still lists Air France, Aegean to Thessaloniki, Korean Air, IndiGo, Georgian Airways to Munich and others, and mixes scheduled with charter flights. I only used it for cross-checks.
3. **Kutaisi airport, official schedule.** kutaisi.aero is the current official site, run by United Airports of Georgia. Its schedule loads from `https://api.airports.ge/api/aero/flights?flight_type_id=1&page=N&per_page=100&sort_by=id&sort_order=desc`. I pulled all **306 departures, 10 Oct to 10 Nov 2026**, and the airport's destination list (36 cities) and airline list. Page: https://www.kutaisi.aero/en/flight/schedule
   - ⚠️ The airport has not loaded the winter 2026/27 schedule for every route. Several routes stop on 23-25 Oct, the last day of the summer season, including Pegasus, which flies year-round. So a route stopping there is **not** evidence that it is seasonal.
   - kutaisiairport.ge is **not** the official site; it is a third-party guide.
4. **Seasonality** comes from FlightMapper's published schedule data (https://info.flightmapper.net/route/YY_TBS_xxx and `YY_KUT_xxx`). It shows the validity periods for winter 2025/26 and summer 2026, and most winter 2026/27 filings. ⚠️ Some of its entries are stale: it still shows Condor FRA for summer 2026 and Wizz Air VIE-KUT. So I used it as medium-confidence evidence of *seasonality* only, never as the only evidence that a route exists.
5. **Airline and trade sources.** Georgian Airways' official schedule, airBaltic and Aegean fare pages, the BA media centre, AeroRoutes (Condor, Eurowings, Wizz Air network filings in 2026), Georgian news (1tv.ge, Georgia Today, frontnews.ge), and flight-report.com for Air France.
6. **Wikipedia** "Airlines and destinations" tables, read from the raw wikitext. TBS was last edited 5 Oct 2026, KUT 26 Aug 2026. I used them as a starting list only. They are partly outdated: they list Georgian Airways to Doha and Wizz Air to Rome-Ciampino, and leave out the Air France exit.

---

## A. The 12 airlines in the template

| Airline | IATA | TBS | KUT | Routes (origin → TBS/KUT) | Conf. | Main source |
|---|---|---|---|---|---|---|
| Turkish Airlines | TK | ✅ | ❌ | Istanbul IST → TBS (year-round). Its subsidiary **AJet** flies SAW and Ankara → TBS | high | TBS live board; FlightMapper YY_TBS_IST |
| Georgian Airways | A9 | ✅ | ❌ | Amsterdam, Berlin, Larnaca, Milan-Bergamo, Moscow-Vnukovo, Nice, Paris-CDG, Rome-FCO, St Petersburg, Tel Aviv, Vienna, Yerevan, Forlì (+ Novosibirsk; Batumi domestic) | high | https://georgian-airways.com/en/flight/schedule |
| airBaltic | BT | ✅ | ❌ | Riga RIX → TBS (year-round; fares on sale Nov 2026-May 2027) | high | https://www.airbaltic.com/en/flight-deals/flights-to-tbilisi |
| **Air France** | AF | ❌ (since ~Apr 2026) | ❌ | Own-aircraft CDG → TBS ended around late March 2026 | medium | https://flight-report.com/fr/report/76939/air-france-af1052-paris-cdg-tbilisi-tbs/ ; TBS live board |
| Aegean Airlines | A3 | ✅ | ❌ | Athens ATH → TBS (year-round) | high | TBS live board; https://flights.aegeanair.com/en/flights-to-tbilisi |
| Pegasus Airlines | PC | ✅ | ✅ | Istanbul SAW → TBS; Antalya AYT → TBS; Istanbul SAW → KUT | high | TBS board; https://www.kutaisi.aero/en/flight/schedule |
| Wizz Air | W6 / W4 | ❌ | ✅ | 24 routes into KUT (list below) | high | https://www.kutaisi.aero/en/flight/schedule |
| easyJet | U2 (EC/DS) | ✅ | ❌ | London-Luton, Geneva, Milan-Malpensa → TBS | high | TBS board; https://1tv.ge/lang/en/news/easyjet-announces-launch-of-flight-services-in-georgia/ |
| Lufthansa | LH | ✅ | ❌ | Munich MUC → TBS (year-round; daily in summer 2026, 6 weekly filed for winter 2026/27) | high | TBS board; FlightMapper YY_TBS_MUC |
| LOT Polish Airlines | LO | ✅ | ❌ | Warsaw WAW → TBS (year-round, 737 MAX 8) | high | TBS board; FlightMapper YY_TBS_WAW |
| Austrian Airlines | OS | ✅ | ❌ | Vienna VIE → TBS (year-round) | high | TBS board; https://business.lufthansagroup.com/be/en/news/os-winter-flight-schedule-2024 |
| British Airways | BA | ✅ | ❌ | London-Heathrow LHR → TBS (since 30 Mar 2025; year-round) | high | https://mediacentre.britishairways.com/news/17092024/british-airways-launches-the-uks-only-direct-flight-to-georgian-capital-tbilisi ; TBS board |

**Wizz Air's 24 KUT routes**, all in the official schedule for 10 Oct-10 Nov 2026:
- **Germany:** Berlin, Dortmund, Frankfurt-Hahn, Hamburg, Memmingen
- **Poland:** Warsaw, Katowice, Poznań, Wrocław
- **Italy:** Milan-Malpensa, Rome (Fiumicino, see verification log), Venice (operated by Wizz Air Malta)
- **Spain:** Barcelona, Madrid
- **France:** Paris-Beauvais, Lyon
- **Greece:** Athens, Thessaloniki
- **Other:** Bratislava, Brussels-Charleroi, Budapest, Larnaca, Prague, Vilnius

This matches Georgian press reports that Wizz flies to "24 destinations in 12 countries" from Kutaisi (Dec 2025 / Apr 2026).

**Notes on Air France.** In winter 2025/26, AF1052/1053 flew CDG-TBS once a week. Two flight-report.com trip reports from Feb-Apr 2026 say Air France "cesse définitivement sa desserte de Tbilissi" from April 2026 (a commenter adds that the planes were not full). Air France had filed a summer 2026 schedule (Mon/Thu/Sun), but on **Sunday 11 Oct 2026 no AF flight was on the TBS board**. Air France fare pages still show Paris-Tbilisi fares, but those are connecting itineraries. Its partner Georgian Airways (CDG, several flights a week) and its sister airline Transavia France (Orly) still fly Paris-TBS nonstop. → `servesTBS: false`, medium confidence. Suggestion: replace Air France on the Airlines wall with **Transavia** (Air France-KLM group, flies Paris-Orly and Amsterdam to TBS) or **Qatar Airways**, or ask the owner.

### Other airlines at TBS (not in the template, useful context)
- AJet: Istanbul SAW and Ankara
- Sky Express: Athens
- Transavia: Amsterdam
- Transavia France: Paris-Orly
- Edelweiss: Zurich
- Norwegian Air Sweden: Copenhagen, new 27 Jun 2026
- Air Serbia: Belgrade
- Eurowings: Cologne/Bonn, summer 2026 only
- Qatar Airways, flydubai, Air Arabia (Sharjah and Abu Dhabi), flynas, Jazeera, Kuwait Airways, Gulf Air
- Air Astana, SCAT, Uzbekistan Airways, Centrum Air
- Azerbaijan Airlines, FlyOne / FlyOne Armenia
- Israeli carriers
- Chinese carriers
- Russian carriers

### Other airlines at KUT
- Pegasus: Istanbul SAW
- FlyArystan: Almaty, Astana, Aktau, Atyrau, Shymkent
- Belavia: Minsk
- Azimuth: Moscow
- Vanilla Sky: Mestia (domestic)
- Seasonal summer charters (Smartwings to Warsaw, Electra to Katowice) were listed on Wikipedia but are not in the Oct 2026 schedule.

---

## B. Tbilisi (TBS) departure board: 20 cities

Order: EU capitals and the key markets (PL, DE, IT) first, then other European capitals, then hubs for Middle Eastern and Central Asian travellers, then the South Caucasus neighbours that fit Local Host's three-country tours. All 20 were seen on the official TBS live board, 10-12 Oct 2026.

| # | City | IATA | Country | Airline(s) | Seasonal | Conf. | Extra evidence |
|---|---|---|---|---|---|---|---|
| 1 | Warsaw | WAW | PL | LOT | false | high | FM: winter 25/26 + W26 filed |
| 2 | Berlin | BER | DE | Georgian Airways | false | high | A9 schedule (Wed, Sat); FM winter 25/26 + W26 |
| 3 | Munich | MUC | DE | Lufthansa | false | high | FM: daily in S26, 6 weekly filed for W26 |
| 4 | Milan | MIL (MXP + BGY) | IT | easyJet (MXP), Georgian Airways (BGY) | false | high | A9 schedule (Tue, Fri, Sun) |
| 5 | Rome | FCO | IT | Georgian Airways | false | high | A9 schedule (Wed, Sat) |
| 6 | Vienna | VIE | AT | Austrian, Georgian Airways | false | high | A9 schedule (Thu, Sun); OS kept TBS in winter 2024/25 |
| 7 | Paris | PAR (CDG + ORY) | FR | Georgian Airways (CDG), Transavia France (ORY) | false | high | Air France itself no longer flies |
| 8 | Amsterdam | AMS | NL | Georgian Airways, Transavia | false | high | A9 schedule (Mon, Wed, Sat) |
| 9 | Athens | ATH | GR | Aegean, Sky Express | false | high | Aegean fares on sale through winter |
| 10 | Riga | RIX | LV | airBaltic | false | high | airBaltic nonstop fares Nov 2026-May 2027 |
| 11 | London | LON (LHR + LTN) | GB | British Airways (LHR), easyJet (LTN) | false | high | BA and easyJet both flew winter 25/26 |
| 12 | Copenhagen | CPH | DK | Norwegian | null | medium | New 27 Jun 2026; W26 filed; reportedly year-round (unconfirmed) |
| 13 | Istanbul | IST (IST + SAW) | TR | Turkish Airlines (IST), Pegasus and AJet (SAW) | false | high | |
| 14 | Dubai | DXB | AE | flydubai (Emirates codeshare) | false | high | |
| 15 | Doha | DOH | QA | Qatar Airways | false | high | Georgian Airways' Doha flights ended Feb 2026 |
| 16 | Tel Aviv | TLV | IL | Arkia, El Al, Israir | false | medium | Often cancelled for security reasons |
| 17 | Almaty | ALA | KZ | Air Astana | false | high | |
| 18 | Tashkent | TAS | UZ | Uzbekistan Airways, Centrum Air | false | high | |
| 19 | Baku | GYD | AZ | Azerbaijan Airlines | false | high | |
| 20 | Yerevan | EVN | AM | FlyOne Armenia, Georgian Airways | false | high | |

**Verified alternates** (in JSON `alternates`):
- **Europe:** Zurich (Edelweiss), Geneva (easyJet), Larnaca and Nice (Georgian Airways), Belgrade (Air Serbia), Chișinău (FlyOne)
- **Central Asia:** Astana (Air Astana)
- **Middle East:** Abu Dhabi and Sharjah (Air Arabia), Riyadh and Jeddah (flynas), Kuwait (Jazeera, Kuwait Airways), Bahrain (Gulf Air)
- **Türkiye:** Ankara (AJet), Antalya (Pegasus, SunExpress)
- **Seasonal or future:** Cologne/Bonn (Eurowings, **summer-only**). Frankfurt (Condor) is **not flying until 2 May 2027**; do not show it before then.

---

## C. Kutaisi (KUT) departure board: 20 cities

All 20 are Wizz Air, and all are in the official Kutaisi schedule for 10 Oct-10 Nov 2026. "Last date loaded" is the last flight currently in the airport's data. Routes loaded only to 21-24 Oct have their winter schedule **filed** (FlightMapper) but not yet loaded by the airport. All 20 also flew in winter 2025/26.

| # | City | IATA | Country | Departures 10 Oct-10 Nov | Last date loaded | Seasonal | Conf. |
|---|---|---|---|---|---|---|---|
| 1 | Warsaw | WAW | PL | 13 | 23 Oct (W26 filed from 25 Oct) | false | high |
| 2 | Katowice | KTW | PL | 16 | 10 Nov | false | high |
| 3 | Poznań | POZ | PL | 6 | 24 Oct (W26 filed) | false | high |
| 4 | Wrocław | WRO | PL | 4 | 21 Oct (W26 filed) | false | high |
| 5 | Berlin | BER | DE | 9 | 10 Nov | false | high |
| 6 | Dortmund | DTM | DE | 8 | 7 Nov | false | high |
| 7 | Hamburg | HAM | DE | 4 | 24 Oct (W26 filed) | false | high |
| 8 | Memmingen ("Munich West") | FMM | DE | 12 | 9 Nov | false | high |
| 9 | Frankfurt-Hahn | HHN | DE | 9 | 10 Nov | false | high |
| 10 | Milan (Malpensa) | MXP | IT | 6 | 23 Oct (W26 filed) | false | high |
| 11 | Rome | ROM (FCO) | IT | 18 | 9 Nov | false | high |
| 12 | Venice | VCE | IT | 4 (Wizz Air Malta) | 24 Oct (W26 filed) | false | high |
| 13 | Budapest | BUD | HU | 17 | 10 Nov | false | high |
| 14 | Prague | PRG | CZ | 6 | 24 Oct (W26 filed) | false | high |
| 15 | Bratislava | BTS | SK | 14 | 10 Nov | false | high |
| 16 | Vilnius | VNO | LT | 7 | 24 Oct (W26 filed) | false | high |
| 17 | Athens | ATH | GR | 18 | 9 Nov | false | high |
| 18 | Paris-Beauvais | BVA | FR | 13 | 10 Nov | false | high |
| 19 | Brussels-Charleroi | CRL | BE | 12 | 10 Nov | false | high |
| 20 | Madrid | MAD | ES | 4 | 24 Oct (W26 filed) | false | high |

**Verified alternates** (in JSON `alternates`):
- Istanbul-SAW (Pegasus, year-round)
- Almaty and Astana (FlyArystan)
- Barcelona, Larnaca, Thessaloniki and Lyon (Wizz Air)
- Aktau and Atyrau (FlyArystan)

These are the only options at KUT for Middle Eastern and Central Asian travellers: Istanbul as a hub, plus Kazakhstan. The Oct 2026 KUT schedule has no Middle East routes. To serve those markets, swap in Istanbul and Almaty for Frankfurt-Hahn and Memmingen.

Minsk (Belavia) and Moscow (Azimuth) also fly to KUT but were left out on purpose for an EU-facing site.

---

## Verification log (skeptical pass)

For every high-confidence claim I looked for evidence that the route had been suspended, had ended, or was mislabelled. Outcomes:

1. **Air France at TBS: downgraded to "does not serve".** TBS's own route map and FlightMapper both list it. But two trip reports (Feb-Apr 2026) say the route ended in April 2026, and AF1053 was not on the live board on Sun 11 Oct 2026, a day it had been filed for. Final: `servesTBS: false`, medium.
2. **Condor Frankfurt-TBS: removed.** Georgia Today and Georgian officials (May 2026) announced a daily restart from 15 Jun 2026. AeroRoutes (20 Aug 2026) then reported it moved to **2 May 2027**: 4 weekly at first, 7 weekly from 25 May 2027. It was not on the live board. https://www.aeroroutes.com/eng/260820-dens27tbs
3. **Eurowings: Düsseldorf removed, Cologne/Bonn marked summer-only.** AeroRoutes (1 Dec 2025) lists the planned DUS-TBS (from 11 May 2026) as cancelled, and CGN-TBS as new from 2 Jul 2026 (1-2 weekly, Jul-Aug). FlightMapper shows CGN flights until 22 Oct 2026 and a short Stuttgart summer run (Aug-Sep). https://www.aeroroutes.com/eng/251201-ewns26
4. **Aegean to Thessaloniki: removed.** It is on TBS's route map, but FlightMapper has no TBS-SKG route and it was not on the board. Aegean's fare page shows SKG-TBS fares, but these are probably connections via Athens.
5. **Wizz Air Vienna-Kutaisi: removed (low).** FlightMapper lists a 3-weekly W6 7917/7918, filed for winter 2026/27. But the official KUT schedule has **zero** VIE flights from 10 Oct to 10 Nov 2026, and Skyscanner reported no flights as of March 2026. Probably suspended.
6. **Cologne and Gdańsk at KUT: removed.** Both are in the airport's destination list, but they have no flights and no FlightMapper route.
7. **Rome at KUT: which airport?** Wikipedia (citing OAG, May 2025) and the airport's own city code say Ciampino (CIA). FlightMapper puts flight **W6 7921** (the same number as in the official KUT schedule) at **Fiumicino (FCO)** and has no KUT-CIA route. → I used the city code **ROM**, with `airports: ["FCO"]` at medium certainty about the airport. The route itself is high confidence.
8. **Seasonality of the KUT routes.** I checked whether routes that stop on 23-24 Oct in the live data are summer-only. They are not: all flew Jan-Mar 2026 and are filed from 25-27 Oct 2026. Pegasus SAW, which flies year-round, also stops on 25 Oct in the live data, which confirms that the airport just hasn't loaded the winter schedule. No reports of Wizz Air cutting Kutaisi routes for winter 2026/27 were found.
9. **Georgian Airways.** No 2026 suspension news was found.
   - Its official schedule lists Tel Aviv six days a week, but no A9 Tel Aviv flight was on the board on 11 or 12 Oct 2026, so I did not credit Georgian Airways for Tel Aviv.
   - Forlì (Thu) is in the schedule but Wikipedia marks it "suspended". FlightMapper has data only until Mar 2026, so its status is unclear.
   - Wikipedia's Georgian Airways **Doha** route ended in Feb 2026 (FlightMapper) and is not in the official schedule. Doha is credited to Qatar Airways only.
   - TBS's route map lists Georgian Airways to Munich, but that route is not in A9's schedule. Munich is credited to Lufthansa only.
10. **Norwegian Copenhagen.** It is new for summer 2026 (2 weekly from 27 Jun 2026, per Georgia's embassy in Norway). It was on the board in Oct and FlightMapper shows a winter 2026/27 filing. Search snippets say Georgia's Deputy Economy Minister called it year-round, but I could not confirm that on a primary page. It has not flown a winter yet → `seasonal: null`, medium.
11. **British Airways.** I checked whether it is summer-only. No: FlightMapper shows winter 2025/26 flights until 25 Mar 2026 and a filing from 25 Oct 2026, and it was on the board in Oct 2026 → year-round.
12. **easyJet.** The launch press (2024/25) described twice-weekly summer flights. FlightMapper shows all three routes flying through winter 2025/26 and filed for winter 2026/27. Kept as year-round.
13. **Wizz Air at TBS.** A French reseller's PDF headline mentions "Tbilissi" among Wizz Air's new 2026 routes. I found no Wizz flight on the TBS board, no TBS route in FlightMapper and no TBS route in Wizz's 2026 AeroRoutes network filings (10 Feb, 6 Mar, 18 Jul, 30 Jul, 9 Oct 2026). Its Caucasus growth went to **Yerevan** instead. → `servesTBS: false`, high.
14. **Dan Air Bucharest-TBS** (Wikipedia says from 1 Jul 2026). It was not on the board and had no FlightMapper route → not used.
15. **Iranian airlines** (Iran Aseman, Qeshm, Varesh): Wikipedia lists them as suspended in Sept 2026. Not relevant to the boards.

### Still uncertain
- How often Pegasus flies Antalya-TBS in winter.
- Whether Transavia France keeps Orly-TBS in winter. Georgian Airways covers Paris year-round either way.
- Which Rome airport Wizz Air uses from Kutaisi.
- The exact winter 2026/27 frequencies for all routes. Frequencies are deliberately left out of the JSON.

## Sources

**Official**
- Tbilisi airport board: https://tbilisiairport.com/en-EN/flights/departures
- Tbilisi airport route map: https://tbilisiairport.com/en-EN/flights/page/airport-route-map
- Kutaisi airport schedule: https://www.kutaisi.aero/en/flight/schedule
- Kutaisi airport destinations and airlines (data feed `api.airports.ge`): https://www.kutaisi.aero/en/flight/destinations
- Georgian Airways schedule: https://georgian-airways.com/en/flight/schedule
- airBaltic: https://www.airbaltic.com/en/flight-deals/flights-to-tbilisi
- Aegean: https://flights.aegeanair.com/en/flights-to-tbilisi
- BA launch: https://mediacentre.britishairways.com/news/17092024/british-airways-launches-the-uks-only-direct-flight-to-georgian-capital-tbilisi
- Austrian winter 2024/25: https://business.lufthansagroup.com/be/en/news/os-winter-flight-schedule-2024

**Trade press**
- AeroRoutes, Condor: https://www.aeroroutes.com/eng/260820-dens27tbs
- AeroRoutes, Eurowings: https://www.aeroroutes.com/eng/251201-ewns26
- AeroRoutes, Wizz Air 2026 filings:
  - https://www.aeroroutes.com/eng/260210-w6w4w9ns26
  - https://www.aeroroutes.com/eng/260306-w6ns26
  - https://www.aeroroutes.com/eng/260718-w6nw26
  - https://www.aeroroutes.com/eng/260731-w6nw26
  - https://www.aeroroutes.com/eng/261009-w6dec26evn

**Schedule data**
- FlightMapper: https://info.flightmapper.net/route/YY_TBS_WAW (and the same pattern for other airport pairs)

**News**
- Summer 2026 routes: https://georgiatoday.ge/?p=102539
- Bratislava-Kutaisi: https://georgiatoday.ge/wizz-air-launches-direct-flights-from-kutaisi-to-bratislava/
- Norwegian Copenhagen launch: https://norway.mfa.gov.ge/en/news/626922-scandinavia-s-second-largest-airline-to-launch-operations-in-georgia-from-summer-2026
- easyJet launch: https://1tv.ge/lang/en/news/easyjet-announces-launch-of-flight-services-in-georgia/

**Air France end of service**
- https://flight-report.com/fr/report/76939/air-france-af1052-paris-cdg-tbilisi-tbs/
- https://flight-report.com/fr/report/76999/air-france-af1053-tbilisi-tbs-paris-cdg/

**Background (raw wikitext read 10 Oct 2026)**
- https://en.wikipedia.org/wiki/Tbilisi_International_Airport
- https://en.wikipedia.org/wiki/Kutaisi_International_Airport
