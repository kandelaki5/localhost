/**
 * Minimal inline markup for translatable strings, so copy can carry an accent
 * without HTML in the JSON files:
 *
 *   "Three countries. *One local host.*"  →  Three countries. <em>One local host.</em>
 *   "**Bold**"                             →  <strong>Bold</strong>
 *   "Line one\nLine two"                   →  Line one<br>Line two
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
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
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
