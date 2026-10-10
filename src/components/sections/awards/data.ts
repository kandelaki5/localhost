/**
 * Verified nominations at the Welcome to Georgia! National Tourism Awards
 * (src/data/research-orgs.json → awards, docs/research/organisations-awards-hosts.md).
 * Show "Nominee" only — never "Winner", "Finalist" or "Shortlisted": entrants
 * register themselves in this programme.
 *
 * The owner's template has four nominee slots; only these two are verified.
 * The other two are in docs/CONTENT-TODO.md — add them here (and to
 * src/i18n/<lang>/awards.json → items) once confirmed. No empty slots on the page.
 */
import research from '../../../data/research-orgs.json';

export type AwardId = 'fastest-growing-2016' | 'inbound-2026';

export interface Award {
  id: AwardId;
  year: number;
  /** Ink of the seal's medallion; the laurel is always foil. */
  ink: 'ink' | 'green';
  /** Degrees, within ±2. */
  tilt: number;
}

export const AWARDS: Award[] = [
  { id: 'fastest-growing-2016', year: 2016, ink: 'ink', tilt: -1.5 },
  { id: 'inbound-2026', year: 2026, ink: 'green', tilt: 1.25 },
];

/** The programme's own (English) name — a proper name, never translated. */
export const PROGRAMME = {
  name: 'Welcome to Georgia!',
  sub: 'National Tourism Awards',
  ringTop: 'WELCOME TO GEORGIA!',
  ringBottom: 'NATIONAL TOURISM AWARDS',
  url: research.awardProgramme.url,
  domain: new URL(research.awardProgramme.url).hostname.replace(/^www\./, ''),
  since: research.awardProgramme.since,
};
