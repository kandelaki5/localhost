/**
 * Server-side helpers for the AI Lab page (build time only — never imported
 * by the browser scripts in ./client/).
 *
 * Strings: src/i18n/<lang>/ai-lab*.json, English canonical (deep-merged by
 * useStrings). The page file is registered in src/i18n/index.ts; the feature
 * files are loaded through the generic overload and typed from English here.
 */
import { contentLang, useStrings, type Lang } from '../../i18n';
import type enPhoto from '../../i18n/en/ai-lab-photo.json';
import type enProposal from '../../i18n/en/ai-lab-proposal.json';
import type enPolicy from '../../i18n/en/ai-lab-policy.json';
import type enTriage from '../../i18n/en/ai-lab-triage.json';
import type enMcp from '../../i18n/en/ai-lab-mcp.json';

export type PhotoStrings = typeof enPhoto;
export type ProposalStrings = typeof enProposal;
export type PolicyStrings = typeof enPolicy;
export type TriageStrings = typeof enTriage;
export type McpStrings = typeof enMcp;

export const labStrings = (lang: Lang) => useStrings(lang, 'ai-lab');
export const photoStrings = (lang: Lang) => useStrings<PhotoStrings>(lang, 'ai-lab-photo');
export const proposalStrings = (lang: Lang) => useStrings<ProposalStrings>(lang, 'ai-lab-proposal');
export const policyStrings = (lang: Lang) => useStrings<PolicyStrings>(lang, 'ai-lab-policy');
export const triageStrings = (lang: Lang) => useStrings<TriageStrings>(lang, 'ai-lab-triage');
export const mcpStrings = (lang: Lang) => useStrings<McpStrings>(lang, 'ai-lab-mcp');

/**
 * `lang` attribute for a block whose strings file may still be English on a
 * translated page (keeps English typography for English fallback text).
 */
export function blockLang(lang: Lang, file: string): string | undefined {
  return contentLang(lang, file) !== lang ? 'en' : undefined;
}

/**
 * JSON for `<script type="application/json" set:html={…}>`. Our own static
 * strings and data only; `<` is escaped so the text can never close the tag.
 */
export function scriptJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Section ids, numbers and audiences on the AI Lab page (hero index + section heads). */
export const LAB_SECTIONS = [
  { id: 'trip-designer', n: 1, audience: 'travellers', lamp: 'green' },
  { id: 'photo-match', n: 2, audience: 'travellers', lamp: 'green' },
  { id: 'proposal', n: 3, audience: 'agencies', lamp: 'green' },
  { id: 'policy-qa', n: 4, audience: 'agencies', lamp: 'green' },
  { id: 'triage', n: 5, audience: 'staff', lamp: 'amber' },
  { id: 'mcp', n: 6, audience: 'developers', lamp: 'green' },
] as const;

export type LabSectionId = (typeof LAB_SECTIONS)[number]['id'];

export function labSection(id: LabSectionId) {
  const s = LAB_SECTIONS.find((x) => x.id === id);
  if (!s) throw new Error(`[ai-lab] unknown section ${id}`);
  return s;
}
