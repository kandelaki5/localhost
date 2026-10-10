/**
 * Agency Proposal Builder (#proposal) — browser logic, lazy-loaded.
 * Uses src/lib/ai/client/proposal.ts (validation shared with the server).
 * The document is built from <template data-tpl="sheet"> with textContent
 * only; the route map uses PlaceInfo x/y of validated place ids.
 */
import { requestProposal, type ProposalInput, type ProposalOutcome, type ProposalRequest, type ProposalResponse } from '../../../lib/ai/client/proposal';
import type { CountryCode, ExperienceId, Locale } from '../../../lib/ai/types';
import { buildMap } from './map';
import {
  el,
  fill,
  fmt,
  hideError,
  modeBadge,
  offscreen,
  prefersReducedMotion,
  readStrings,
  reportMode,
  req,
  reveal,
  runSteps,
  showError,
  tpl,
  type LabErrorStrings,
} from './dom';

interface Strings {
  lang: Locale;
  bcp47: string;
  errors: LabErrorStrings;
  fieldErrors: Record<string, string>;
  cancelled: string;
  elapsed: string;
  daysValue: string;
  travellers: string;
  count: string;
  doc: Record<string, string>;
  mail: Record<string, string>;
  months: Record<string, string>;
  seasons: Record<string, string>;
  hotels: Record<string, string>;
  paces: Record<string, string>;
  countries: Record<string, string>;
  interests: Record<string, string>;
  samples: { id: string; brief: ProposalInput }[];
  contact: { email: string };
}

const MAIL_MAX = 1800;

