/** MCP connector (#mcp) — copy buttons for the endpoint URL and the Claude Code command. */
import { copyButton, readStrings } from './dom';

export function init(root: HTMLElement): void {
  const t = readStrings<{ copied: string; copyFailed: string }>(root);
  root.querySelectorAll<HTMLButtonElement>('[data-copy-from]').forEach((button) => {
    const source = document.getElementById(button.dataset.copyFrom ?? '');
    if (source) copyButton(button, () => source.textContent?.trim() ?? '', { copied: t.copied, failed: t.copyFailed });
  });
}
