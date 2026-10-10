/**
 * Demo-mode fixtures for the B2B Proposal Builder (no ANTHROPIC_API_KEY).
 *
 * Stored in the RAW structured-output format Claude returns
 * (ProposalModelOutput), so /api/proposal runs demo and live answers through
 * the same normalisation and both modes have exactly the same response shape.
 *
 * Grounded only in the brief and the knowledge base (src/lib/ai/knowledge.ts):
 * no prices, no named hotels/restaurants/wineries, no flight schedules, no
 * claims about real people. The agencies are anonymous samples.
 *   - it-georgia-wine-8d : EN — 25-pax Italian agency, 8 days Georgia, culture + wine + gastronomy, 4*
 *   - pl-ge-am-trek-10d  : PL — 16-pax Polish agency, 10 days Georgia + Armenia, trekking + culture
 * Translations are drafts — native review pending (docs/CONTENT-TODO.md).
 */
import type { ProposalInput, ProposalModelOutput } from '../client/proposal';
import type { Locale } from '../types';

export interface ProposalFixture {
  id: string;
  /** Language the fixture is written in. */
  locale: Locale;
  brief: ProposalInput;
  output: ProposalModelOutput;
}

// ---------------------------------------------------------------------------
// EN — Italian agency, 8 days Georgia (culture, wine, gastronomy), 4*
// ---------------------------------------------------------------------------

