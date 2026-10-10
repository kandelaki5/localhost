/**
 * Hosts We Love: non-copy data (ids, monograms, photos, focal points).
 * Copy lives in src/i18n/<lang>/hosts.json under `hosts.<id>`.
 *
 * Photos follow docs/research/photo-plan.md §5: generic Georgian places,
 * never people and never captioned with a location. None of them shows the
 * host or the host's home, so every photo is labelled "Place photograph".
 */

export type HostId = 'sisatura' | 'leila' | 'vacheishvili' | 'samvel' | 'aluda' | 'maia';

export interface Host {
  id: HostId;
  /** Georgian initials for the monogram seal (Mkhedruli). Two letters render as "მ&ე". */
  monogram: readonly string[];
  /** File name in src/assets/photos (no extension). */
  photo: string;
  /** CSS object-position from the photo plan. */
  focal: string;
  /** Featured hosts get the large magazine cards. */
  featured?: boolean;
}

/** In the owner's template order. */
export const HOSTS: readonly Host[] = [
  // Marika (მარიკა) & Enry (ენრი) — Sisatura ethno-village, Chkhoria (Samegrelo).
  { id: 'sisatura', monogram: ['მ', 'ე'], photo: 'adjara-2', focal: '45% 60%', featured: true },
  // Leila (ლეილა). Crop to the carved-balcony house; the kvevri stays at the edge.
  { id: 'leila', monogram: ['ლ'], photo: 'kvevri-1', focal: '12% 45%', featured: true },
  // Vacheishvili (ვაჩეიშვილი). Pastoral, no wine imagery (link unconfirmed).
  { id: 'vacheishvili', monogram: ['ვ'], photo: 'kazbegi', focal: '50% 72%' },
  // Samvel (სამველი). Neutral scene with no landmark.
  { id: 'samvel', monogram: ['ს'], photo: 'lopota-lake', focal: '60% 55%' },
  // Aluda (ალუდა). Not Tusheti: that would imply a location.
  { id: 'aluda', monogram: ['ა'], photo: 'chaukhi-valley', focal: '40% 40%' },
  // Maia (მაია). Duotone keeps the town unidentifiable.
  { id: 'maia', monogram: ['მ'], photo: 'borjomi', focal: '45% 50%' },
];

/** Public URL of the policy the pull-quotes come from (kept from the old site). */
export const POLICY_PDF = '/assets/policies/sustainability.pdf';
