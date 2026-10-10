/**
 * Policy Q&A (#policy-qa) — browser logic, lazy-loaded.
 * Answers are built as text nodes; cited passages get numbered footnotes that
 * quote the policy verbatim and link to the PDF. Links come only from
 * POLICY_DOCUMENTS (our data), never from the response text.
 */
import {
  POLICY_DOCUMENTS,
  askPolicyQuestion,
  nextPolicyHistory,
  policyFootnotes,
  type PolicyHistoryTurn,
  type PolicyQaOutcome,
} from '../../../lib/ai/client/policy';
import type { Locale } from '../../../lib/ai/types';
import { currentMode, el, fill, fmt, modeBadge, prefersReducedMotion, readStrings, reportMode, req, showError, tpl, type LabErrorStrings } from './dom';

interface Strings {
  lang: Locale;
  errors: LabErrorStrings;
  cancelled: string;
  chat: Record<string, string>;
  count: string;
  docNames: Record<string, string>;
  questions: { id: string; english: string; label: string }[];
  pdf: string;
}

const KNOWN_URLS = new Set(POLICY_DOCUMENTS.map((d) => d.url));

export function init(root: HTMLElement): void {
  const t = readStrings<Strings>(root);
  const form = req<HTMLFormElement>(root, '[data-form]');
  const textarea = req<HTMLTextAreaElement>(root, 'textarea');
  const submit = req<HTMLButtonElement>(root, '[data-submit]');
  const log = req<HTMLOListElement>(root, '[data-log]');
  const empty = req<HTMLElement>(root, '[data-empty]');
  const counter = req<HTMLElement>(root, '[data-count]');
  const status = req<HTMLElement>(root, '[data-status]');
  const newChat = req<HTMLButtonElement>(root, '[data-new]');
  const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-ask]')];
  let history: PolicyHistoryTurn[] = [];
  let controller: AbortController | null = null;
  let turnNo = 0;

  const updateCount = () => (counter.textContent = fmt(t.count, { n: textarea.value.length, max: textarea.maxLength }));
  textarea.addEventListener('input', updateCount);

  function setBusy(busy: boolean): void {
    submit.disabled = busy;
    chips.forEach((c) => (c.disabled = busy));
    root.setAttribute('aria-busy', String(busy));
  }

  function renderAnswer(turn: HTMLElement, outcome: Extract<PolicyQaOutcome, { ok: true }>, n: number): void {
    const { data } = outcome;
    const answer = req<HTMLElement>(turn, '[data-answer]');
    const { notes, blocks } = policyFootnotes(data.answer);
    answer.lang = data.mode === 'demo' ? 'en' : data.locale;
    for (const block of blocks) {
      if (!block.refs.length) {
        answer.append(document.createTextNode(block.text));
        continue;
      }
      answer.append(el('span', block.text, 'lab-cited'));
      const sup = el('sup', undefined, 'lab-ref');
      block.refs.forEach((ref, i) => {
        if (i) sup.append(document.createTextNode(' '));
        const a = el('a', String(ref));
        a.href = `#pq-${n}-${ref}`;
        a.setAttribute('aria-label', fmt(t.chat.source ?? '{n}', { n: ref }));
        a.dataset.ref = String(ref);
        sup.append(a);
      });
      answer.append(sup);
    }
    answer.hidden = false;

    const sources = req<HTMLElement>(turn, '[data-sources]');
    const list = req<HTMLElement>(turn, '[data-notes]');
    if (notes.length) {
      for (const note of notes) {
        const item = tpl(root, 'note');
        item.id = `pq-${n}-${note.n}`;
        fill(item, 'n', String(note.n));
        fill(item, 'quote', `“${note.citedText.trim()}”`);
        const link = item.querySelector<HTMLAnchorElement>('[data-doc]');
        if (link) {
          if (KNOWN_URLS.has(note.documentUrl)) {
            link.href = note.documentUrl;
            fill(link, 'doc', `${t.docNames[note.documentUrl] ?? note.documentTitle} · ${t.pdf}`);
          } else {
            link.remove();
          }
        }
        list.append(item);
      }
      sources.hidden = false;
      // Light up the matching footnote while a reference is hovered or focused.
      answer.addEventListener('pointerover', (e) => light(e, true));
      answer.addEventListener('pointerout', (e) => light(e, false));
      answer.addEventListener('focusin', (e) => light(e, true));
      answer.addEventListener('focusout', (e) => light(e, false));
    }

    const notesText: string[] = [];
    if (!notes.length) notesText.push(t.chat.noSources ?? '');
    if (data.mode === 'demo' && data.sample) {
      if (data.sample.id === 'generic') notesText.push(t.chat.generic ?? '');
      else if (!data.sample.exact) {
        const q = t.questions.find((x) => x.id === data.sample?.id);
        notesText.push(fmt(t.chat.otherQuestion ?? '', { q: q?.label ?? data.sample.question }));
      }
      if (t.lang !== 'en') notesText.push(t.chat.englishNote ?? '');
    }
    fill(turn, 'note', notesText.filter(Boolean).join(' '));

    function light(e: Event, on: boolean): void {
      const ref = (e.target as HTMLElement).closest<HTMLElement>('[data-ref]')?.dataset.ref;
      if (ref) document.getElementById(`pq-${n}-${ref}`)?.classList.toggle('is-lit', on);
    }
  }

  async function ask(shown: string, sent: string): Promise<void> {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    turnNo += 1;
    const n = turnNo;
    const turn = tpl(root, 'turn');
    fill(turn, 'q', shown);
    req<HTMLButtonElement>(turn, '[data-cancel]').addEventListener('click', () => controller?.abort());
    empty.hidden = true;
    newChat.hidden = false;
    log.append(turn);
    turn.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    setBusy(true);
    status.textContent = t.chat.working ?? '';

    const outcome = await askPolicyQuestion({ locale: t.lang, question: sent, history }, { signal });
    const superseded = controller?.signal !== signal;
    turn.querySelector('[data-pending]')?.remove();
    turn.dataset.done = '';
    const box = req<HTMLElement>(turn, '[data-error]');
    if (!outcome.ok && outcome.aborted) {
      box.hidden = false;
      box.textContent = t.cancelled;
      if (!superseded) {
        setBusy(false);
        status.textContent = t.cancelled;
      }
      return;
    }
    if (superseded) return;
    setBusy(false);
    if (!outcome.ok) {
      reportMode(outcome.mode);
      showError(box, outcome, t.errors, { buttons: [submit, ...chips], lang: t.lang });
      status.textContent = box.textContent ?? '';
      return;
    }
    reportMode(outcome.mode);
    req<HTMLElement>(turn, '[data-badge]').replaceChildren(modeBadge(root, outcome.mode));
    renderAnswer(turn, outcome, n);
    history = nextPolicyHistory(history, sent, outcome.data.answer);
    status.textContent = req<HTMLElement>(turn, '[data-answer]').textContent ?? '';
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    const question = textarea.value.trim();
    if (!question) {
      textarea.focus();
      return;
    }
    textarea.value = '';
    updateCount();
    void ask(question, question);
  });

  // Enter sends, Shift+Enter makes a new line.
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  for (const chip of chips) {
    chip.addEventListener('click', () => {
      const q = t.questions.find((x) => x.id === chip.dataset.ask);
      if (!q) return;
      // Demo answers are prepared for the English wording; live mode asks in the visitor's language.
      void ask(q.label, currentMode() === 'demo' ? q.english : q.label);
    });
  }

  newChat.addEventListener('click', () => {
    controller?.abort();
    history = [];
    log.replaceChildren();
    empty.hidden = false;
    newChat.hidden = true;
    setBusy(false);
    textarea.focus();
  });
  updateCount();
}
