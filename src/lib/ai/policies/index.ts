/**
 * Local Host's five policy documents as plain text (SERVER-ONLY: ~13k tokens).
 *
 * The .txt files are the PDF text from docs/reference/pdf-text/ with only
 * extraction artefacts cleaned (stray bullet glyphs, form feeds, hard line
 * breaks, cells of the report table that the extraction had interleaved, one
 * hyphen lost at a line break). The wording is unchanged — citations quote
 * these texts verbatim. If a PDF in public/assets/policies/ is updated,
 * re-extract and replace the matching .txt file.
 */
import type { BetaRequestDocumentBlock } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { POLICY_DOCUMENTS, type PolicyDocumentInfo, type PolicyId } from '../client/policy';
import accomodations from './accomodations.txt?raw';
import excursions from './excursions.txt?raw';
import inbound from './inbound.txt?raw';
import report from './report.txt?raw';
import sustainability from './sustainability.txt?raw';

export const POLICY_TEXTS: Readonly<Record<PolicyId, string>> = {
  sustainability,
  report,
  excursions,
  accomodations,
  inbound,
};

/**
 * The documents as Messages API `document` blocks (plain-text source, sentence
 * chunking, citations enabled), in POLICY_DOCUMENTS order so that a citation's
 * `document_index` maps straight back to POLICY_DOCUMENTS[index]. The last
 * block carries `cache_control`, so all five are prompt-cached together.
 * Deterministic output — the cached prefix stays byte-identical.
 */
export function policyDocumentBlocks(): BetaRequestDocumentBlock[] {
  return POLICY_DOCUMENTS.map((doc, index): BetaRequestDocumentBlock => ({
    type: 'document',
    source: { type: 'text', media_type: 'text/plain', data: POLICY_TEXTS[doc.id] },
    title: doc.title,
    citations: { enabled: true },
    ...(index === POLICY_DOCUMENTS.length - 1 ? { cache_control: { type: 'ephemeral' as const } } : {}),
  }));
}

/** Document for a citation's `document_index` (falls back to matching the title). */
export function policyForCitation(documentIndex: number, documentTitle: string | null): PolicyDocumentInfo | undefined {
  return POLICY_DOCUMENTS[documentIndex] ?? POLICY_DOCUMENTS.find((d) => d.title === documentTitle);
}