const IT_GEORGIA: ProposalFixture = {
  id: 'it-georgia-wine-8d',
  locale: 'en',
  brief: {
    locale: 'en',
    agency: 'Sample tour operator (Italy)',
    market: 'Italy',
    groupSize: 25,
    month: 9,
    season: null,
    days: 8,
    countries: ['GE'],
    interests: ['culture', 'wine', 'gastronomy'],
    hotelCategory: '4*',
    pace: 'balanced',
    specialRequests: 'Mostly first-time visitors to Georgia. They would love an evening with traditional singing and a hands-on cooking experience.',
  },
  output: {
    title: 'Georgia: Ancient Capitals, Qvevri Wine and the Georgian Table',
    subtitle: '8 days in Georgia · 25 travellers · 4* hotels · balanced pace',
    summary:
      'A first journey to Georgia for Italian travellers who love history, wine and good food. The programme pairs Tbilisi and the ancient capital of Mtskheta with two days in Kakheti, Georgia\'s main wine region, and a day on the Georgian Military Road to Kazbegi. Family cellars, a supra feast and a cooking session give the group real time with the people behind the food and wine. September typically brings the start of Rtveli, the grape harvest — the team confirms the timing for your dates.',
    highlights: [
      'Tbilisi old town: the sulphur-bath district, Narikala fortress and carved wooden balconies',
      'Svetitskhoveli Cathedral and Jvari Monastery in Mtskheta (UNESCO World Heritage)',
      'Uplistsikhe, an ancient town carved into the rock',
      'Qvevri wine in Kakheti family cellars — a UNESCO-listed winemaking tradition',
      'A supra feast with a tamada, toasts and Georgian polyphonic singing',
      'Gergeti Trinity Church beneath Mount Kazbek (5,054 m)',
    ],
    days: [
      {
        day: 1,
        title: 'Arrival in Tbilisi',
        placeIds: ['tbilisi'],
        activities: [
          'Meet and greet at Tbilisi airport (TBS) and transfer to the hotel',
          'Depending on arrival time, a short evening stroll in the old town',
          'Welcome dinner with Georgian classics such as khachapuri, pkhali and mtsvadi',
        ],
        meals: 'Dinner',
        overnight: 'Tbilisi — 4* hotel',
      },
      {
        day: 2,
        title: 'Tbilisi: Old Town and Living Traditions',
        placeIds: ['tbilisi'],
        activities: [
          'Guided walk through Abanotubani, the sulphur-bath district, up to Narikala fortress and past the carved wooden balconies',
          'Churches, a mosque and a synagogue within a short walk — Tbilisi\'s many faiths side by side',
          'Visit a local market and a bakery baking traditional clay-oven bread (shoti)',
          'Free afternoon; optional visit to a sulphur bath',
        ],
        meals: 'Breakfast, lunch',
        overnight: 'Tbilisi — 4* hotel',
      },
      {
        day: 3,
        title: 'Mtskheta and Uplistsikhe',
        placeIds: ['mtskheta', 'uplistsikhe', 'tbilisi'],
        activities: [
          'Drive to Mtskheta (about 30 min), the ancient capital: Svetitskhoveli Cathedral and Jvari Monastery (UNESCO)',
          'Continue to Uplistsikhe and explore its rock-hewn halls and streets',
          'Return to Tbilisi; evening at leisure',
        ],
        meals: 'Breakfast, lunch',
        overnight: 'Tbilisi — 4* hotel',
      },
      {
        day: 4,
        title: 'Into Kakheti: Bodbe and Sighnaghi',
        placeIds: ['bodbe', 'sighnaghi'],
        activities: [
          'Drive to Kakheti (about 2 h), Georgia\'s main wine region',
          'Bodbe Monastery, the resting place of St Nino',
          'Walk the lanes of hilltop Sighnaghi, with views over the Alazani Valley to the Caucasus range',
          'Tasting in a family cellar (marani): amber and classic wines from qvevri',
        ],
        meals: 'Breakfast, lunch, dinner',
        overnight: 'Kakheti — 4* hotel',
      },
      {
        day: 5,
        title: 'Kakheti Wine Day: Tsinandali and Telavi',
        placeIds: ['tsinandali', 'telavi'],
        activities: [
          'Tsinandali: historic estate and gardens, with a tasting of Saperavi and Rkatsiteli',
          'Seasonal: join the Rtveli harvest with a family — picking, pressing and the harvest table (typically mid-September to October)',
          'Telavi and the view across the Alazani Valley to the Caucasus range',
          'Evening supra with a tamada, toasts and Georgian polyphonic singing',
        ],
        meals: 'Breakfast, lunch, dinner',
        overnight: 'Kakheti — 4* hotel',
      },
      {
        day: 6,
        title: 'Kvareli and a Cooking Session in Tbilisi',
        placeIds: ['kvareli', 'tbilisi'],
        activities: [
          'Morning in Kvareli, at the foot of the Greater Caucasus, with a final wine visit',
          'Return to Tbilisi',
          'Hands-on cooking session: fold khinkali and bake khachapuri with a local cook, then share the meal',
        ],
        meals: 'Breakfast, dinner',
        overnight: 'Tbilisi — 4* hotel',
      },
      {
        day: 7,
        title: 'The Georgian Military Road to Kazbegi',
        placeIds: ['ananuri', 'gudauri', 'stepantsminda', 'gergeti', 'tbilisi'],
        activities: [
          'Drive north on the Georgian Military Road (about 3 h to Stepantsminda) with a stop at Ananuri fortress',
          'Panorama stop near Gudauri',
          '4×4 vehicles take the group up to Gergeti Trinity Church beneath Mount Kazbek, weather permitting',
          'Return to Tbilisi for a farewell dinner',
        ],
        meals: 'Breakfast, lunch, dinner',
        overnight: 'Tbilisi — 4* hotel',
      },
      {
        day: 8,
        title: 'Departure',
        placeIds: ['tbilisi'],
        activities: ['Breakfast and free time, depending on flight times', 'Transfer to Tbilisi airport (TBS)'],
        meals: 'Breakfast',
        overnight: '—',
      },
    ],
    included: [
      '7 nights in 4* hotels (twin/double rooms) with breakfast',
      'Meals as listed, including the welcome dinner, the supra and the farewell dinner',
      'Air-conditioned coach for 25 travellers with an experienced driver; 4×4 vehicles to Gergeti',
      'Professional local guide speaking Italian throughout (to be confirmed)',
      'Entrance fees for the sites in the programme',
      'Wine tastings in Kakheti and the cooking session',
      'Airport transfers on arrival and departure',
    ],
    notIncluded: [
      'International flights',
      'Travel insurance (strongly recommended)',
      'Drinks outside the listed meals and tastings',
      'Optional activities (e.g. a sulphur bath) and personal expenses',
      'Tips for guides and drivers',
      'Visa costs, if any — entry rules depend on nationality; please check the official sources',
    ],
    sustainability: [
      'Tastings and meals with family-run cellars and kitchens, so spending stays in local communities',
      'Local guides, drivers and family businesses at every stop',
      'We prefer hotels and restaurants with recognised sustainability certificates where available',
      'Respectful visits: covered shoulders and knees at churches and monasteries; women usually cover their hair in Georgian churches (wraps are often available)',
      'Local Host follows the Travelife sustainability criteria for tour operators (Travelife Partner)',
    ],
    nextSteps: [
      'Share your preferred dates and an expected rooming list (twins, doubles, singles)',
      'Tell us what to adapt — more wine, a free day in Tbilisi, or an extension to Armenia',
      'The Local Host team prepares pricing and a tailored quote for the final programme',
      'Write to info@localhost.ge or call +995 514 37 44 33',
    ],
    disclaimer:
      'This is an AI-assisted draft based on your brief. Availability, opening times, harvest timing and road conditions are confirmed by the Local Host team; pricing is prepared by the Local Host team on request.',
  },
};

