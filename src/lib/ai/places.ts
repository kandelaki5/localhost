/**
 * Notable places across Georgia, Armenia and Azerbaijan, used by AI features
 * (itinerary maps, "where is this?", structured outputs that reference
 * places by id) and by the knowledge base.
 *
 * Browser-safe (no runtime dependencies besides types).
 *
 * Coordinates: WGS84, rounded to ~0.01° (≈1 km) — good for an overview map,
 * NOT for navigation. Valley/region entries (Truso, Tusheti, Mountain Adjara,
 * Juta) point at a representative spot. Names: en/ka/pl/it/de, using the
 * usual exonym in each language where one exists (de "Tiflis", pl "Erywań").
 * Native speakers should review the ka/pl/it/de names (see CONTENT-TODO).
 */
import {
  PLACE_IDS,
  type CountryCode,
  type ExperienceId,
  type Locale,
  type Place,
  type PlaceId,
  type PlaceType,
} from './types';

export type { Place, PlaceId };

type PlaceData = Omit<Place, 'id'>;

/** Keyed by id, so the compiler guarantees exactly one entry per PLACE_IDS member. */
const DATA: Record<PlaceId, PlaceData> = {
  // ------------------------------------------------------------------ Georgia
  tbilisi: {
    country: 'GE', region: 'Tbilisi', lat: 41.69, lon: 44.80, type: 'city',
    names: { en: 'Tbilisi', ka: 'თბილისი', pl: 'Tbilisi', it: 'Tbilisi', de: 'Tiflis' },
    experiences: ['culture', 'gastronomy', 'wine', 'leisure'], photo: 'tbilisi-1.jpg',
  },
  mtskheta: {
    country: 'GE', region: 'Mtskheta-Mtianeti', lat: 41.84, lon: 44.72, type: 'heritage',
    names: { en: 'Mtskheta', ka: 'მცხეთა', pl: 'Mccheta', it: 'Mtskheta', de: 'Mzcheta' },
    experiences: ['culture', 'pilgrim'], photo: 'mtskheta.jpg',
  },
  uplistsikhe: {
    country: 'GE', region: 'Shida Kartli', lat: 41.97, lon: 44.21, type: 'heritage',
    names: { en: 'Uplistsikhe', ka: 'უფლისციხე', pl: 'Upliscyche', it: 'Uplistsikhe', de: 'Uplisziche' },
    experiences: ['culture'],
  },
  ananuri: {
    country: 'GE', region: 'Mtskheta-Mtianeti', lat: 42.16, lon: 44.70, type: 'heritage',
    names: {
      en: 'Ananuri Fortress', ka: 'ანანურის ციხე', pl: 'Twierdza Ananuri',
      it: 'Fortezza di Ananuri', de: 'Festung Ananuri',
    },
    experiences: ['culture', 'pilgrim'], photo: 'ananuri.jpg',
  },
  gudauri: {
    country: 'GE', region: 'Mtskheta-Mtianeti', lat: 42.48, lon: 44.48, type: 'resort',
    names: { en: 'Gudauri', ka: 'გუდაური', pl: 'Gudauri', it: 'Gudauri', de: 'Gudauri' },
    experiences: ['leisure', 'trekking'], photo: 'gudauri.jpg',
  },
  stepantsminda: {
    country: 'GE', region: 'Mtskheta-Mtianeti (Khevi)', lat: 42.66, lon: 44.64, type: 'village',
    names: {
      en: 'Stepantsminda (Kazbegi)', ka: 'სტეფანწმინდა (ყაზბეგი)', pl: 'Stepancminda (Kazbegi)',
      it: 'Stepantsminda (Kazbegi)', de: 'Stepanzminda (Kasbegi)',
    },
    experiences: ['trekking', 'culture', 'leisure'], photo: 'kazbegi.jpg',
  },
  gergeti: {
    country: 'GE', region: 'Mtskheta-Mtianeti (Khevi)', lat: 42.66, lon: 44.62, type: 'monastery',
    names: {
      en: 'Gergeti Trinity Church', ka: 'გერგეტის სამება', pl: 'Cerkiew Świętej Trójcy w Gergeti',
      it: 'Chiesa della Trinità di Gergeti', de: 'Dreifaltigkeitskirche Gergeti',
    },
    experiences: ['pilgrim', 'trekking', 'culture'], photo: 'kazbegi-gergeti.jpg',
  },
  truso: {
    country: 'GE', region: 'Mtskheta-Mtianeti (Khevi)', lat: 42.58, lon: 44.44, type: 'nature',
    names: { en: 'Truso Valley', ka: 'თრუსოს ხეობა', pl: 'Dolina Truso', it: 'Valle di Truso', de: 'Truso-Tal' },
    experiences: ['trekking'], photo: 'truso-valley.jpg',
  },
  'juta-chaukhi': {
    country: 'GE', region: 'Mtskheta-Mtianeti (Khevi)', lat: 42.58, lon: 44.75, type: 'mountain',
    names: {
      en: 'Juta & Chaukhi Massif', ka: 'ჯუთა და ჭაუხის მასივი', pl: 'Dżuta i masyw Czauchi',
      it: 'Juta e massiccio del Chaukhi', de: 'Dschuta und Tschauchi-Massiv',
    },
    experiences: ['trekking'], photo: 'chaukhi-valley.jpg',
  },
  shatili: {
    country: 'GE', region: 'Mtskheta-Mtianeti (Khevsureti)', lat: 42.66, lon: 45.16, type: 'village',
    names: { en: 'Shatili', ka: 'შატილი', pl: 'Szatili', it: 'Shatili', de: 'Schatili' },
    experiences: ['trekking', 'culture'], photo: 'shatili.jpg',
  },
  tusheti: {
    country: 'GE', region: 'Kakheti (Tusheti)', lat: 42.37, lon: 45.63, type: 'village',
    names: {
      en: 'Tusheti (Omalo)', ka: 'თუშეთი (ომალო)', pl: 'Tuszetia (Omalo)',
      it: 'Tuscezia (Omalo)', de: 'Tuschetien (Omalo)',
    },
    experiences: ['trekking', 'culture', 'gastronomy'], photo: 'tusheti.jpg',
  },
  jokolo: {
    country: 'GE', region: 'Kakheti (Pankisi Gorge)', lat: 42.12, lon: 45.28, type: 'village',
    names: {
      en: 'Jokolo (Pankisi Gorge)', ka: 'ჯოყოლო (პანკისის ხეობა)', pl: 'Dżokolo (wąwóz Pankisi)',
      it: 'Jokolo (gola del Pankisi)', de: 'Dschokolo (Pankissi-Tal)',
    },
    experiences: ['culture', 'gastronomy', 'trekking'],
  },
  telavi: {
    country: 'GE', region: 'Kakheti', lat: 41.92, lon: 45.47, type: 'city',
    names: { en: 'Telavi', ka: 'თელავი', pl: 'Telawi', it: 'Telavi', de: 'Telawi' },
    experiences: ['wine', 'culture', 'gastronomy'],
  },
  tsinandali: {
    country: 'GE', region: 'Kakheti', lat: 41.89, lon: 45.57, type: 'wine',
    names: { en: 'Tsinandali', ka: 'წინანდალი', pl: 'Cinandali', it: 'Tsinandali', de: 'Zinandali' },
    experiences: ['wine', 'culture'],
  },
  kvareli: {
    country: 'GE', region: 'Kakheti', lat: 41.95, lon: 45.81, type: 'wine',
    names: { en: 'Kvareli', ka: 'ყვარელი', pl: 'Kwareli', it: 'Kvareli', de: 'Kwareli' },
    experiences: ['wine', 'gastronomy', 'culture'],
  },
  lopota: {
    country: 'GE', region: 'Kakheti', lat: 42.03, lon: 45.57, type: 'resort',
    names: { en: 'Lopota Lake', ka: 'ლოპოტას ტბა', pl: 'Jezioro Lopota', it: 'Lago Lopota', de: 'Lopota-See' },
    experiences: ['leisure', 'wine'], photo: 'lopota-lake.jpg',
  },
  sighnaghi: {
    country: 'GE', region: 'Kakheti', lat: 41.62, lon: 45.92, type: 'city',
    names: { en: 'Sighnaghi', ka: 'სიღნაღი', pl: 'Signagi', it: 'Sighnaghi', de: 'Signagi' },
    experiences: ['wine', 'culture', 'gastronomy', 'leisure'], photo: 'sighnaghi.jpg',
  },
  bodbe: {
    country: 'GE', region: 'Kakheti', lat: 41.61, lon: 45.93, type: 'monastery',
    names: {
      en: 'Bodbe Monastery', ka: 'ბოდბის მონასტერი', pl: 'Monaster Bodbe',
      it: 'Monastero di Bodbe', de: 'Kloster Bodbe',
    },
    experiences: ['pilgrim', 'culture'],
  },
  'david-gareja': {
    country: 'GE', region: 'Kakheti', lat: 41.45, lon: 45.38, type: 'monastery',
    names: {
      en: 'David Gareja Monastery', ka: 'დავითგარეჯის მონასტერი', pl: 'Klasztor Dawit Garedża',
      it: 'Monastero di David Gareja', de: 'Kloster Dawit Garedscha',
    },
    experiences: ['pilgrim', 'culture', 'trekking'], photo: 'david-gareja.jpg',
  },
  kutaisi: {
    country: 'GE', region: 'Imereti', lat: 42.27, lon: 42.70, type: 'city',
    names: { en: 'Kutaisi', ka: 'ქუთაისი', pl: 'Kutaisi', it: 'Kutaisi', de: 'Kutaissi' },
    experiences: ['culture', 'gastronomy', 'pilgrim'], photo: 'bagrati.jpg',
  },
  gelati: {
    country: 'GE', region: 'Imereti', lat: 42.29, lon: 42.77, type: 'monastery',
    names: {
      en: 'Gelati Monastery', ka: 'გელათის მონასტერი', pl: 'Monaster Gelati',
      it: 'Monastero di Gelati', de: 'Kloster Gelati',
    },
    experiences: ['culture', 'pilgrim'],
  },
  'prometheus-cave': {
    country: 'GE', region: 'Imereti', lat: 42.38, lon: 42.60, type: 'nature',
    names: {
      en: 'Prometheus Cave', ka: 'პრომეთეს მღვიმე', pl: 'Jaskinia Prometeusza',
      it: 'Grotta di Prometeo', de: 'Prometheus-Höhle',
    },
    experiences: ['leisure'], photo: 'prometheus-cave.jpg',
  },
  'okatse-canyon': {
    country: 'GE', region: 'Imereti', lat: 42.45, lon: 42.55, type: 'nature',
    names: {
      en: 'Okatse Canyon', ka: 'ოკაცეს კანიონი', pl: 'Kanion Okace',
      it: 'Canyon di Okatse', de: 'Okatse-Schlucht',
    },
    experiences: ['leisure', 'trekking'], photo: 'okatse-canyon.jpg',
  },
  'martvili-canyon': {
    country: 'GE', region: 'Samegrelo', lat: 42.46, lon: 42.38, type: 'nature',
    names: {
      en: 'Martvili Canyon', ka: 'მარტვილის კანიონი', pl: 'Kanion Martwili',
      it: 'Canyon di Martvili', de: 'Martwili-Schlucht',
    },
    experiences: ['leisure', 'trekking'],
  },
  'katskhi-pillar': {
    country: 'GE', region: 'Imereti', lat: 42.29, lon: 43.22, type: 'monastery',
    names: {
      en: 'Katskhi Pillar', ka: 'კაცხის სვეტი', pl: 'Kolumna Kacchi',
      it: 'Colonna di Katskhi', de: 'Kazchi-Säule',
    },
    experiences: ['pilgrim', 'culture'], photo: 'katskhi-pillar.jpg',
  },
  borjomi: {
    country: 'GE', region: 'Samtskhe-Javakheti', lat: 41.84, lon: 43.38, type: 'resort',
    names: { en: 'Borjomi', ka: 'ბორჯომი', pl: 'Bordżomi', it: 'Borjomi', de: 'Bordschomi' },
    experiences: ['leisure', 'trekking'], photo: 'borjomi.jpg',
  },
  akhaltsikhe: {
    country: 'GE', region: 'Samtskhe-Javakheti', lat: 41.64, lon: 42.98, type: 'heritage',
    names: {
      en: 'Akhaltsikhe (Rabati Castle)', ka: 'ახალციხე (რაბათის ციხე)', pl: 'Achalciche (twierdza Rabati)',
      it: 'Akhaltsikhe (fortezza di Rabati)', de: 'Achalziche (Festung Rabati)',
    },
    experiences: ['culture'], photo: 'rabati-castle.jpg',
  },
  vardzia: {
    country: 'GE', region: 'Samtskhe-Javakheti', lat: 41.38, lon: 43.28, type: 'monastery',
    names: { en: 'Vardzia', ka: 'ვარძია', pl: 'Wardzia', it: 'Vardzia', de: 'Wardsia' },
    experiences: ['culture', 'pilgrim'], photo: 'vardzia.jpg',
  },
  'paravani-lake': {
    country: 'GE', region: 'Samtskhe-Javakheti', lat: 41.45, lon: 43.80, type: 'nature',
    names: {
      en: 'Paravani Lake', ka: 'ფარავნის ტბა', pl: 'Jezioro Parawani',
      it: 'Lago Paravani', de: 'Parawani-See',
    },
    experiences: ['leisure', 'trekking'],
  },
  batumi: {
    country: 'GE', region: 'Adjara', lat: 41.64, lon: 41.64, type: 'city',
    names: { en: 'Batumi', ka: 'ბათუმი', pl: 'Batumi', it: 'Batumi', de: 'Batumi' },
    experiences: ['leisure', 'gastronomy', 'culture'], photo: 'batumi.jpg',
  },
  'adjara-mountains': {
    country: 'GE', region: 'Adjara', lat: 41.64, lon: 42.31, type: 'village',
    names: {
      en: 'Mountain Adjara (Khulo)', ka: 'მთიანი აჭარა (ხულო)', pl: 'Górska Adżaria (Chulo)',
      it: 'Agiaria montana (Khulo)', de: 'Bergland Adschariens (Chulo)',
    },
    experiences: ['trekking', 'gastronomy', 'culture'], photo: 'adjara-2.jpg',
  },
  mestia: {
    country: 'GE', region: 'Svaneti', lat: 43.05, lon: 42.73, type: 'village',
    names: { en: 'Mestia', ka: 'მესტია', pl: 'Mestia', it: 'Mestia', de: 'Mestia' },
    experiences: ['trekking', 'culture'], photo: 'mestia.jpg',
  },
  ushguli: {
    country: 'GE', region: 'Svaneti', lat: 42.92, lon: 43.01, type: 'village',
    names: { en: 'Ushguli', ka: 'უშგული', pl: 'Uszguli', it: 'Ushguli', de: 'Uschguli' },
    experiences: ['trekking', 'culture'], photo: 'svaneti-1.jpg',
  },

  // ------------------------------------------------------------------ Armenia
  yerevan: {
    country: 'AM', region: 'Yerevan', lat: 40.18, lon: 44.51, type: 'city',
    names: { en: 'Yerevan', ka: 'ერევანი', pl: 'Erywań', it: 'Erevan', de: 'Jerewan' },
    experiences: ['culture', 'gastronomy', 'wine', 'leisure'],
  },
  garni: {
    country: 'AM', region: 'Kotayk', lat: 40.11, lon: 44.73, type: 'heritage',
    names: {
      en: 'Garni Temple', ka: 'გარნის ტაძარი', pl: 'Świątynia Garni',
      it: 'Tempio di Garni', de: 'Tempel von Garni',
    },
    experiences: ['culture'],
  },
  geghard: {
    country: 'AM', region: 'Kotayk', lat: 40.14, lon: 44.82, type: 'monastery',
    names: {
      en: 'Geghard Monastery', ka: 'გეღარდის მონასტერი', pl: 'Klasztor Geghard',
      it: 'Monastero di Geghard', de: 'Kloster Geghard',
    },
    experiences: ['pilgrim', 'culture'],
  },
  'khor-virap': {
    country: 'AM', region: 'Ararat', lat: 39.88, lon: 44.58, type: 'monastery',
    names: { en: 'Khor Virap', ka: 'ხორ ვირაპი', pl: 'Chor Wirap', it: 'Khor Virap', de: 'Chor Virap' },
    experiences: ['pilgrim', 'culture'],
  },
  areni: {
    country: 'AM', region: 'Vayots Dzor', lat: 39.72, lon: 45.18, type: 'wine',
    names: { en: 'Areni', ka: 'არენი', pl: 'Areni', it: 'Areni', de: 'Areni' },
    experiences: ['wine', 'culture', 'gastronomy'],
  },
  noravank: {
    country: 'AM', region: 'Vayots Dzor', lat: 39.68, lon: 45.23, type: 'monastery',
    names: {
      en: 'Noravank Monastery', ka: 'ნორავანქის მონასტერი', pl: 'Klasztor Norawank',
      it: 'Monastero di Noravank', de: 'Kloster Norawank',
    },
    experiences: ['pilgrim', 'culture'],
  },
  tatev: {
    country: 'AM', region: 'Syunik', lat: 39.38, lon: 46.25, type: 'monastery',
    names: {
      en: 'Tatev Monastery', ka: 'ტათევის მონასტერი', pl: 'Klasztor Tatew',
      it: 'Monastero di Tatev', de: 'Kloster Tatew',
    },
    experiences: ['pilgrim', 'culture', 'trekking'],
  },
  sevan: {
    country: 'AM', region: 'Gegharkunik', lat: 40.56, lon: 45.01, type: 'nature',
    names: { en: 'Lake Sevan', ka: 'სევანის ტბა', pl: 'Jezioro Sewan', it: 'Lago Sevan', de: 'Sewansee' },
    experiences: ['leisure', 'pilgrim', 'gastronomy'],
  },
  dilijan: {
    country: 'AM', region: 'Tavush', lat: 40.74, lon: 44.86, type: 'resort',
    names: { en: 'Dilijan', ka: 'დილიჟანი', pl: 'Dilidżan', it: 'Dilijan', de: 'Dilidschan' },
    experiences: ['trekking', 'leisure', 'culture'],
  },

  // --------------------------------------------------------------- Azerbaijan
  baku: {
    country: 'AZ', region: 'Baku (Absheron)', lat: 40.37, lon: 49.84, type: 'city',
    names: { en: 'Baku', ka: 'ბაქო', pl: 'Baku', it: 'Baku', de: 'Baku' },
    experiences: ['culture', 'gastronomy', 'leisure'],
  },
  gobustan: {
    country: 'AZ', region: 'Gobustan', lat: 40.11, lon: 49.38, type: 'heritage',
    names: {
      en: 'Gobustan Rock Art', ka: 'ყობუსტანის კლდის მხატვრობა', pl: 'Petroglify Gobustanu',
      it: 'Arte rupestre del Gobustan', de: 'Felsbilder von Gobustan',
    },
    experiences: ['culture'],
  },
  'yanar-dag': {
    country: 'AZ', region: 'Absheron', lat: 40.50, lon: 49.89, type: 'nature',
    names: {
      en: 'Yanar Dag (Absheron)', ka: 'იანარ დაღი (აფშერონი)', pl: 'Yanar Dağ (Półwysep Apszeroński)',
      it: 'Yanar Dag (penisola di Absheron)', de: 'Yanar Dağ (Halbinsel Abşeron)',
    },
    experiences: ['culture', 'leisure'],
  },
  shamakhi: {
    country: 'AZ', region: 'Shirvan', lat: 40.63, lon: 48.64, type: 'city',
    names: { en: 'Shamakhi', ka: 'შამახი', pl: 'Szemacha', it: 'Shamakhi', de: 'Schamachi' },
    experiences: ['wine', 'culture', 'pilgrim'],
  },
  lahij: {
    country: 'AZ', region: 'Ismayilli', lat: 40.85, lon: 48.39, type: 'village',
    names: { en: 'Lahij', ka: 'ლაჰიჯი', pl: 'Lahıc', it: 'Lahıc', de: 'Lahıc' },
    experiences: ['culture', 'trekking'],
  },
  gabala: {
    country: 'AZ', region: 'Gabala', lat: 40.98, lon: 47.85, type: 'resort',
    names: { en: 'Gabala', ka: 'ყაბალა', pl: 'Gabala', it: 'Gabala', de: 'Gabala' },
    experiences: ['leisure', 'trekking'],
  },
  sheki: {
    country: 'AZ', region: 'Shaki-Zagatala', lat: 41.20, lon: 47.19, type: 'city',
    names: { en: 'Sheki', ka: 'შექი', pl: 'Szeki', it: 'Shaki', de: 'Scheki' },
    experiences: ['culture', 'gastronomy', 'pilgrim'],
  },
  khinalug: {
    country: 'AZ', region: 'Quba', lat: 41.18, lon: 48.13, type: 'village',
    names: { en: 'Khinalug', ka: 'ხინალუღი', pl: 'Chinalug', it: 'Khinalug', de: 'Chinalug' },
    experiences: ['trekking', 'culture'],
  },
  ganja: {
    country: 'AZ', region: 'Ganja', lat: 40.68, lon: 46.36, type: 'city',
    names: { en: 'Ganja', ka: 'განჯა', pl: 'Gandża', it: 'Ganja', de: 'Gandscha' },
    experiences: ['culture', 'wine'],
  },
};

