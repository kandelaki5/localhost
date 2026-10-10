/**
 * Demo-mode fixtures for POST /api/plan (AI Trip Designer). SERVER-SIDE
 * (imports the knowledge base for localised names).
 *
 * Three hand-written sample itineraries in exactly the live output format
 * (intro → "## Day N — Title" + bullets + "Overnight:" → "### Why this route"
 * → closing line → <route>[…]</route>). Grounded only in the brief, the
 * company's policies and the knowledge base: no prices, no schedules, no
 * hotel/restaurant names, host facts only as listed in knowledge.ts, travel
 * times only as in TRAVEL_TIMES. Italian copy: flagged for native review.
 */
import { COUNTRIES, experienceName } from '../knowledge';
import type { CountryCode, ExperienceId, Locale } from '../types';

export interface PlanFixture {
  id: string;
  locale: Locale;
  countries: readonly CountryCode[];
  interests: readonly ExperienceId[];
  days: number;
  /** Plan Markdown including the trailing route tag. */
  text: string;
}

const GE_CULTURE_WINE_7 = `Seven days that pair Georgia's oldest stories with its oldest craft: winemaking. You start in Tbilisi, follow the Georgian Military Road towards Mount Kazbek and finish among the family cellars of Kakheti.

## Day 1 — Tbilisi: balconies, baths and a first supra
- Arrival in Tbilisi and a relaxed walk through the old town: carved wooden balconies, Narikala fortress and the sulphur-bath district of Abanotubani.
- Churches, a mosque and a synagogue within a short walk of each other — a first glimpse of how many cultures meet here.
- Welcome dinner with khinkali, pkhali and aubergine with walnut, and a first glass of Saperavi.
Overnight: Tbilisi

## Day 2 — Mtskheta and the Georgian Military Road
- Mtskheta, Georgia's ancient capital: Svetitskhoveli Cathedral and Jvari Monastery, both UNESCO World Heritage.
- North along the Georgian Military Road, with a stop at Ananuri fortress.
- Arrival in Stepantsminda (Kazbegi), about 3 hours from Tbilisi, in time for dinner at a family guesthouse.
Overnight: Stepantsminda (Kazbegi)

## Day 3 — Gergeti Trinity Church beneath Mount Kazbek
- Walk up — or ride up by 4×4 — to Gergeti Trinity Church, framed by Mount Kazbek (5,054 m).
- A picnic with local bread and cheese above the valley, weather permitting.
- Afternoon drive back to Tbilisi and a free evening.
Overnight: Tbilisi

## Day 4 — Into Kakheti: Bodbe and Sighnaghi
- Drive east into Kakheti, Georgia's main wine region (about 2 hours).
- Bodbe Monastery, the resting place of St Nino, and the hill town of Sighnaghi with wide views over the Alazani Valley.
- First tasting in a family marani: amber wines from qvevri and a small glass of chacha.
Overnight: Sighnaghi

## Day 5 — Qvevri day in the Alazani Valley
- With a winemaking family, learn how wine ferments and ages in clay qvevri buried in the ground — a method on UNESCO's intangible-heritage list.
- Taste native grapes such as Saperavi and Rkatsiteli side by side, classic and amber.
- Evening supra led by a tamada, with toasts and, often, polyphonic songs.
Overnight: Telavi

## Day 6 — Telavi, Tsinandali and Kvareli
- Morning in Telavi, with the view of the Caucasus range that our team loves.
- The historic Tsinandali estate and its gardens, followed by a tasting.
- Afternoon in Kvareli; travelling in September or October? Ask us about joining the Rtveli grape harvest, which typically runs from mid-September into October.
Overnight: Telavi

## Day 7 — Back to Tbilisi and departure
- Return to Tbilisi (about 1.5–2 hours), stopping at a village bakery for warm shoti from the clay oven.
- A last stroll and some churchkhela for the suitcase.
- Transfer to Tbilisi airport for your flight home.
Overnight: —

### Why this route
- It brings together the three big themes of eastern Georgia — the old capital, the high Caucasus and Kakheti's wine valleys — with no drive longer than about 3 hours.
- Wine is tasted where it is made: in family cellars and with the people who make it.
- Our local-host touch: family guesthouses and cellars, local food and local guides keep the benefits in the communities you visit, and where it fits we introduce you to hosts we love — like Leila, who prepares the best khinkali while telling her life story.

Like this draft? Send it to the Local Host team and we will turn it into a tailored programme with a quote — or write to info@localhost.ge.
<route>["tbilisi","mtskheta","ananuri","stepantsminda","gergeti","tbilisi","bodbe","sighnaghi","telavi","tsinandali","kvareli","tbilisi"]</route>`;