// ---------------------------------------------------------------------------
// PL — Polish agency, 10 days Georgia + Armenia (trekking, culture), mixed
// ---------------------------------------------------------------------------

const PL_TREK: ProposalFixture = {
  id: 'pl-ge-am-trek-10d',
  locale: 'pl',
  brief: {
    locale: 'pl',
    agency: 'Przykładowe biuro podróży (Polska)',
    market: 'Polska',
    groupSize: 16,
    month: 7,
    season: null,
    days: 10,
    countries: ['GE', 'AM'],
    interests: ['trekking', 'culture'],
    hotelCategory: 'mixed',
    pace: 'active',
    specialRequests: 'Grupa w dobrej kondycji, chętna na całodniowe wędrówki. Chcą zobaczyć Kazbek i najważniejsze klasztory Armenii.',
  },
  output: {
    title: 'Gruzja i Armenia: szlaki Kaukazu i klasztory',
    subtitle: '10 dni · Gruzja i Armenia · 16 osób · hotele i pensjonaty rodzinne · aktywne tempo',
    summary:
      'Aktywny program dla grupy w dobrej kondycji: trzy dni pieszych wędrówek w rejonie Kazbegi pod Kazbekiem, a potem Armenia — lasy Dilidżanu, jezioro Sewan i najważniejsze klasztory. Lipiec to typowo dobry czas na wysokie góry (od połowy czerwca do końca września), choć pogoda zmienia się szybko. Wszystkie wędrówki prowadzą doświadczeni lokalni przewodnicy górscy, a przejazd do Armenii i przekroczenie granicy organizuje zespół Local Host.',
    highlights: [
      'Wejście do cerkwi Świętej Trójcy w Gergeti pod Kazbekiem (5054 m)',
      'Dolina Dżuta i masyw Czauchi oraz dolina Truso',
      'Mccheta — dawna stolica Gruzji (UNESCO)',
      'Lasy Dilidżanu i jezioro Sewan',
      'Świątynia Garni i wykuty w skale klasztor Geghard (UNESCO)',
      'Chor Wirap z widokiem na Ararat i klasztor Norawank',
    ],
    days: [
      {
        day: 1,
        title: 'Przylot do Tbilisi',
        placeIds: ['tbilisi'],
        activities: [
          'Powitanie na lotnisku w Tbilisi (TBS) i transfer do hotelu',
          'W zależności od godziny przylotu krótki spacer po starym mieście',
          'Kolacja powitalna z daniami kuchni gruzińskiej',
        ],
        meals: 'Kolacja',
        overnight: 'Tbilisi — hotel 3*/4*',
      },
      {
        day: 2,
        title: 'Tbilisi i Mccheta',
        placeIds: ['tbilisi', 'mtskheta'],
        activities: [
          'Spacer po starym Tbilisi: dzielnica łaźni siarkowych Abanotubani, twierdza Narikala, drewniane balkony',
          'Przejazd do Mcchety (ok. 30 min): katedra Sweti Cchoweli i monaster Dżwari (UNESCO)',
          'Wieczór wolny',
        ],
        meals: 'Śniadanie, obiad',
        overnight: 'Tbilisi — hotel 3*/4*',
      },
      {
        day: 3,
        title: 'Gruzińska Droga Wojenna do Kazbegi',
        placeIds: ['ananuri', 'gudauri', 'stepantsminda', 'gergeti'],
        activities: [
          'Przejazd Gruzińską Drogą Wojenną (ok. 3 h) z postojem przy twierdzy Ananuri i punkcie widokowym koło Gudauri',
          'Piesze wejście ze Stepancmindy do cerkwi Świętej Trójcy w Gergeti pod Kazbekiem (5054 m)',
          'Kolacja w pensjonacie',
        ],
        meals: 'Śniadanie, obiad, kolacja',
        overnight: 'Stepancminda — rodzinny pensjonat',
      },
      {
        day: 4,
        title: 'Wędrówka w dolinie Dżuta pod masywem Czauchi',
        placeIds: ['juta-chaukhi', 'stepantsminda'],
        activities: [
          'Przejazd do Dżuty i całodniowa wędrówka przez alpejskie łąki w stronę skalnych turni masywu Czauchi',
          'Trasa i tempo dopasowane do pogody i grupy przez lokalnego przewodnika górskiego',
          'Powrót do Stepancmindy',
        ],
        meals: 'Śniadanie, suchy prowiant, kolacja',
        overnight: 'Stepancminda — rodzinny pensjonat',
      },
      {
        day: 5,
        title: 'Dolina Truso i powrót do Tbilisi',
        placeIds: ['truso', 'tbilisi'],
        activities: [
          'Wędrówka doliną Truso — szeroka górska dolina wśród szczytów Wielkiego Kaukazu',
          'Popołudniowy przejazd do Tbilisi (ok. 3 h)',
          'Wieczór wolny; dzień zapasowy na wypadek złej pogody w górach',
        ],
        meals: 'Śniadanie, suchy prowiant',
        overnight: 'Tbilisi — hotel 3*/4*',
      },
      {
        day: 6,
        title: 'Do Armenii: Dilidżan',
        placeIds: ['tbilisi', 'dilijan'],
        activities: [
          'Przejazd do Armenii — przekroczenie granicy organizuje zespół Local Host',
          'Popołudniowy spacer po lasach Dilidżanu',
        ],
        meals: 'Śniadanie, kolacja',
        overnight: 'Dilidżan — hotel lub pensjonat',
      },
      {
        day: 7,
        title: 'Lasy Dilidżanu i jezioro Sewan',
        placeIds: ['dilijan', 'sevan', 'yerevan'],
        activities: [
          'Poranna wędrówka leśnymi szlakami w okolicach Dilidżanu',
          'Jezioro Sewan i klasztor Sewanawank nad brzegiem jeziora',
          'Przejazd do Erywania (ok. 1 h z Sewanu)',
        ],
        meals: 'Śniadanie, obiad',
        overnight: 'Erywań — hotel 3*/4*',
      },
      {
        day: 8,
        title: 'Garni i Geghard',
        placeIds: ['garni', 'geghard', 'yerevan'],
        activities: [
          'Świątynia Garni w stylu grecko-rzymskim (ok. 1 h z Erywania) i spacer po wąwozie poniżej',
          'Wykuty w skale klasztor Geghard (UNESCO)',
          'Popołudniowy spacer po Erywaniu',
        ],
        meals: 'Śniadanie, obiad',
        overnight: 'Erywań — hotel 3*/4*',
      },
      {
        day: 9,
        title: 'Chor Wirap, Areni i Norawank',
        placeIds: ['khor-virap', 'areni', 'noravank', 'yerevan'],
        activities: [
          'Klasztor Chor Wirap z widokiem na Ararat',
          'Areni w regionie Wajoc Dzor: wioska winiarska i jaskinia Areni-1, gdzie odkryto najstarszą znaną winiarnię',
          'Klasztor Norawank i krótka wędrówka po wąwozie',
          'Kolacja pożegnalna w Erywaniu',
        ],
        meals: 'Śniadanie, obiad, kolacja',
        overnight: 'Erywań — hotel 3*/4*',
      },
      {
        day: 10,
        title: 'Wylot',
        placeIds: ['yerevan'],
        activities: [
          'Transfer na lotnisko Zwartnoc w Erywaniu (EVN) albo powrót do Tbilisi — zależnie od wybranych połączeń lotniczych',
        ],
        meals: 'Śniadanie',
        overnight: '—',
      },
    ],
    included: [
      '9 noclegów: hotele 3*/4* w miastach, rodzinne pensjonaty w Stepancmindzie, hotel lub pensjonat w Dilidżanie',
      'Wyżywienie zgodnie z programem, w tym suchy prowiant na dni trekkingowe',
      'Transport klimatyzowanym busem dla 16 osób z doświadczonym kierowcą',
      'Pilot-przewodnik mówiący po polsku lub angielsku (do potwierdzenia) oraz lokalni przewodnicy górscy na wędrówkach',
      'Bilety wstępu do obiektów z programu',
      'Organizacja przejazdu do Armenii i przekroczenia granicy',
      'Transfery lotniskowe',
    ],
    notIncluded: [
      'Przeloty międzynarodowe',
      'Ubezpieczenie podróżne obejmujące wędrówki górskie (zdecydowanie zalecane)',
      'Napoje poza posiłkami z programu',
      'Wydatki osobiste',
      'Napiwki dla przewodników i kierowców',
      'Ewentualne koszty wiz — zasady wjazdu zależą od obywatelstwa; prosimy sprawdzić oficjalne źródła',
    ],
    sustainability: [
      'Noclegi w rodzinnych pensjonatach w górach — pieniądze zostają w lokalnych społecznościach',
      'Lokalni przewodnicy górscy i lokalne jedzenie na całej trasie',
      'Wędrujemy wyznaczonymi szlakami i przestrzegamy zasad obszarów chronionych',
      'Odpowiedni strój w cerkwiach i klasztorach: zakryte ramiona i kolana; w gruzińskich cerkwiach kobiety zwykle zakrywają włosy',
      'Local Host działa według kryteriów zrównoważonej turystyki Travelife dla touroperatorów (Travelife Partner)',
    ],
    nextSteps: [
      'Prześlijcie preferowane terminy, listę pokoi i informacje o doświadczeniu górskim uczestników',
      'Napiszcie, co zmienić — np. więcej dni w górach albo przedłużenie programu o Tatew lub Azerbejdżan',
      'Zespół Local Host przygotuje wycenę i indywidualną ofertę dla ostatecznego programu',
      'Kontakt: info@localhost.ge, +995 514 37 44 33',
    ],
    disclaimer:
      'To szkic programu przygotowany z pomocą AI na podstawie Waszego zapytania. Dostępność, godziny otwarcia, warunki na szlakach i drogach oraz zasady przekraczania granicy potwierdza zespół Local Host; wycenę przygotowuje zespół Local Host na życzenie.',
  },
};

