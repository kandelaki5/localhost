/**
 * Inquiry Triage — staff tool (#triage), browser logic, lazy-loaded.
 * Staff access key flow (docs/AI-ARCHITECTURE.md → "Staff access key"):
 * on 401 `unauthorized` the key field appears; the key is sent in the
 * X-Staff-Key header via triageEmail({ staffKey }) and kept in sessionStorage
 * (localStorage only with "Remember on this device"), never in the URL.
 */
import { draftReplyMailto, languageLabel, triageEmail, type TriageOutcome, type TriageSampleId } from '../../../lib/ai/client/triage';
import type { Locale } from '../../../lib/ai/types';
import {
  copyButton,
  el,
  fill,
  fmt,
  hideError,
  modeBadge,
  offscreen,
  readStrings,
  reportMode,
  req,
  reveal,
  showError,
  tpl,
  type LabErrorStrings,
} from './dom';

interface Strings {
  lang: Locale;
  errors: LabErrorStrings;
  cancelled: string;
  copied: string;
  copyFailed: string;
  count: string;
  working: string;
  key: Record<string, string>;
  card: Record<string, string> & { fields: Record<string, string> };
  senderTypes: Record<string, string>;
  intents: Record<string, string>;
  urgency: Record<string, string>;
  routes: Record<string, string>;
  sample: Record<string, string>;
  samples: { id: TriageSampleId; email: string; label: string }[];
}

const KEY_STORE = 'lh-staff-key';

function stored(): string {
  try {
    return sessionStorage.getItem(KEY_STORE) ?? localStorage.getItem(KEY_STORE) ?? '';
  } catch {
    return '';
  }
}

function store(key: string, remember: boolean): void {
  try {
    sessionStorage.setItem(KEY_STORE, key);
    if (remember) localStorage.setItem(KEY_STORE, key);
    else localStorage.removeItem(KEY_STORE);
  } catch {
    /* storage blocked — the key still works for this request */
  }
}

function forget(): void {
  try {
    sessionStorage.removeItem(KEY_STORE);
    localStorage.removeItem(KEY_STORE);
  } catch {
    /* ignore */
  }
}

const norm = (s: string) => s.replace(/\r\n?/g, '\n').trim();