/** All places, in PLACE_IDS order (Georgia → Armenia → Azerbaijan). */
export const PLACES: readonly Place[] = PLACE_IDS.map((id) => ({ id, ...DATA[id] }));

const BY_ID = new Map<string, Place>(PLACES.map((p) => [p.id, p]));

/** Place by id, or undefined for unknown ids (safe for untrusted input). */
export function findPlace(id: string): Place | undefined {
  return BY_ID.get(id);
}

/** Localised display name. */
export function placeName(place: Place | PlaceId, locale: Locale): string {
  const p = typeof place === 'string' ? BY_ID.get(place) : place;
  return p ? p.names[locale] : String(place);
}

/** Filter places by country, experience and/or type. */
export function placesWhere(filter: {
  country?: CountryCode | readonly CountryCode[];
  experience?: ExperienceId | readonly ExperienceId[];
  type?: PlaceType | readonly PlaceType[];
}): Place[] {
  const list = <T,>(v: T | readonly T[] | undefined): readonly T[] | undefined =>
    v === undefined ? undefined : Array.isArray(v) ? (v as readonly T[]) : [v as T];
  const countries = list(filter.country);
  const experiences = list(filter.experience);
  const types = list(filter.type);
  return PLACES.filter(
    (p) =>
      (!countries || countries.includes(p.country)) &&
      (!experiences || p.experiences.some((e) => experiences.includes(e))) &&
      (!types || types.includes(p.type)),
  );
}

