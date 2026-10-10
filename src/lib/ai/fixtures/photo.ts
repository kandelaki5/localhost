/**
 * Demo-mode fixtures for Photo Match (no ANTHROPIC_API_KEY).
 *
 * Stored in the RAW structured-output format Claude returns
 * (PhotoModelOutput), so /api/photo-match runs demo and live answers through
 * the same normalisation and both modes have exactly the same response shape.
 *
 * Grounded only in the knowledge base (src/lib/ai/knowledge.ts): no prices,
 * schedules, awards or claims about real people. English only; the demo
 * notice says so for other locales.
 */
import type { InspirationId, PhotoModelOutput } from '../client/photo';
import type { Locale } from '../types';

/** Precomputed matches for the three inspiration photos in src/assets/inspiration/. */
export const PHOTO_SAMPLE_FIXTURES: Readonly<Record<InspirationId, PhotoModelOutput>> = {
  'tuscany-vineyard': {
    suitable: true,
    message: '',
    whatISee:
      'Young vines in neat rows run down to a freshly ploughed field, with olive groves, dark cypresses and a hilltop village under a big spring sky.',
    mood: 'Golden, unhurried, sun-warmed',
    matches: [
      {
        placeId: 'tsinandali',
        experienceId: 'wine',
        title: 'Vine rows of Kakheti',
        why:
          "Kakheti is Georgia's main wine region: vineyards roll across the Alazani Valley with the Caucasus range on the horizon, and family cellars still make wine in clay qvevri — a method on UNESCO's intangible-heritage list.",
      },
      {
        placeId: 'sighnaghi',
        experienceId: 'leisure',
        title: 'A hill town above the valley',
        why:
          'Like a hilltop village in your photo, Sighnaghi looks out over the Alazani Valley — made for slow mornings, long lunches and sunset walks, with Bodbe Monastery just nearby.',
      },
      {
        placeId: 'areni',
        experienceId: 'wine',
        title: 'Ancient vintages of Vayots Dzor',
        why:
          "Across the border in Armenia, Areni village is the heart of the Vayots Dzor wine region and gives its name to the Areni grape; the nearby Areni-1 cave is home to the oldest known winery.",
      },
    ],
    tip:
      'Kakheti is lovely from spring to autumn. For the full wine experience, come for Rtveli, the grape harvest, which typically runs from mid-September to October — the Local Host team confirms the timing for your dates.',
  },

  'dolomites-valley': {
    suitable: true,
    message: '',
    whatISee:
      'A rocky, grassy ridge drops into a deep green valley; beyond it, layer after layer of ridges lead to jagged limestone peaks under towering summer clouds.',
    mood: 'Wild, fresh and wide open',
    matches: [
      {
        placeId: 'juta-chaukhi',
        experienceId: 'trekking',
        title: 'Beneath the Chaukhi spires',
        why:
          'From Juta, near Kazbegi, trails climb through alpine meadows towards the jagged Chaukhi massif — the same mix of green slopes and sharp rock walls as your photo, in the Greater Caucasus.',
      },
      {
        placeId: 'ushguli',
        experienceId: 'culture',
        title: 'Tower villages of Upper Svaneti',
        why:
          "In Upper Svaneti, medieval Svan defensive towers (UNESCO) stand in high valleys beneath Shkhara, at 5,193 m Georgia's highest peak — mountain drama with centuries of culture.",
      },
      {
        placeId: 'tusheti',
        experienceId: 'gastronomy',
        title: 'Remote valleys of Tusheti',
        why:
          "For the feeling of valleys far from everything: Tusheti's highland villages around Omalo are reached by a seasonal mountain road over the Abano Pass, and its mountain cooking is the reward after a day outdoors.",
      },
    ],
    tip:
      'High-mountain trails are typically open from mid-June to late September (snow can linger on passes into June), and we always walk them with experienced local guides. The road to Tusheti is usually open from about June to early October, weather permitting.',
  },

  'cappadocia-valley': {
    suitable: true,
    message: '',
    whatISee:
      'A town of cave houses and carved rock cones — "fairy chimneys" — glows in warm evening light, with a valley of soft, pale stone beyond.',
    mood: 'Sun-baked, ancient, otherworldly',
    matches: [
      {
        placeId: 'vardzia',
        experienceId: 'culture',
        title: 'The cave city of Vardzia',
        why:
          "Vardzia, the 12th-century cave monastery cut into a cliff face in Samtskhe-Javakheti, has the same honeycomb of rock-cut rooms as the cave houses in your photo.",
      },
      {
        placeId: 'uplistsikhe',
        experienceId: 'culture',
        title: 'A town hewn from rock',
        why:
          'Uplistsikhe is an ancient rock-hewn town in Shida Kartli where halls, streets and dwellings were carved straight into the stone — a walk through layers of history.',
      },
      {
        placeId: 'david-gareja',
        experienceId: 'pilgrim',
        title: 'Cave monasteries in the semi-desert',
        why:
          "On the edge of Georgia's semi-desert, the David Gareja cave monasteries are carved into rocky ridges — a place of pilgrimage with wide, sun-bleached landscapes that echo your photo.",
      },
    ],
    tip:
      'April–June and September–October are the most comfortable months for cave sites; summer middays can be hot. The last part of the road to David Gareja is rough, so we plan it as a relaxed day trip from Tbilisi.',
  },
};