export function init(root: HTMLElement): void {
  const t = readStrings<Strings>(root);
  const form = req<HTMLFormElement>(root, '[data-form]');
  const textarea = req<HTMLTextAreaElement>(root, '#triage-email');
  const counter = req<HTMLElement>(root, '[data-count]');
  const submit = req<HTMLButtonElement>(root, '[data-submit]');
  const submitLabel = req<HTMLElement>(root, '[data-submit-label]');
  const errorBox = req<HTMLElement>(root, '[data-error]');
  const keyBox = req<HTMLElement>(root, '[data-key]');
  const keyInput = req<HTMLInputElement>(root, '#triage-key');
  const keyMsg = req<HTMLElement>(root, '[data-key-msg]');
  const remember = form.elements.namedItem('remember') as HTMLInputElement;
  const forgetBtn = req<HTMLButtonElement>(root, '[data-forget]');
  const desk = req<HTMLElement>(root, '[data-desk]');
  const empty = req<HTMLElement>(root, '[data-empty]');
  const working = req<HTMLElement>(root, '[data-working]');
  const slot = req<HTMLElement>(root, '[data-card-slot]');
  const badge = req<HTMLElement>(root, '[data-badge]');
  const status = req<HTMLElement>(root, '[data-status]');
  const sampleButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-sample]')];
  let loaded: TriageSampleId | null = null;
  let controller: AbortController | null = null;
  let clearCooldown: () => void = () => undefined;

  const initialKey = stored();
  if (initialKey) {
    keyInput.value = initialKey;
    keyBox.hidden = false;
    forgetBtn.hidden = false;
  }

  const updateCount = () => (counter.textContent = fmt(t.count, { n: textarea.value.length, max: textarea.maxLength }));

  function setView(view: 'empty' | 'working' | 'card'): void {
    empty.hidden = view !== 'empty';
    working.hidden = view !== 'working';
    slot.hidden = view !== 'card';
    root.setAttribute('aria-busy', String(view === 'working'));
  }

  function showKey(wrong: boolean): void {
    keyBox.hidden = false;
    keyMsg.textContent = wrong ? (t.key.wrong ?? '') : (t.key.prompt ?? '');
    keyMsg.classList.toggle('lab-field__error', wrong);
    submitLabel.textContent = submitLabel.dataset.textKey ?? submitLabel.textContent;
    keyInput.focus();
  }

  function fact(label: string, value: string | undefined): HTMLElement | null {
    if (!value) return null;
    const row = el('div');
    row.append(el('dt', label), el('dd', value));
    return row;
  }

  function renderCard(outcome: Extract<TriageOutcome, { ok: true }>): HTMLElement {
    const { triage: x, sample, mode } = outcome.data;
    const card = tpl(root, 'card');
    fill(card, 'route', t.routes[x.routeTo] ?? x.routeTo);
    const urgency = card.querySelector<HTMLElement>('[data-urgency]');
    if (urgency) urgency.dataset.level = x.urgency;
    const lamp = card.querySelector<HTMLElement>('[data-lamp]');
    if (x.urgency !== 'low') lamp?.classList.add(x.urgency === 'high' ? 'lab-lamp--red' : 'lab-lamp--amber');
    fill(card, 'urgency', t.urgency[x.urgency] ?? x.urgency);
    fill(card, 'reason', x.urgencyReason);
    fill(card, 'language', `${languageLabel(x.language, t.lang)} · ${x.language.toUpperCase()}`);
    fill(card, 'market', x.market);
    fill(card, 'sender', t.senderTypes[x.senderType] ?? x.senderType);
    fill(card, 'intent', t.intents[x.intent] ?? x.intent);
    fill(card, 'summary', x.summary);

    const f = t.card.fields;
    const e = x.extracted;
    const facts = [
      fact(f.travelDates ?? 'Travel dates', e.travelDates),
      fact(f.groupSize ?? 'Group size', e.groupSize),
      fact(f.countries ?? 'Countries', e.countries?.join(', ')),
      fact(f.interests ?? 'Interests', e.interests?.join(' · ')),
      fact(f.budgetHints ?? 'Budget', e.budgetHints),
      fact(f.hotelCategory ?? 'Hotels', e.hotelCategory),
      fact(f.specialNeeds ?? 'Special needs', e.specialNeeds),
    ].filter((n): n is HTMLElement => Boolean(n));
    card.querySelector('[data-facts]')?.replaceChildren(...facts);

    const missing = card.querySelector<HTMLElement>('[data-missing]');
    missing?.replaceChildren(...x.missingInfo.map((m) => el('li', m)));
    fill(card, 'missingCount', x.missingInfo.length ? `(${x.missingInfo.length})` : '');
    if (!x.missingInfo.length) fill(card, 'nothingMissing', t.card.nothingMissing);

    fill(card, 'replyIn', fmt(t.card.replyIn ?? '{language}', { language: languageLabel(x.draftReply.language, t.lang) }));
    fill(card, 'subject', x.draftReply.subject);
    const body = fill(card, 'body', x.draftReply.body);
    const mail = card.querySelector<HTMLElement>('[data-mail]');
    if (mail) mail.lang = x.draftReply.language;
    if (body) body.tabIndex = 0;
    const open = card.querySelector<HTMLAnchorElement>('[data-open]');
    if (open) open.href = draftReplyMailto(x.draftReply);
    const copy = card.querySelector<HTMLButtonElement>('[data-copy]');
    if (copy) copyButton(copy, () => `${x.draftReply.subject}\n\n${x.draftReply.body}`, { copied: t.copied, failed: t.copyFailed });

    const notice = card.querySelector<HTMLElement>('[data-notice]');
    if (notice && mode === 'demo' && sample) {
      const texts = [sample.exact ? t.sample.exact : fmt(t.sample.other ?? '', { label: t.samples.find((s) => s.id === sample.id)?.label ?? sample.label })];
      if (t.lang !== 'en') texts.push(t.sample.englishNote ?? '');
      notice.append(modeBadge(root, 'demo'), document.createTextNode(texts.filter(Boolean).join(' ')));
    } else notice?.remove();
    return card;
  }

  async function run(): Promise<void> {
    hideError(errorBox);
    clearCooldown();
    const email = textarea.value;
    if (!norm(email)) {
      textarea.focus();
      return;
    }
    const sampleId = loaded && norm(t.samples.find((s) => s.id === loaded)?.email ?? '') === norm(email) ? loaded : null;
    const staffKey = keyInput.value.trim();
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    submit.disabled = true;
    setView('working');
    badge.replaceChildren();
    status.textContent = t.working;
    if (offscreen(desk)) reveal(desk);

    const outcome = await triageEmail(
      { email, locale: t.lang, ...(sampleId ? { sampleId } : {}) },
      { signal, ...(staffKey ? { staffKey } : {}) },
    );
    if (controller.signal !== signal) return;
    submit.disabled = false;

    if (!outcome.ok) {
      setView(slot.childElementCount ? 'card' : 'empty');
      if (outcome.aborted) {
        status.textContent = t.cancelled;
        return;
      }
      reportMode(outcome.mode);
      if (outcome.error === 'unauthorized') {
        if (staffKey) forget();
        forgetBtn.hidden = true;
        showKey(Boolean(staffKey));
        status.textContent = keyMsg.textContent ?? '';
        return;
      }
      clearCooldown = showError(errorBox, outcome, t.errors, { buttons: [submit], lang: t.lang });
      status.textContent = errorBox.textContent ?? '';
      return;
    }

    reportMode(outcome.mode);
    if (staffKey) {
      store(staffKey, remember.checked);
      forgetBtn.hidden = false;
    }
    const card = renderCard(outcome);
    slot.replaceChildren(card);
    badge.replaceChildren(modeBadge(root, outcome.mode));
    setView('card');
    const route = card.querySelector<HTMLElement>('#triage-route');
    status.textContent = `${route?.textContent ?? ''} · ${outcome.data.triage.urgency}`;
    if (offscreen(desk)) reveal(desk);
    route?.focus({ preventScroll: true });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!submit.disabled) void run();
  });

  textarea.addEventListener('input', updateCount);

  for (const button of sampleButtons) {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      const sample = t.samples.find((s) => s.id === button.dataset.sample);
      if (!sample) return;
      sampleButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      textarea.value = sample.email;
      loaded = sample.id;
      updateCount();
      void run();
    });
  }

  req<HTMLButtonElement>(root, '[data-cancel]').addEventListener('click', () => controller?.abort());
  req<HTMLButtonElement>(root, '[data-clear]').addEventListener('click', () => {
    textarea.value = '';
    loaded = null;
    sampleButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    updateCount();
    textarea.focus();
  });
  forgetBtn.addEventListener('click', () => {
    forget();
    keyInput.value = '';
    forgetBtn.hidden = true;
    keyInput.focus();
  });
  updateCount();
}