const GE_AM_TREKKING_PILGRIM_10 = `Ten days on foot and on pilgrimage through two of the oldest Christian nations: cave monasteries and the slopes of Mount Kazbek in Georgia, then Armenia's monasteries, Lake Sevan and the view of Mount Ararat.

## Day 1 — Arrival in Tbilisi
- Arrival in Tbilisi and a gentle first walk through the old town up to Narikala fortress, for the view over the city.
- Dinner in the old town while your guide talks you through the route, the trails and what to pack.
Overnight: Tbilisi

## Day 2 — The cave monasteries of David Gareja
- Drive into the semi-desert to the David Gareja cave monasteries (about 2–2.5 hours, the last part on a rough road).
- Walk among cave churches and cells carved into the rock; your guide checks which paths are currently open.
- Back to Tbilisi in the late afternoon.
Overnight: Tbilisi

## Day 3 — Mtskheta, Ananuri and the road to Kazbegi
- Svetitskhoveli Cathedral and Jvari Monastery in Mtskheta, the cradle of Georgian Christianity.
- North on the Georgian Military Road, with a stop at Ananuri fortress.
- Check in at a family guesthouse in Stepantsminda (Kazbegi), beneath Mount Kazbek.
Overnight: Stepantsminda (Kazbegi)

## Day 4 — Hike to Gergeti Trinity Church
- Morning hike up to Gergeti Trinity Church, with Mount Kazbek (5,054 m) rising behind it.
- Strong walkers can continue to the meadows above the church with a local mountain guide, weather permitting.
- A slow dinner at the guesthouse.
Overnight: Stepantsminda (Kazbegi)

## Day 5 — Juta and the Chaukhi massif
- A short drive to the village of Juta, then a day hike towards the jagged peaks of the Chaukhi massif.
- Alpine meadows and big mountain views on a moderate trail that is easy to shorten.
- Return to Stepantsminda for the night.
Overnight: Stepantsminda (Kazbegi)

## Day 6 — Truso Valley and back to Tbilisi
- An easy morning walk in the Truso Valley; our team advises which parts of the valley are currently open to visitors.
- Drive back to Tbilisi (about 3 hours) and a free evening.
Overnight: Tbilisi

## Day 7 — Into Armenia: the forests of Dilijan
- Cross into Armenia with your driver — the Local Host team arranges the border crossing and checks the current rules.
- Afternoon walk in the green, forested hills around Dilijan.
Overnight: Dilijan

## Day 8 — Lake Sevan, Garni and Geghard
- Sevanavank monastery above the shore of Lake Sevan.
- The Greco-Roman-style temple of Garni and the rock-cut Geghard Monastery (UNESCO World Heritage).
- Arrival in Yerevan in the evening.
Overnight: Yerevan

## Day 9 — Khor Virap and Noravank
- Khor Virap, facing Mount Ararat across the plain — one of Armenia's most important pilgrimage sites.
- Through the wine village of Areni to Noravank Monastery.
- Back to Yerevan for a farewell dinner.
Overnight: Yerevan

## Day 10 — Etchmiadzin and departure
- Morning at Etchmiadzin, the seat of the Armenian Apostolic Church.
- Transfer to Yerevan Zvartnots airport for your flight home.
Overnight: —

### Why this route
- It links two of the oldest Christian nations in one journey — from St Nino's Georgia to Armenia's monasteries — with real walking days in between.
- The hikes suit good walkers without technical climbing; mountain days are led by experienced local guides, and the high trails are typically open from mid-June to late September.
- Our local-host touch: family guesthouses in the mountains and meals cooked by local families, so your visit supports the villages you walk through.

Like this plan? Send it to the Local Host team — we will check the season, the trails and the border logistics and come back with a tailored programme and quote (info@localhost.ge).
<route>["tbilisi","david-gareja","tbilisi","mtskheta","ananuri","stepantsminda","gergeti","juta-chaukhi","stepantsminda","truso","tbilisi","dilijan","sevan","garni","geghard","yerevan","khor-virap","areni","noravank","yerevan"]</route>`;