/**
 * Demo answer for a visitor's OWN photo: it is NOT analysed. A generic,
 * clearly labelled sample built from the "places we love" in Local Host's
 * Sustainability Policy.
 */
export const PHOTO_GENERIC_FIXTURE: PhotoModelOutput = {
  suitable: true,
  message: '',
  whatISee:
    'Sample result: in demo mode your photo is not analysed. Here are three places our team especially loves, to show what Photo Match returns.',
  mood: 'Sample — three places we love',
  matches: [
    {
      placeId: 'mestia',
      experienceId: 'trekking',
      title: 'The mountains of Svaneti',
      why:
        "Mestia is the gateway to Upper Svaneti: medieval Svan towers (UNESCO), glaciers and the multi-day trek to Ushguli beneath Shkhara, Georgia's highest peak.",
    },
    {
      placeId: 'telavi',
      experienceId: 'wine',
      title: 'The Caucasus seen from Telavi',
      why:
        "Telavi, in Georgia's main wine region of Kakheti, looks across the Alazani Valley to the Caucasus range — a view our team loves, with family cellars and qvevri wine close by.",
    },
    {
      placeId: 'martvili-canyon',
      experienceId: 'leisure',
      title: 'The beauty of Martvili Canyon',
      why:
        'An easy nature day in Samegrelo, western Georgia: the beauty of Martvili Canyon is named in our own Sustainability Policy, and the region is home to spicy, walnut-rich Megrelian cuisine.',
    },
  ],
  tip:
    'Tell us which of these feels closest to your photo and the Local Host team will shape a trip around it — write to info@localhost.ge.',
};

/** Labels for demo answers (drafted — native review pending). */
export const PHOTO_DEMO_NOTICES: Readonly<Record<Locale, { sample: string; generic: string }>> = {
  en: {
    sample: 'Demo — sample answer prepared in advance for this inspiration photo.',
    generic:
      'Demo — your photo was not analysed. This is a generic sample result; with the AI connected, Photo Match reads your own photo.',
  },
  ka: {
    sample: 'დემო — ამ ფოტოსთვის წინასწარ მომზადებული სანიმუშო პასუხი (ინგლისურად).',
    generic:
      'დემო — თქვენი ფოტო არ გაანალიზებულა. ეს ზოგადი სანიმუშო შედეგია (ინგლისურად); AI-ის ჩართვის შემდეგ Photo Match თქვენს ფოტოს გააანალიზებს.',
  },
  pl: {
    sample: 'Demo — przykładowa odpowiedź przygotowana wcześniej dla tego zdjęcia (po angielsku).',
    generic:
      'Demo — Twoje zdjęcie nie zostało przeanalizowane. To ogólny przykładowy wynik (po angielsku); po podłączeniu AI Photo Match przeanalizuje Twoje zdjęcie.',
  },
  it: {
    sample: 'Demo — risposta di esempio preparata in anticipo per questa foto (in inglese).',
    generic:
      'Demo — la tua foto non è stata analizzata. Questo è un risultato di esempio generico (in inglese); con l’AI collegata, Photo Match analizza la tua foto.',
  },
  de: {
    sample: 'Demo — vorab vorbereitete Beispielantwort für dieses Inspirationsfoto (auf Englisch).',
    generic:
      'Demo — Ihr Foto wurde nicht analysiert. Dies ist ein allgemeines Beispielergebnis (auf Englisch); mit aktivierter KI liest Photo Match Ihr eigenes Foto.',
  },
};
