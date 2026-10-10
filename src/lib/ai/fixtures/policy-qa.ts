/**
 * Demo fixtures for POST /api/policy-qa: precomputed English answers to the
 * four suggested questions, in exactly the live response format.
 *
 * Every `citedText` is a verbatim passage (a full sentence or list item, as the
 * API's sentence chunking would cite it) from src/lib/ai/policies/*.txt —
 * checked by string search; keep it that way when editing.
 */
import {
  SUGGESTED_POLICY_QUESTIONS,
  policyDocument,
  type PolicyAnswerBlock,
  type PolicyCitation,
  type PolicyId,
  type SuggestedPolicyQuestionId,
} from '../client/policy';

const cite = (id: PolicyId, citedText: string): PolicyCitation => {
  const doc = policyDocument(id);
  return { documentTitle: doc.title, documentUrl: doc.url, citedText };
};
const text = (t: string): PolicyAnswerBlock => ({ text: t, citations: [] });
const claim = (t: string, ...citations: PolicyCitation[]): PolicyAnswerBlock => ({ text: t, citations });

export interface PolicyQaFixture {
  id: SuggestedPolicyQuestionId;
  question: string;
  /** Lower-case stems (en/ka/pl/it/de) used to pick the closest sample for other questions. */
  keywords: readonly string[];
  answer: PolicyAnswerBlock[];
}

const question = (id: SuggestedPolicyQuestionId): string =>
  SUGGESTED_POLICY_QUESTIONS.find((q) => q.id === id)?.question ?? id;

