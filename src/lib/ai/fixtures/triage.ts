/**
 * Sample emails for the inbox-triage staff tool ("Try a sample email") and
 * their precomputed results — the demo-mode answers of POST /api/triage, in
 * exactly the live format (TriageResult after normalisation).
 *
 * BROWSER-SAFE (plain data): the UI may import TRIAGE_SAMPLES to fill the
 * textarea. The senders, agencies and bookings are fictional. The draft
 * replies follow the live rules: sender's language, signed "Local Host team",
 * they ask for the missing information and never mention prices.
 */
import type { TriageResult, TriageSampleId } from '../client/triage';

export interface TriageSample {
  id: TriageSampleId;
  /** Short English label for the "Try a sample email" buttons. */
  label: string;
  /** The email exactly as a staff member would paste it. */
  email: string;
  result: TriageResult;
  /** Lower-case cues used to pick the closest sample for other emails in demo mode. */
  cues: readonly string[];
}

const SIGNATURE = 'Local Host team\ninfo@localhost.ge · +995 514 37 44 33';

export const TRIAGE_SAMPLES: readonly TriageSample[] = [
  {
    id: 'it-wine-group',
    label: 'Italian agency — 9-day wine tour, 30 pax, September',
    email: `Oggetto: Richiesta preventivo – tour enogastronomico Georgia, settembre 2027, 30 pax

Buongiorno,

sono Giulia Ferraris dell'agenzia Viaggi del Melograno di Bologna: ci siamo conosciuti alla BIT di Milano.

Stiamo preparando il catalogo autunnale e vorremmo proporre ai nostri clienti un tour del vino in Georgia di 9 giorni / 8 notti per un gruppo di 30 persone (più 1 accompagnatore), nella seconda metà di settembre 2027, in pieno periodo di vendemmia (Rtveli).

Ci interessano soprattutto:
- la Cachezia, con visite a cantine familiari e degustazioni di vini in anfora (qvevri);
- la partecipazione alla vendemmia e un corso di cucina georgiana;
- Tbilisi e Mtskheta, con una giornata a Kazbegi se possibile.

Per l'alloggio pensiamo a hotel 4 stelle a Tbilisi e a boutique hotel o strutture caratteristiche in Cachezia. È indispensabile una guida parlante italiano per tutto il tour. Alcuni partecipanti sono vegetariani.

Il nostro budget è di fascia media: i nostri clienti sono molto attenti al rapporto qualità/prezzo.

Potreste inviarci un programma di massima e una quotazione entro la fine del mese prossimo?

Cordiali saluti,
Giulia Ferraris
Ufficio Gruppi – Viaggi del Melograno
Bologna`,
    cues: ['buongiorno', 'cordiali saluti', 'vorremmo', 'preventivo', 'quotazione', 'vendemmia', 'vino', 'cantine', 'gruppo', 'agenzia'],
    result: {
      language: 'it',
      market: 'Italy',
      senderType: 'agency',
      intent: 'new-request',
      urgency: 'normal',
      urgencyReason: 'The trip is about 11 months away, but the agency wants a draft programme and quote by the end of next month for its catalogue.',
      routeTo: 'Italy desk',
      extracted: {
        travelDates: 'Second half of September 2027 (grape harvest), 9 days / 8 nights — exact dates not given',
        groupSize: '30 pax + 1 tour escort',
        countries: ['Georgia'],
        interests: [
          'Wine: family wineries and qvevri tastings in Kakheti',
          'Taking part in the grape harvest (Rtveli)',
          'Georgian cooking class',
          'Tbilisi and Mtskheta',
          'Day trip to Kazbegi if possible',
        ],
        budgetHints: 'Mid-range; their clients are very value-conscious',
        hotelCategory: '4* hotels in Tbilisi; boutique or characterful properties in Kakheti',
        specialNeeds: 'Italian-speaking guide for the whole tour; some vegetarians in the group',
      },
      summary:
        'Giulia Ferraris of Viaggi del Melograno (Bologna), met at BIT Milano, asks for a 9-day / 8-night wine and harvest tour of Georgia for 30 pax + 1 escort in the second half of September 2027, with 4* hotels in Tbilisi, boutique stays in Kakheti and an Italian-speaking guide. ' +
        'They need a draft programme and quote by the end of next month for their autumn catalogue, so the Italy desk should confirm the open details and start the programme.',
      missingInfo: [
        'Exact travel dates (or a date range) and how flexible they are',
        'Arrival and departure airports and flight times',
        'Rooming split (doubles, twins, singles) and the escort’s room',
        'Meal plan (half or full board) and how many tastings and meals to include',
        'Number of vegetarians and any other dietary needs',
        'Whether the Kazbegi day trip is a must or optional',
      ],
      draftReply: {
        language: 'it',
        subject: 'Re: Richiesta preventivo – tour enogastronomico Georgia, settembre 2027, 30 pax',
        body: `Gentile Giulia,

grazie mille per la Sua richiesta e per l'interesse verso la Georgia: è stato un piacere conoscerVi alla BIT di Milano.

Ecco le linee principali del tour, come le abbiamo capite:
- 9 giorni / 8 notti nella seconda metà di settembre 2027, in periodo di vendemmia (Rtveli);
- 30 partecipanti più 1 accompagnatore;
- Cachezia con cantine familiari, degustazioni di vini in qvevri, partecipazione alla vendemmia e corso di cucina georgiana;
- Tbilisi e Mtskheta, con una giornata a Kazbegi se il programma lo consente;
- hotel 4 stelle a Tbilisi e boutique hotel o strutture caratteristiche in Cachezia;
- guida parlante italiano per tutto il tour.

Per preparare un programma su misura e la relativa quotazione, Le chiediamo gentilmente alcune informazioni:
1. le date esatte (o un intervallo di date) e quanto sono flessibili;
2. gli aeroporti e gli orari di arrivo e di partenza;
3. la suddivisione delle camere (doppie, matrimoniali, singole) e la sistemazione dell'accompagnatore;
4. il trattamento desiderato (mezza pensione o pensione completa) e quante degustazioni e pasti includere;
5. il numero di partecipanti vegetariani ed eventuali altre esigenze alimentari;
6. se la giornata a Kazbegi è indispensabile o facoltativa.

Appena ricevuti questi dettagli, il nostro team preparerà con piacere un programma di massima e la quotazione per il Vostro catalogo.

Cordiali saluti,
${SIGNATURE}`,
      },
    },
  },
  {
    id: 'pl-family-hiking',
    label: 'Polish family — Georgia + Armenia hiking, July',
    email: `Temat: Trekking Gruzja + Armenia – lipiec 2027, rodzina 4 os.

Dzień dobry,

jesteśmy czteroosobową rodziną z Krakowa (dwoje dorosłych i dzieci w wieku 13 i 16 lat). W lipcu przyszłego roku chcielibyśmy spędzić około 12–14 dni w Gruzji i Armenii, głównie na pieszych wędrówkach.

Marzą nam się Kazbegi (np. Gergeti i dolina Truso), Swanetia oraz kilka dni w Armenii – Dilidżan i okolice jeziora Sewan. Dużo chodzimy po Tatrach, więc jednodniowe trasy po 15–20 km nie są dla nas problemem, ale nie mamy doświadczenia wysokogórskiego.

Nie potrzebujemy luksusów – pensjonaty i domy gościnne u lokalnych rodzin będą idealne. Zależy nam na kierowcy na przejazdy i przewodniku na trudniejszych odcinkach. Córka jest wegetarianką.

Czy moglibyście przygotować propozycję trasy i orientacyjny koszt? Lecimy prawdopodobnie do Kutaisi.

Pozdrawiamy serdecznie,
Anna i Tomasz Nowak`,
    cues: ['dzień dobry', 'pozdrawiamy', 'chcielibyśmy', 'jesteśmy', 'rodzin', 'dzieci', 'wędrów', 'trekking', 'hiking', 'family'],
    result: {
      language: 'pl',
      market: 'Poland',
      senderType: 'traveller',
      intent: 'new-request',
      urgency: 'low',
      urgencyReason: 'The trip is in July 2027, about nine months away, and no deadline is mentioned.',
      routeTo: 'Poland desk',
      extracted: {
        travelDates: 'July 2027, about 12–14 days — exact dates not given',
        groupSize: '2 adults + 2 children (13 and 16)',
        countries: ['Georgia', 'Armenia'],
        interests: [
          'Hiking: day hikes of 15–20 km (no high-mountain experience)',
          'Kazbegi: Gergeti and Truso Valley',
          'Svaneti',
          'Dilijan and Lake Sevan',
        ],
        budgetHints: 'No luxury needed — guesthouses and family homestays are ideal',
        hotelCategory: 'Guesthouses / family homestays',
        specialNeeds: 'Driver for transfers; guide on the harder sections; daughter is vegetarian',
      },
      summary:
        'The Nowak family from Kraków (2 adults, children aged 13 and 16) wants a 12–14-day hiking trip to Georgia and Armenia in July 2027 — Kazbegi, Svaneti, Dilijan and Lake Sevan — staying in guesthouses, with a driver and a guide on the harder sections. ' +
        'They ask for a route proposal and an indicative cost and will probably fly into Kutaisi, so the Poland desk should collect the missing details and then prepare a proposal and quote.',
      missingInfo: [
        'Exact travel dates and the final number of days',
        'Flights: is the arrival in Kutaisi confirmed, and which airport and times for departure',
        'Balance of hiking days vs. rest and sightseeing days, and comfortable daily ascent',
        'Guide on every hiking day or only on the harder routes',
        'Accommodation preference in towns (guesthouse or small hotel) and room setup for four',
        'Any other dietary or health needs',
      ],
      draftReply: {
        language: 'pl',
        subject: 'Re: Trekking Gruzja + Armenia – lipiec 2027, rodzina 4 os.',
        body: `Szanowni Państwo,

serdecznie dziękujemy za wiadomość i za zainteresowanie Gruzją i Armenią!

Z przyjemnością przygotujemy dla Państwa propozycję trasy. Tak rozumiemy Państwa plany:
- lipiec 2027, około 12–14 dni, prawdopodobnie z przylotem do Kutaisi;
- 2 osoby dorosłe i dzieci w wieku 13 i 16 lat;
- piesze wędrówki: Kazbegi (Gergeti, dolina Truso), Swanetia, a w Armenii Dilidżan i okolice jeziora Sewan;
- noclegi w pensjonatach i domach gościnnych u lokalnych rodzin;
- kierowca na przejazdy i przewodnik na trudniejszych odcinkach; jedna osoba jest wegetarianką.

Abyśmy mogli przygotować dopasowany plan i wycenę, prosimy jeszcze o kilka informacji:
1. Dokładne daty lub przedział dat oraz ostateczna liczba dni.
2. Szczegóły lotów: czy przylot do Kutaisi jest już pewny oraz z którego lotniska i o której godzinie planują Państwo powrót.
3. Ile dni chcieliby Państwo przeznaczyć na wędrówki, a ile na odpoczynek i zwiedzanie, oraz jakie przewyższenia dzienne są dla Państwa komfortowe.
4. Czy przewodnik ma towarzyszyć Państwu każdego dnia wędrówek, czy tylko na trudniejszych trasach.
5. Preferencje co do noclegów w miastach (pensjonat czy mały hotel) oraz układu pokoi dla czterech osób.
6. Czy są jeszcze inne potrzeby dietetyczne lub zdrowotne, o których powinniśmy wiedzieć.

Po otrzymaniu tych informacji nasz zespół przygotuje propozycję trasy wraz z wyceną. Wędrówki w górach planujemy zawsze z doświadczonymi lokalnymi przewodnikami i z zapasem na zmienną pogodę, a przejazd między Gruzją a Armenią organizujemy w całości.

Serdecznie pozdrawiamy,
${SIGNATURE}`,
      },
    },
  },
  {
    id: 'de-transfer-complaint',
    label: 'German agency — complaint about a late airport transfer',
    email: `Betreff: Beschwerde – verspäteter Flughafentransfer, Gruppe „Kaukasus Herbst“ (Ankunft 8. Oktober)

Sehr geehrte Damen und Herren,

leider muss ich mich heute mit einer Beschwerde an Sie wenden. Unsere Gruppe „Kaukasus Herbst“ (22 Gäste, Reiseleiterin Frau Petra Lang) ist am 8. Oktober um 03:40 Uhr in Tiflis gelandet. Der vereinbarte Transferbus war nicht da; die Gruppe musste über eine Stunde in der Ankunftshalle warten, bis ein Fahrzeug kam. Auf mehrfache Anrufe unserer Reiseleiterin bei der Notfallnummer kam zunächst keine Antwort.

Viele unserer Gäste sind über 70 Jahre alt, entsprechend groß war der Ärger nach dem Nachtflug. Mehrere Gäste haben sich bereits bei uns beschwert.

Die Gruppe ist noch bis zum 15. Oktober in Georgien unterwegs. Wir bitten Sie um:
1. eine schriftliche Stellungnahme, wie es dazu kommen konnte,
2. die Zusicherung, dass alle weiteren Transfers – insbesondere der Abflugtransfer am 15. Oktober um 05:10 Uhr – zuverlässig klappen,
3. einen Vorschlag zur Wiedergutmachung gegenüber den Gästen.

Bitte melden Sie sich bis morgen bei uns.

Mit freundlichen Grüßen
Markus Brandt
Gruppenreisen
Bergwind Reisen GmbH, Freiburg`,
    cues: ['sehr geehrte', 'mit freundlichen', 'beschwerde', 'leider', 'verspät', 'transfer', 'complaint', 'reclamo', 'reklamacja', 'skarga', 'late', 'delay', 'ritardo'],
    result: {
      language: 'de',
      market: 'Germany',
      senderType: 'agency',
      intent: 'complaint',
      urgency: 'high',
      urgencyReason: 'The group is still travelling in Georgia until 15 October with an early departure transfer ahead, and the agency expects a reply by tomorrow.',
      routeTo: 'Management',
      extracted: {
        travelDates: 'Arrived in Tbilisi on 8 October at 03:40; in Georgia until 15 October (departure 05:10)',
        groupSize: '22 guests + tour leader (Petra Lang)',
        countries: ['Georgia'],
        specialNeeds: 'Many guests are over 70',
      },
      summary:
        'Markus Brandt of Bergwind Reisen (Freiburg) complains that the arrival transfer for their group "Kaukasus Herbst" (22 guests, many over 70) was missing at Tbilisi airport on 8 October at 03:40, the group waited over an hour and the emergency number did not answer at first. ' +
        'He wants a written explanation, assurance that the remaining transfers — especially the 05:10 departure on 15 October — will run smoothly, and a goodwill proposal for the guests, with a reply by tomorrow.',
      missingInfo: [
        'Booking or file reference of the group',
        'Current mobile number of the tour leader, Petra Lang',
      ],
      draftReply: {
        language: 'de',
        subject: 'Re: Beschwerde – verspäteter Flughafentransfer, Gruppe „Kaukasus Herbst“ (Ankunft 8. Oktober)',
        body: `Sehr geehrter Herr Brandt,

vielen Dank für Ihre offene Nachricht. Es tut uns sehr leid, dass Ihre Gruppe „Kaukasus Herbst“ nach der Landung am 8. Oktober um 03:40 Uhr über eine Stunde auf den Transfer warten musste und unsere Notfallnummer nicht sofort erreichbar war. Wir verstehen gut, wie belastend das nach einem Nachtflug und gerade für ältere Gäste war.

Wir klären den Vorfall derzeit mit allen Beteiligten. Unsere Geschäftsleitung wird Ihnen eine schriftliche Stellungnahme schicken und sich zu Ihren Fragen – auch zu einer Geste gegenüber den Gästen – so schnell wie möglich persönlich bei Ihnen melden.

Für den weiteren Verlauf der Reise prüfen wir alle Transfers noch einmal, insbesondere den Abflugtransfer am 15. Oktober, und stimmen die Abholzeiten direkt mit Frau Lang ab. Damit das reibungslos klappt, bitten wir Sie um:
1. die Buchungs- bzw. Vorgangsnummer der Gruppe,
2. die aktuelle Mobilnummer von Frau Lang.

Nochmals unsere aufrichtige Entschuldigung an Sie, Frau Lang und Ihre Gäste.

Mit freundlichen Grüßen
${SIGNATURE}`,
      },
    },
  },
];

/** Lightweight list for "Try a sample email" buttons. */
export const TRIAGE_SAMPLE_EMAILS = TRIAGE_SAMPLES.map(({ id, label, email }) => ({ id, label, email }));

const normalise = (s: string) => s.replace(/\r\n?/g, '\n').replace(/\s+/g, ' ').trim();

/**
 * Demo mode: the sample whose text was posted (exact = true), else the sample
 * named by `sampleId`, else the closest by language/complaint cues (exact = false).
 */
export function pickTriageSample(email: string, sampleId: TriageSampleId | null): { sample: TriageSample; exact: boolean } {
  const n = normalise(email);
  const same = TRIAGE_SAMPLES.find((s) => normalise(s.email) === n);
  if (same) return { sample: same, exact: true };
  const named = sampleId ? TRIAGE_SAMPLES.find((s) => s.id === sampleId) : undefined;
  if (named) return { sample: named, exact: false };
  const lower = n.toLowerCase();
  let best = TRIAGE_SAMPLES[0] as TriageSample;
  let bestScore = 0;
  for (const s of TRIAGE_SAMPLES) {
    const score = s.cues.reduce((sum, cue) => (lower.includes(cue) ? sum + 1 : sum), 0);
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return { sample: best, exact: false };
}