export function init(root: HTMLElement): void {
  const t = readStrings<Strings>(root);
  const grid = req<HTMLElement>(root, '.lab-prop__grid');
  const form = req<HTMLFormElement>(root, '[data-form]');
  const submit = req<HTMLButtonElement>(root, '[data-submit]');
  const errorBox = req<HTMLElement>(root, '[data-error]');
  const output = req<HTMLElement>(root, '[data-output]');
  const empty = req<HTMLElement>(root, '[data-empty]');
  const progress = req<HTMLElement>(root, '[data-progress]');
  const result = req<HTMLElement>(root, '[data-result]');
  const sheetSlot = req<HTMLElement>(root, '[data-sheet-slot]');
  const summary = req<HTMLElement>(root, '[data-summary]');
  const notice = req<HTMLElement>(root, '[data-notice]');
  const status = req<HTMLElement>(root, '[data-status]');
  const quote = req<HTMLAnchorElement>(root, '[data-quote]');
  const days = form.elements.namedItem('days') as HTMLInputElement;
  const daysOut = req<HTMLOutputElement>(root, '[data-days-out]');
  const requests = form.elements.namedItem('specialRequests') as HTMLTextAreaElement;
  const counter = req<HTMLElement>(root, '[data-count]');
  let controller: AbortController | null = null;
  let stopSteps: () => void = () => undefined;
  let clearCooldown: () => void = () => undefined;
  let hasResult = false;

  const field = <T extends Element>(name: string) => form.elements.namedItem(name) as T | null;

  // ── form helpers ──
  const updateDays = () => (daysOut.textContent = fmt(t.daysValue, { n: days.value }));
  const updateCount = () => (counter.textContent = fmt(t.count, { n: requests.value.length, max: requests.maxLength }));
  days.addEventListener('input', updateDays);
  requests.addEventListener('input', updateCount);

  function clearFieldErrors(): void {
    root.querySelectorAll<HTMLElement>('[data-field]').forEach((f) => {
      f.removeAttribute('aria-invalid');
      f.querySelectorAll('input, select, textarea').forEach((c) => c.removeAttribute('aria-invalid'));
      const err = f.querySelector<HTMLElement>('[data-field-error]');
      if (err) {
        err.hidden = true;
        err.textContent = '';
      }
    });
  }

  function showFieldError(name: string): boolean {
    const key = name === 'season' ? 'month' : name;
    const box = root.querySelector<HTMLElement>(`[data-field="${key}"]`);
    if (!box) return false;
    const msg = t.fieldErrors[name] ?? t.fieldErrors[key] ?? t.errors.badRequest;
    const err = box.querySelector<HTMLElement>('[data-field-error]');
    const control = box.querySelector<HTMLElement>('input, select, textarea');
    box.setAttribute('aria-invalid', 'true');
    control?.setAttribute('aria-invalid', 'true');
    if (err) {
      err.textContent = msg;
      err.hidden = false;
      err.id ||= `prop-err-${key}`;
      control?.setAttribute('aria-describedby', err.id);
    }
    control?.focus();
    return true;
  }

  function readForm(): ProposalRequest {
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? '').trim();
    const when = text('when');
    return {
      locale: t.lang,
      ...(text('agency') ? { agency: text('agency') } : {}),
      ...(text('market') ? { market: text('market') } : {}),
      groupSize: Number(text('groupSize')),
      ...(when.startsWith('m-') ? { month: Number(when.slice(2)) } : {}),
      ...(when.startsWith('s-') ? { season: when.slice(2) as ProposalRequest['season'] } : {}),
      days: Number(text('days')),
      countries: data.getAll('countries').map(String) as CountryCode[],
      interests: data.getAll('interests').map(String) as ExperienceId[],
      hotelCategory: text('hotelCategory') as ProposalRequest['hotelCategory'],
      pace: text('pace') as ProposalRequest['pace'],
      ...(text('specialRequests') ? { specialRequests: text('specialRequests') } : {}),
    };
  }

  function fillForm(brief: ProposalInput): void {
    (field<HTMLInputElement>('agency') as HTMLInputElement).value = brief.agency ?? '';
    (field<HTMLInputElement>('market') as HTMLInputElement).value = brief.market ?? '';
    (field<HTMLInputElement>('groupSize') as HTMLInputElement).value = String(brief.groupSize);
    (field<HTMLSelectElement>('when') as HTMLSelectElement).value = brief.month ? `m-${brief.month}` : `s-${brief.season ?? 'flexible'}`;
    days.value = String(brief.days);
    form.querySelectorAll<HTMLInputElement>('input[name="countries"]').forEach((i) => (i.checked = brief.countries.includes(i.value as CountryCode)));
    form.querySelectorAll<HTMLInputElement>('input[name="interests"]').forEach((i) => (i.checked = brief.interests.includes(i.value as ExperienceId)));
    form.querySelectorAll<HTMLInputElement>('input[name="hotelCategory"]').forEach((i) => (i.checked = i.value === brief.hotelCategory));
    form.querySelectorAll<HTMLInputElement>('input[name="pace"]').forEach((i) => (i.checked = i.value === brief.pace));
    requests.value = brief.specialRequests ?? '';
    updateDays();
    updateCount();
    clearFieldErrors();
  }

  /** "25 travellers · September · 8 days · Georgia, Armenia · 4★ · Balanced" */
  function briefLine(b: ProposalInput | ProposalRequest): string {
    const when = b.month ? t.months[`m-${b.month}`] : b.season ? t.seasons[b.season] : '';
    return [
      `${b.groupSize} ${t.travellers}`,
      when,
      fmt(t.daysValue, { n: b.days }),
      b.countries.map((c) => t.countries[c] ?? c).join(', '),
      t.hotels[b.hotelCategory],
      t.paces[b.pace],
    ]
      .filter(Boolean)
      .join(' · ');
  }

  // ── layout states ──
  type View = 'empty' | 'working' | 'result';
  function show(view: View): void {
    empty.hidden = view !== 'empty';
    progress.hidden = view !== 'working';
    result.hidden = view !== 'result';
    root.setAttribute('aria-busy', String(view === 'working'));
  }

  function setLayout(layout: 'brief' | 'result'): void {
    grid.dataset.layout = layout;
    summary.hidden = layout !== 'result';
  }

  // ── the document ──
  function renderSheet(data: ProposalResponse, brief: ProposalRequest): HTMLElement {
    const p = data.proposal;
    const sheet = tpl(root, 'sheet');
    sheet.lang = data.locale;
    fill(sheet, 'date', new Date().toLocaleDateString(t.bcp47, { day: 'numeric', month: 'long', year: 'numeric' }));
    if (data.mode === 'demo') fill(sheet, 'stamp', `${t.doc.draft} · Demo`);
    const agency = brief.agency ?? data.request.agency;
    const forLine = sheet.querySelector<HTMLElement>('[data-for]');
    if (forLine && agency) {
      forLine.hidden = false;
      fill(sheet, 'for', agency + (data.request.market ? ` · ${data.request.market}` : ''));
    }
    fill(sheet, 'title', p.title);
    fill(sheet, 'subtitle', p.subtitle);
    fill(sheet, 'summary', p.summary);
    fill(sheet, 'pricing', data.pricingNote);
    fill(sheet, 'disclaimer', p.disclaimer);

    const lists: Record<string, string[]> = {
      highlights: p.highlights,
      included: p.included,
      notIncluded: p.notIncluded,
      sustainability: p.sustainability,
      nextSteps: p.nextSteps,
    };
    for (const [name, items] of Object.entries(lists)) {
      const target = sheet.querySelector<HTMLElement>(`[data-list="${name}"]`);
      if (!target) continue;
      target.replaceChildren(...items.map((item) => el('li', item)));
      const section = target.closest('section');
      if (section && !items.length) section.hidden = true;
    }

    // Route: unique places in route order (validated ids → our own coordinates).
    const stops = data.route.map((id) => data.places[id]).filter((x): x is NonNullable<typeof x> => Boolean(x));
    const mapSlot = sheet.querySelector<HTMLElement>('[data-map]');
    const names = stops.map((s) => s.name);
    const routeLine = sheet.querySelector<HTMLElement>('[data-slot="route"]');
    routeLine?.replaceChildren(
      ...names.flatMap((name, i) => [
        ...(i ? [document.createTextNode(' → ')] : []),
        el('span', String(i + 1), 'lab-sheet__routeno'),
        document.createTextNode(name),
      ]),
    );
    if (mapSlot && stops.length) {
      const map = buildMap(
        stops.map((s) => ({ x: s.x, y: s.y, name: s.name })),
        { label: fmt(t.doc.routeMap ?? '{places}', { places: names.join(', ') }), aspect: 1.3, numbered: true, pad: 50, minW: 240 },
      );
      mapSlot.append(map);
      if (!prefersReducedMotion()) {
        map.querySelectorAll<HTMLElement>('.lab-map__stop').forEach((stop, i) => stop.style.setProperty('--i', String(i)));
        map.querySelectorAll('polyline').forEach((line) => line.setAttribute('pathLength', '1'));
        map.classList.add('lab-map--armed');
        requestAnimationFrame(() => requestAnimationFrame(() => map.classList.add('is-drawing')));
      }
    } else if (mapSlot) {
      mapSlot.closest('section')?.setAttribute('hidden', '');
    }

    const body = sheet.querySelector<HTMLElement>('[data-days]');
    for (const d of p.days) {
      const row = tpl(root, 'day');
      fill(row, 'day', String(d.day));
      fill(row, 'title', d.title);
      const places = d.placeIds.map((id) => data.places[id]?.name).filter(Boolean);
      fill(row, 'places', places.length ? places.join(' → ') : '—');
      fill(row, 'meals', d.meals ?? '—');
      fill(row, 'overnight', d.overnight || '—');
      row.querySelector('[data-acts]')?.replaceChildren(...d.activities.map((a) => el('li', a)));
      body?.append(row);
    }
    return sheet;
  }

  function mailto(data: ProposalResponse, brief: ProposalRequest): string {
    const p = data.proposal;
    const head = [
      t.mail.greeting,
      '',
      t.mail.intro,
      '',
      p.title,
      p.subtitle,
      '',
      `${t.mail.brief}: ${briefLine(brief)}`,
      ...(brief.interests.length ? [brief.interests.map((i) => t.interests[i] ?? i).join(', ')] : []),
      ...(brief.specialRequests ? [brief.specialRequests.slice(0, 400)] : []),
      '',
      `${t.mail.programme}:`,
    ];
    const tail = ['', t.mail.contact, `${brief.agency ?? ''}`, '', t.mail.signoff];
    const lines = [...head];
    let size = [...head, ...tail].join('\n').length;
    for (const d of p.days) {
      const line = `${t.doc.day} ${d.day} — ${d.title}`;
      if (size + line.length + 1 > MAIL_MAX) break;
      lines.push(line);
      size += line.length + 1;
    }
    const body = [...lines, ...tail].join('\r\n');
    const subject = fmt(t.mail.subject, { title: p.title }).replace(/[\r\n]+/g, ' ');
    return `mailto:${t.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function render(outcome: ProposalOutcome, brief: ProposalRequest): void {
    stopSteps();
    submit.disabled = false;
    if (!outcome.ok) {
      show(hasResult ? 'result' : 'empty');
      if (outcome.aborted) {
        status.textContent = t.cancelled;
        return;
      }
      reportMode(outcome.mode);
      if (outcome.error === 'bad_request' && outcome.field && showFieldError(outcome.field)) return;
      clearCooldown = showError(errorBox, outcome, t.errors, { buttons: [submit], lang: t.lang });
      errorBox.scrollIntoView({ block: 'nearest' });
      return;
    }
    const { data } = outcome;
    reportMode(outcome.mode);
    const sheet = renderSheet(data, brief);
    sheetSlot.replaceChildren(sheet);
    notice.replaceChildren(modeBadge(root, outcome.mode));
    if (data.sample) notice.append(document.createTextNode(data.sample.notice));
    quote.href = mailto(data, brief);
    fill(summary, 'brief', briefLine(brief));
    hasResult = true;
    setLayout('result');
    show('result');
    status.textContent = data.proposal.title;
    const title = sheet.querySelector<HTMLElement>('#proposal-doc-title');
    reveal(output, false);
    title?.focus({ preventScroll: true });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors();
    hideError(errorBox);
    clearCooldown();
    const brief = readForm();
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    submit.disabled = true;
    show('working');
    if (offscreen(progress)) reveal(progress);
    stopSteps = runSteps(root.querySelector('[data-steps]'), root.querySelector('[data-elapsed]'), t.elapsed, 6000);
    const outcome = await requestProposal(brief, { signal });
    if (controller.signal !== signal) return;
    render(outcome, brief);
  });

  req<HTMLButtonElement>(root, '[data-cancel]').addEventListener('click', () => controller?.abort());

  req<HTMLButtonElement>(root, '[data-edit]').addEventListener('click', () => {
    setLayout('brief');
    reveal(form);
    form.querySelector<HTMLElement>('input, select')?.focus({ preventScroll: true });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-fill]').forEach((button) =>
    button.addEventListener('click', () => {
      const sample = t.samples.find((x) => x.id === button.dataset.fill);
      if (sample) fillForm(sample.brief);
    }),
  );

  req<HTMLButtonElement>(root, '[data-print]').addEventListener('click', () => window.print());
  updateDays();
  updateCount();
}