const GE_GASTRONOMY_WINE_8_IT = `Otto giorni per scoprire la Georgia a tavola: dai mercati di Tbilisi alle cantine di famiglia della Cachezia, fino alla cucina speziata della Mingrelia e al khachapuri dell'Agiaria, sul Mar Nero.

## Giorno 1 — Tbilisi: benvenuti a tavola
- Arrivo a Tbilisi e passeggiata nella città vecchia, tra balconi in legno intagliato, la fortezza di Narikala e il quartiere dei bagni sulfurei di Abanotubani.
- Cena di benvenuto con khinkali, pkhali e melanzane alle noci, accompagnati da un primo calice di Saperavi.
Pernottamento: Tbilisi

## Giorno 2 — Mercati, forni e Mtskheta
- Mattina al mercato e in un forno tradizionale, dove il pane shoti (tonis puri) cuoce nel forno di argilla.
- Lezione di cucina con una famiglia: si impastano e si chiudono i khinkali, poi si mangiano insieme.
- Pomeriggio a Mtskheta, l'antica capitale, con la cattedrale di Svetitskhoveli e il monastero di Jvari (patrimonio UNESCO).
Pernottamento: Tbilisi

## Giorno 3 — Cachezia: Bodbe e Sighnaghi
- Trasferimento in Cachezia, la principale regione vinicola della Georgia (circa 2 ore).
- Il monastero di Bodbe, dove riposa santa Nino, e la cittadina collinare di Sighnaghi, affacciata sulla valle dell'Alazani.
- Degustazione in un marani di famiglia: vini ambrati da qvevri e un assaggio di chacha.
Pernottamento: Sighnaghi

## Giorno 4 — Qvevri, Tsinandali e una vera supra
- Con una famiglia di vignaioli si scopre la vinificazione nei qvevri, le anfore di argilla interrate: un metodo iscritto nel patrimonio immateriale UNESCO.
- Visita alla storica tenuta di Tsinandali e ai suoi giardini, con degustazione di Saperavi e Rkatsiteli.
- La sera, una supra guidata dal tamada, tra brindisi, canti e piatti che non finiscono mai.
Pernottamento: Telavi

## Giorno 5 — Verso l'Imerezia
- Lunga giornata di trasferimento verso ovest (circa 5–5,5 ore di strada), con una sosta per il pranzo lungo il percorso.
- Arrivo a Kutaisi e cena con khachapuri imeruli e i vini dell'Imerezia, più leggeri, anch'essi fatti in qvevri.
Pernottamento: Kutaisi

## Giorno 6 — Kutaisi e Gelati
- Mattina al mercato di Kutaisi, tra spezie, formaggi e churchkhela.
- Il monastero di Gelati (patrimonio UNESCO), sulle colline sopra la città.
- Pomeriggio in una cantina dell'Imerezia per assaggiare lo stile locale di vinificazione in qvevri.
Pernottamento: Kutaisi

## Giorno 7 — Canyon di Martvili e cucina mingrela
- Passeggiata al canyon di Martvili, uno dei luoghi che il nostro team ama di più.
- Pranzo mingrelo: piatti speziati e ricchi di noci come l'elarji e la gebzhalia.
- Nel pomeriggio, proseguimento verso Batumi, sul Mar Nero.
Pernottamento: Batumi

## Giorno 8 — Batumi e partenza
- Colazione con il khachapuri adjaruli, la "barchetta" di pane con uovo e burro.
- Passeggiata sul lungomare di Batumi, poi trasferimento all'aeroporto di Batumi o di Kutaisi per il volo di rientro.
Pernottamento: —

### Perché questo itinerario
- Attraversa la Georgia da est a ovest seguendo il cibo: ogni regione ha il suo khachapuri, il suo pane e il suo vino.
- Si cucina e si mangia con le famiglie, non solo al ristorante; dove possibile vi presentiamo i nostri host, come Marika & Enry di Sisatura, che accolgono gli ospiti al cancello con un bicchierino di chacha e un grande sorriso.
- Il nostro tocco "local host": cantine e pensioni familiari, prodotti locali e guide del posto, perché i benefici del viaggio restino alle comunità che vi accolgono.

Vi piace questa bozza? Inviatela al team di Local Host: la trasformeremo in un programma su misura con un preventivo (info@localhost.ge).
<route>["tbilisi","mtskheta","tbilisi","bodbe","sighnaghi","tsinandali","telavi","kutaisi","gelati","kutaisi","martvili-canyon","batumi"]</route>`;