export const PROPOSAL_FIXTURES: readonly ProposalFixture[] = [IT_GEORGIA, PL_TREK];

/**
 * Picks the demo proposal closest to the visitor's brief: same countries,
 * trekking or not, shared interests, similar length, then language.
 */
export function pickProposalFixture(brief: Pick<ProposalInput, 'countries' | 'interests' | 'days'>, locale: Locale): ProposalFixture {
  const score = (f: ProposalFixture): number => {
    let s = 0;
    const sameCountries =
      f.brief.countries.length === brief.countries.length && f.brief.countries.every((c) => brief.countries.includes(c));
    if (sameCountries) s += 3;
    s += brief.countries.filter((c) => f.brief.countries.includes(c)).length;
    if (f.brief.interests.includes('trekking') === brief.interests.includes('trekking')) s += 2;
    s += brief.interests.filter((i) => f.brief.interests.includes(i)).length;
    s -= Math.abs(f.brief.days - brief.days) / 4;
    if (f.locale === locale) s += 1.5;
    return s;
  };
  return [...PROPOSAL_FIXTURES].sort((a, b) => score(b) - score(a))[0] ?? IT_GEORGIA;
}

/** Demo labels (drafted — native review pending). `{lang}` = language of the sample. */
export const PROPOSAL_DEMO_NOTICES: Readonly<Record<Locale, { matching: string; other: string; lang: Record<Locale, string> }>> = {
  en: {
    matching: 'Demo — a sample proposal prepared in advance ({lang}). With the AI connected, the proposal is written for your exact brief.',
    other: 'Demo — your brief was not sent to the AI. This is the closest sample proposal prepared in advance ({lang}); with the AI connected, the proposal is written for your exact brief.',
    lang: { en: 'in English', ka: 'in Georgian', pl: 'in Polish', it: 'in Italian', de: 'in German' },
  },
  ka: {
    matching: 'დემო — წინასწარ მომზადებული სანიმუშო შეთავაზება ({lang}). AI-ის ჩართვის შემდეგ შეთავაზება ზუსტად თქვენი მოთხოვნისთვის შეიქმნება.',
    other: 'დემო — თქვენი მოთხოვნა AI-ს არ გაეგზავნა. ეს უახლოესი წინასწარ მომზადებული ნიმუშია ({lang}); AI-ის ჩართვის შემდეგ შეთავაზება ზუსტად თქვენი მოთხოვნისთვის შეიქმნება.',
    lang: { en: 'ინგლისურად', ka: 'ქართულად', pl: 'პოლონურად', it: 'იტალიურად', de: 'გერმანულად' },
  },
  pl: {
    matching: 'Demo — przykładowa oferta przygotowana wcześniej ({lang}). Po podłączeniu AI oferta powstaje dokładnie dla Waszego zapytania.',
    other: 'Demo — Wasze zapytanie nie zostało wysłane do AI. To najbliższa przykładowa oferta przygotowana wcześniej ({lang}); po podłączeniu AI oferta powstaje dokładnie dla Waszego zapytania.',
    lang: { en: 'po angielsku', ka: 'po gruzińsku', pl: 'po polsku', it: 'po włosku', de: 'po niemiecku' },
  },
  it: {
    matching: 'Demo — una proposta di esempio preparata in anticipo ({lang}). Con l’AI collegata, la proposta viene scritta per la vostra richiesta esatta.',
    other: 'Demo — la vostra richiesta non è stata inviata all’AI. Questa è la proposta di esempio più vicina, preparata in anticipo ({lang}); con l’AI collegata, la proposta viene scritta per la vostra richiesta esatta.',
    lang: { en: 'in inglese', ka: 'in georgiano', pl: 'in polacco', it: 'in italiano', de: 'in tedesco' },
  },
  de: {
    matching: 'Demo — ein vorab vorbereiteter Beispielvorschlag ({lang}). Mit aktivierter KI wird der Vorschlag genau für Ihre Anfrage geschrieben.',
    other: 'Demo — Ihre Anfrage wurde nicht an die KI gesendet. Dies ist der ähnlichste vorab vorbereitete Beispielvorschlag ({lang}); mit aktivierter KI wird der Vorschlag genau für Ihre Anfrage geschrieben.',
    lang: { en: 'auf Englisch', ka: 'auf Georgisch', pl: 'auf Polnisch', it: 'auf Italienisch', de: 'auf Deutsch' },
  },
};

/** Always shown with a proposal (live and demo): no prices from the AI. */
export const PRICING_NOTES: Readonly<Record<Locale, string>> = {
  en: 'Pricing is prepared by the Local Host team — send us this draft and we will reply with a tailored quote.',
  ka: 'ფასებს ამზადებს Local Host-ის გუნდი — გამოგვიგზავნეთ ეს მონახაზი და მოგიმზადებთ ინდივიდუალურ შეთავაზებას.',
  pl: 'Wycenę przygotowuje zespół Local Host — prześlijcie nam ten szkic, a odpowiemy indywidualną ofertą.',
  it: 'Il preventivo è preparato dal team di Local Host: inviateci questa bozza e vi risponderemo con un’offerta su misura.',
  de: 'Die Preise erstellt das Local-Host-Team — senden Sie uns diesen Entwurf, und wir antworten mit einem individuellen Angebot.',
};
