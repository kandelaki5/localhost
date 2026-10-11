/**
 * Minimal inline markup for translatable strings, so copy can carry an accent
 * without HTML in the JSON files:
 *
 *   "Three countries. *One local host.*"  →  Three countries. <em>One local host.</em>
 *   "**Bold**"                             →  <strong>Bold</strong>
 *   "Line one\nLine two"                   →  Line one<br>Line two
 *
 * Short accents (2–3 words) get class="accent-keep": global.css keeps them on
 * one line in display headings, so a green italic word never dangles alone at
 * the end of a line ("write / home"). Accents over 18 characters also get
 * "accent-keep--long" and are kept together only on screens ≥ 30em.
 *
 * Everything else is HTML-escaped, so the result is safe for `set:html`.
 */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function inline(text: string | undefined | null): string {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, (_, accent: string) => {
      const words = accent.trim().split(/\s+/).length;
      if (words < 2 || words > 3) return `<em>${accent}</em>`;
      // Longer phrases ("opowiedzą po powrocie.") stay together only from 30em up,
      // so they can never overflow a 320 px column.
      return accent.length > 18 ? `<em class="accent-keep accent-keep--long">${accent}</em>` : `<em class="accent-keep">${accent}</em>`;
    })
    .replace(/\n/g, '<br>');
}

/** Removes the markup characters (for <title>, aria-label, alt …). */
export function plain(text: string | undefined | null): string {
  if (!text) return '';
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/\s*\n\s*/g, ' ');
}

/** Replaces {name} placeholders: fmt('Hello {who}', { who: 'Tbilisi' }). */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