export const POLICY_QA_FIXTURES: readonly PolicyQaFixture[] = [
  {
    id: 'footprint',
    question: question('footprint'),
    keywords: [
      'footprint', 'environment', 'energy', 'carbon', 'co2', 'emission', 'climate', 'waste', 'recycl', 'plastic', 'green', 'eco',
      'umwelt', 'ökolog', 'fußabdruck', 'fussabdruck', 'energie', 'klima', 'müll', 'abfall',
      'środowisk', 'ekolog', 'energi', 'ślad', 'odpad', 'klimat', 'ambient', 'impronta', 'rifiut',
      'გარემო', 'ეკოლოგ', 'კვალ', 'ენერგ', 'ნარჩენ',
    ],
    answer: [
      text('We work on this in our office, in how our team travels and in the partners we choose.\n\nIn the office, '),
      claim(
        'lights and equipment are switched off after working hours and whenever they are not in use',
        cite('sustainability', 'All office lights are switched off after working hours.'),
        cite('sustainability', 'All office equipment is switched off when not in use.'),
      ),
      text('. '),
      claim(
        'Between January and October 2025 we used 10.1 % less energy and 36.3 % less gas than in the same period of 2024',
        cite('sustainability', 'We have decreased energy consumption by 10.1 % for the period January-October 2025, compared to same period of 2024.'),
        cite('sustainability', 'We have decreased gas consumption by 36.3 % for the period January-October 2025, compared to same period of 2024.'),
      ),
      text('. We also '),
      claim(
        'separate our office waste and buy non-perishable goods in bulk',
        cite('sustainability', 'At our office we separate the waste PETE; HDPE; PP.'),
        cite('sustainability', 'All non-perishable goods are purchased in bulk.'),
      ),
      text('.\n\nTo reduce travel emissions, '),
      claim('our employees work from home one day a week', cite('sustainability', 'By granting our employees one day per week to work remotely from home.')),
      text(', '),
      claim(
        'we reimburse their yearly public transport pass',
        cite('sustainability', 'Sustainable Transportation: to motivate use of public transport we reimburse one-year public transport pass fee for employees.'),
      ),
      text(', and '),
      claim(
        'we offset the carbon footprint of all our international business travel',
        cite('sustainability', 'We offset all carbon footprint caused by our international business travel.'),
      ),
      text('.\n\nIn our supply chain, '),
      claim(
        'we give preference to accommodations and restaurants with acknowledged sustainability certificates',
        cite('sustainability', 'We favor and give preference to accommodations and restaurants with acknowledged sustainability certificates.'),
      ),
      text(', and '),
      claim(
        'we promote excursions that support the local environment and biodiversity',
        cite('sustainability', 'We promote excursions and activities which support the local environment and biodiversity.'),
      ),
      text('.'),
    ],
  },
  {
    id: 'animals',
    question: question('animals'),
    keywords: [
      'animal', 'wildlife', 'zoo', 'horse', 'dolphin', 'circus', 'captive',
      'tier', 'zirkus', 'pferd', 'zwierz', 'koń', 'cyrk', 'animali', 'cavall', 'circo', 'fauna',
      'ცხოველ', 'ცხენ',
    ],
    answer: [
      text('No. '),
      claim(
        'We do not offer excursions involving trade, consumption, close contact or performances of animals',
        cite('excursions', 'Not offering any excursions involving trade, consumption, close contact, or performances of animals.'),
      ),
      text(', and '),
      claim(
        'we prohibit any excursions or activities that harm animals or nature, or where captive wildlife is acquired, bred or held',
        cite(
          'sustainability',
          'Prohibiting any excursions or activities which harm humans, animals and nature, are socially or culturally unacceptable, where captive wildlife is acquired, bred or held.',
        ),
      ),
      text('.\n\nWe expect the same from our partners: '),
      claim(
        'we do not work with — or end our partnership with — excursion providers whose excursions harm plants, animals, ecosystems or natural resources',
        cite(
          'excursions',
          'We emphasize that we will not form partnership and/or will terminate any existing partnership with excursion provider in case there is evidence of violating any of the following:',
        ),
        cite('excursions', 'Offers excursions that harm plants, animals, ecosystems or natural resources.'),
      ),
      text('. '),
      claim(
        'Partner agencies must also ensure that wildlife is not harvested, consumed, displayed, sold or traded on their excursions, except as part of a regulated activity that is sustainable and lawful',
        cite(
          'inbound',
          'The company ensures that within their excursions wildlife species are not harvested, consumed, displayed, sold, or traded, except as part of a regulated activity that ensures that their utilization is sustainable and in compliance with local, national and international law.',
        ),
      ),
      text('.'),
    ],
  },
  {
    id: 'hotels',
    question: question('hotels'),
    keywords: [
      'hotel', 'accommodation', 'accomodation', 'guesthouse', 'guest house', 'lodging', 'stay',
      'unterkunft', 'unterkünfte', 'pension', 'nocleg', 'zakwaterowan', 'pensjonat', 'alloggi', 'albergh', 'struttur',
      'სასტუმრო', 'განთავს',
    ],
    answer: [
      text('Quality of service matters, but sustainability is part of every choice. '),
      claim(
        'We only work with accommodations that follow mandatory sustainability practices, and we favour those that minimise their negative environmental and social impacts and contribute positively to local communities',
        cite(
          'accomodations',
          'In addition to the quality of service our partners provide, we also understand that Accommodations have a significant impact in sustainability practices in tourism industry, consequently we are committed to only work with accommodations that adhere Mandatory sustainability practices, while favor and give preferences to the ones who minimize their negative environmental and social impacts while maximizing positive contributions to local communities.',
        ),
      ),
      text('. '),
      claim(
        'We also give preference to accommodations and restaurants with acknowledged sustainability certificates',
        cite('sustainability', 'We favor and give preference to accommodations and restaurants with acknowledged sustainability certificates.'),
      ),
      text('.\n\n'),
      claim(
        'Our target for 2026 is that at least 50% of our accommodations have sustainability credentials',
        cite(
          'accomodations',
          'Our target for the year 2026 is to have at least 50% of accommodation with sustainability credentials, meaning our accommodation partners meet at least one of the following criteria:',
        ),
      ),
      text(' — for example '),
      claim(
        'saving energy and water, or reducing plastics and separating waste',
        cite('accomodations', 'Energy Conservation: uses renewable energy sources, energy-efficient lighting and appliances, and smart systems to reduce consumption.'),
        cite(
          'accomodations',
          'Water Management: has Implemented water-saving measures like low-flow fixtures, reusing gray water, and promoting water-saving practices to guests.',
        ),
        cite('accomodations', 'Waste Reduction and Waste Recycling: minimizes use of plastics, separates the waste and ensures the proper disposal.'),
      ),
      text(', or '),
      claim(
        'sourcing food, goods and services locally',
        cite('accomodations', 'Is giving preference to Local Sourcing (food, goods, and services from local community, businesses and suppliers).'),
      ),
      text('.\n\n'),
      claim(
        'We do not work with accommodations that lack the required permits and licences, break local laws or do not respect human rights — and we end existing partnerships if there is evidence of this',
        cite('accomodations', 'We emphasize that we will not form partnership and/or will terminate any existing partnership in case there is evidence of violating any of the following:'),
        cite('accomodations', 'Does not hold all required permits and licenses to operate the business in Georgia.'),
        cite('accomodations', 'Does not comply with all local laws and regulations.'),
        cite(
          'accomodations',
          'Does not demonstrate respect to the national and international laws and regulations as well as good ethics concerning human rights, including rights of employees, the rights of children and women and the rights of indigenous people.',
        ),
      ),
      text('.'),
    ],
  },
  {
    id: 'rights',
    question: question('rights'),
    keywords: [
      'child', 'children', 'kid', 'worker', 'labour', 'labor', 'employee', 'staff', 'human right', 'wage', 'exploitation', 'trafficking',
      'kinder', 'arbeit', 'mitarbeiter', 'lohn', 'menschenrecht', 'dzieci', 'dziecko', 'pracow', 'płac', 'praw', 'bambin', 'minor', 'lavorat', 'salari', 'diritti',
      'ბავშვ', 'თანამშრომ', 'უფლებ',
    ],
    answer: [
      claim(
        'We have a zero-tolerance policy for human rights violations, including forced labour, human trafficking and any violation of children’s rights',
        cite(
          'sustainability',
          'We have a zero-tolerance policy for acts of violation of human rights, including forced labor, human trafficking, and all rights of children.',
        ),
      ),
      text('.\n\nIn our own team, '),
      claim(
        'every employee has an employment contract under Georgian legislation, works in a safe and healthy environment and is free to leave their job',
        cite('sustainability', 'Our employees are granted, and their rights are protected with employment contracts in accordance with Georgian legislation.'),
        cite('sustainability', 'Our work environment is safe and healthy.'),
        cite(
          'sustainability',
          'Our employees are free to enter employment through their own choice and have freedom to leave employment when they choose.',
        ),
      ),
      text(', and '),
      claim(
        'pay is above the official average and industry standards',
        cite('sustainability', 'Our employees receive fair compensation, which is above the official average as well as industry standards.'),
      ),
      text('.\n\nWith partners, '),
      claim(
        'we do not work with — or end partnerships with — suppliers that do not pay at least a living wage or the national minimum wage, or that employ children for work normally done by adults',
        cite(
          'sustainability',
          'We emphasize that we will not form partnership and/or will terminate any existing partnership (accommodations, restaurants, excursion providers, inbound tour operators etc.) in case there is evidence of any of the following:',
        ),
        cite(
          'sustainability',
          'Does not comply with local employment legislation and does not ensure that employees are paid at least a living wage or a wage equal to the national legal minimum wage.',
        ),
        cite('sustainability', 'Employ children to complete work which is normally undertaken by adults.'),
      ),
      text('. '),
      claim(
        'Suppliers must protect children against sexual exploitation and follow the Child-Protection Code',
        cite(
          'sustainability',
          'Does not ensure that children are protected against sexual exploitation on the premises and that the Supplier and its employees follow the Child-Protection Code against sexual exploitation of children.',
        ),
      ),
      text(', and '),
      claim(
        'partner agencies must report any suspicious behaviour on their premises or during excursions to the local authorities',
        cite(
          'inbound',
          'The Parties shall ensure that any suspicious behavior from persons on the premises or during excursions shall be reported to the local authorities.',
        ),
      ),
      text('.'),
    ],
  },
];

/** Demo answer for questions that match none of the samples (same format, no citations). */
export const POLICY_QA_GENERIC_ANSWER: PolicyAnswerBlock[] = [
  text(
    'This is a demo of our policy assistant, so right now it can only answer the four suggested questions. ' +
      'Once it is connected, it answers questions like yours directly from our five policy documents, quoting the passages it relies on. ' +
      'Until then, please email us at info@localhost.ge — we are happy to help.',
  ),
];

const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Picks the demo answer for a question: exact suggested question → keyword match → generic. */
export function pickPolicyQaFixture(q: string): { fixture: PolicyQaFixture | null; exact: boolean } {
  const n = normalise(q);
  const exact = POLICY_QA_FIXTURES.find((f) => normalise(f.question) === n);
  if (exact) return { fixture: exact, exact: true };
  let best: PolicyQaFixture | null = null;
  let bestScore = 0;
  for (const f of POLICY_QA_FIXTURES) {
    const score = f.keywords.reduce((sum, k) => (n.includes(k) ? sum + 1 : sum), 0);
    if (score > bestScore) {
      best = f;
      bestScore = score;
    }
  }
  return { fixture: best, exact: false };
}