// ---------------------------------------------------------------------------
// SVG map projection
// ---------------------------------------------------------------------------

/**
 * Fixed map frame covering the whole South Caucasus (Black Sea coast →
 * Caspian, Greater Caucasus → Syunik / Nakhchivan).
 */
export const MAP_BOUNDS = { minLon: 39.8, maxLon: 50.6, minLat: 38.3, maxLat: 43.8 } as const;

/** Reference latitude for the cos(lat0) correction (frame centre, 41.05°). */
export const MAP_LAT0 = (MAP_BOUNDS.minLat + MAP_BOUNDS.maxLat) / 2;

const KX = Math.cos((MAP_LAT0 * Math.PI) / 180); // ≈ 0.7541

/** SVG viewBox width (user units). */
export const MAP_WIDTH = 1000;

/** User units per degree of latitude (≈ 122.8). */
export const MAP_SCALE = MAP_WIDTH / ((MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon) * KX);

/** SVG viewBox height (≈ 675.3 user units). */
export const MAP_HEIGHT = Math.round((MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat) * MAP_SCALE * 10) / 10;

/** Use as `<svg viewBox={MAP_VIEWBOX}>` → "0 0 1000 675.3". */
export const MAP_VIEWBOX = `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`;

/**
 * Equirectangular projection with a cos(lat0) horizontal correction, so
 * shapes keep their proportions around 41°N:
 *
 *   x = (lon − 39.8) · cos(41.05°) · S
 *   y = (43.8 − lat) · S          with S = 1000 / (10.8 · cos(41.05°)) ≈ 122.8
 *
 * Returns SVG user units in the viewBox "0 0 1000 MAP_HEIGHT" (origin top-left,
 * y grows downwards), rounded to 0.1. Points outside the frame are not
 * clamped (they land outside the viewBox).
 */
export function project(lat: number, lon: number): { x: number; y: number } {
  const x = (lon - MAP_BOUNDS.minLon) * KX * MAP_SCALE;
  const y = (MAP_BOUNDS.maxLat - lat) * MAP_SCALE;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

/** Inverse of project(): SVG user units → { lat, lon }. */
export function unproject(x: number, y: number): { lat: number; lon: number } {
  return {
    lat: MAP_BOUNDS.maxLat - y / MAP_SCALE,
    lon: MAP_BOUNDS.minLon + x / (KX * MAP_SCALE),
  };
}