export const PLAN_FIXTURES: readonly PlanFixture[] = [
  { id: 'ge-culture-wine-7-en', locale: 'en', countries: ['GE'], interests: ['culture', 'wine'], days: 7, text: GE_CULTURE_WINE_7 },
  {
    id: 'ge-am-trekking-pilgrim-10-en',
    locale: 'en',
    countries: ['GE', 'AM'],
    interests: ['trekking', 'pilgrim'],
    days: 10,
    text: GE_AM_TREKKING_PILGRIM_10,
  },
  {
    id: 'ge-gastronomy-wine-8-it',
    locale: 'it',
    countries: ['GE'],
    interests: ['gastronomy', 'wine'],
    days: 8,
    text: GE_GASTRONOMY_WINE_8_IT,
  },
];

export interface FixtureQuery {
  countries: readonly CountryCode[];
  interests: readonly ExperienceId[];
  days: number;
  locale: Locale;
}

/**
 * Closest sample: shared countries count most, countries the visitor did not
 * ask for are penalised, then shared interests, the answer language and length.
 */
export function pickPlanFixture(query: FixtureQuery): PlanFixture {
  let best = PLAN_FIXTURES[0] as PlanFixture;
  let bestScore = -Infinity;
  for (const fixture of PLAN_FIXTURES) {
    const sharedCountries = fixture.countries.filter((c) => query.countries.includes(c)).length;
    const extraCountries = fixture.countries.length - sharedCountries;
    const sharedInterests = fixture.interests.filter((i) => query.interests.includes(i)).length;
    const score =
      3 * sharedCountries -
      2 * extraCountries +
      2 * sharedInterests +
      (fixture.locale === query.locale ? 2 : 0) -
      Math.abs(fixture.days - query.days) / 7;
    if (score > bestScore) {
      bestScore = score;
      best = fixture;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Demo note (localised; native review pending for ka/pl/de/it)
// ---------------------------------------------------------------------------

const DAYS_WORD: Record<Locale, string> = { en: 'days', ka: 'დღე', pl: 'dni', it: 'giorni', de: 'Tage' };

const SAMPLE_LANGUAGE: Record<Locale, Partial<Record<Locale, string>>> = {
  en: { en: 'in English', ka: 'ინგლისურ ენაზე', pl: 'po angielsku', it: 'in inglese', de: 'auf Englisch' },
  it: { en: 'in Italian', ka: 'იტალიურ ენაზე', pl: 'po włosku', it: 'in italiano', de: 'auf Italienisch' },
};

function tripSummary(trip: { countries: readonly CountryCode[]; interests: readonly ExperienceId[]; days: number }, locale: Locale): string {
  const parts = [
    trip.countries.map((c) => COUNTRIES[c].name[locale]).join(' & '),
    `${trip.days} ${DAYS_WORD[locale]}`,
  ];
  if (trip.interests.length) parts.push(trip.interests.map((i) => experienceName(i, locale)).join(', '));
  return parts.join(' · ');
}

const quote = (text: string) => {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > 120 ? `${oneLine.slice(0, 117)}…` : oneLine;
};

/**
 * The fixture text with a localised demo note on top (italic paragraph), so
 * the streamed answer itself says it is a sample — in addition to the
 * `X-AI-Mode: demo` header the client reads.
 */
export function demoPlanText(
  fixture: PlanFixture,
  request: FixtureQuery & { refinement?: string | undefined },
): string {
  const { locale } = request;
  const sample = tripSummary(fixture, locale);
  const asked = tripSummary(request, locale);
  const lang = fixture.locale === locale ? '' : ` (${SAMPLE_LANGUAGE[fixture.locale]?.[locale] ?? fixture.locale})`;
  const same = sample === asked;
  let note: string;
  if (request.refinement) {
    const change = quote(request.refinement);
    note = {
      en: `*Demo mode — sample itinerary. With the live AI planner switched on, the plan would now be rewritten with your change (“${change}”). Until then, here is the sample again${lang}.*`,
      it: `*Modalità demo — itinerario di esempio. Con il pianificatore AI attivo, il piano verrebbe ora riscritto con la vostra modifica («${change}»). Nel frattempo, ecco di nuovo l'esempio${lang}.*`,
      de: `*Demo-Modus — Beispielroute. Mit dem aktiven KI-Planer würde der Plan jetzt mit Ihrer Änderung („${change}“) neu geschrieben. Bis dahin sehen Sie noch einmal das Beispiel${lang}.*`,
      pl: `*Tryb demo — przykładowy plan. Gdy planer AI zostanie włączony, plan zostanie przepisany z Twoją zmianą („${change}”). Na razie pokazujemy ponownie przykład${lang}.*`,
      ka: `*დემო რეჟიმი — მარშრუტის ნიმუში. როცა AI დამგეგმავი ჩაირთვება, გეგმა თქვენი ცვლილებით („${change}“) თავიდან დაიწერება. მანამდე კი ისევ ნიმუშს გაჩვენებთ${lang}.*`,
    }[locale];
  } else {
    note = {
      en: same
        ? `*Demo mode — sample itinerary${lang}: ${sample}. The live AI planner isn't switched on yet, so this is a ready-made example, not a plan written for you.*`
        : `*Demo mode — sample itinerary. The live AI planner isn't switched on yet, so instead of a plan for ${asked} here is our closest ready-made example${lang}: ${sample}.*`,
      it: same
        ? `*Modalità demo — itinerario di esempio${lang}: ${sample}. Il pianificatore AI non è ancora attivo, quindi questo è un esempio già pronto, non un piano scritto per voi.*`
        : `*Modalità demo — itinerario di esempio. Il pianificatore AI non è ancora attivo: invece di un piano per ${asked}, ecco l'esempio già pronto più vicino${lang}: ${sample}.*`,
      de: same
        ? `*Demo-Modus — Beispielroute${lang}: ${sample}. Der KI-Planer ist noch nicht aktiv; dies ist ein fertiges Beispiel, kein Plan, der für Sie geschrieben wurde.*`
        : `*Demo-Modus — Beispielroute. Der KI-Planer ist noch nicht aktiv: Statt eines Plans für ${asked} sehen Sie unser passendstes fertiges Beispiel${lang}: ${sample}.*`,
      pl: same
        ? `*Tryb demo — przykładowy plan${lang}: ${sample}. Planer AI nie jest jeszcze włączony, więc to gotowy przykład, a nie plan napisany dla Ciebie.*`
        : `*Tryb demo — przykładowy plan. Planer AI nie jest jeszcze włączony, dlatego zamiast planu (${asked}) pokazujemy najbliższy gotowy przykład${lang}: ${sample}.*`,
      ka: same
        ? `*დემო რეჟიმი — მარშრუტის ნიმუში${lang}: ${sample}. AI დამგეგმავი ჯერ არ არის ჩართული, ამიტომ ეს მზა მაგალითია და არა თქვენთვის დაწერილი გეგმა.*`
        : `*დემო რეჟიმი — მარშრუტის ნიმუში. AI დამგეგმავი ჯერ არ არის ჩართული, ამიტომ გაჩვენებთ ყველაზე ახლო მზა მაგალითს${lang}: ${sample}. თქვენი მოთხოვნა: ${asked}.*`,
    }[locale];
  }
  return `${note}\n\n${fixture.text}`;
}
