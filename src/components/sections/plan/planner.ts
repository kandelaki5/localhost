/**
 * The AI Trip Designer, wired up (lazy chunk: Plan.astro imports it with a
 * dynamic import() when #plan nears the viewport, so none of this — the plan
 * client, the place index, voice — is in the main bundle).
 *
 *   mount(planner) → { submit(), preset(detail) }
 *
 * Talks to POST /api/plan only through lib/ai/client/plan.ts (planTrip,
 * refinePlan, buildMailto) and to the Web Speech API only through
 * lib/ai/client/voice.ts. Model text is rendered by itinerary.ts (DOM nodes,
 * never innerHTML) and the route by route-map.ts (validated place ids only).
 */
import type enPlan from '../../../i18n/en/plan.json';
import {
  PLAN_DAYS_MAX,
  PLAN_DAYS_MIN,
  PLAN_NOTES_MAX,
  buildMailto,
  planErrorMessage,
  planTrip,
  refinePlan,
  type PlanCallbacks,
  type PlanError,
  type PlanRequest,
  type PlanResult,
  type PlanRoute,
  type PlanSample,
  type Pace,
  type TravellerType,
} from '../../../lib/ai/client/plan';
import {
  hasVoiceFor,
  isVoiceSupported,
  speak,
  startListening,
  stopSpeaking,
  voiceErrorMessage,
  type ListeningSession,
} from '../../../lib/ai/client/voice';
import { normalizeLocale } from '../../../lib/ai/locales';
import type { CountryCode, ExperienceId, Locale } from '../../../lib/ai/types';
import { formatCoords } from '../../../lib/geo';
import { ItineraryView } from './itinerary';
import { RouteMap } from './route-map';

type Strings = typeof enPlan;
type Phase = 'idle' | 'connecting' | 'streaming' | 'done' | 'stopped' | 'error';

export interface PlannerApi {
  submit(): void;
  sync(options?: { reveal?: boolean }): void;
}

const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mount(planner: HTMLElement): PlannerApi {
  const existing = (planner as HTMLElement & { __planner?: PlannerApi }).__planner;
  if (existing) return existing;

  const config = JSON.parse(planner.querySelector('[data-plan-strings]')?.textContent ?? '{}') as { lang: string; t: Strings };
  const t = config.t;
  const locale: Locale = normalizeLocale(config.lang);
  // Built without the AI key: every answer is a ready-made sample (Plan.astro).
  const demoMode = 'demo' in planner.dataset;

  const q = <T extends Element = HTMLElement>(selector: string): T | null => planner.querySelector<T>(selector);
  const qa = <T extends Element = HTMLElement>(selector: string): T[] => [...planner.querySelectorAll<T>(selector)];
  /** Required element (the markup is ours; a missing one is a bug). */
  const el = <T extends Element = HTMLElement>(selector: string): T => {
    const found = planner.querySelector<T>(selector);
    if (!found) throw new Error(`[plan] missing ${selector}`);
    return found;
  };

  // ---------------------------------------------------------------- elements
  const form = el<HTMLFormElement>('[data-plan-form]');
  const body = el('[data-doc-body]');
  const summary = el('[data-summary]');
  const summaryText = el('[data-summary-text]');
  const editButton = el<HTMLButtonElement>('[data-edit]');
  const countriesError = el('[data-countries-error]');
  const daysInput = el<HTMLInputElement>('[data-days]');
  const daysOut = el('[data-days-out]');
  const monthSelect = el<HTMLSelectElement>('[data-month]');
  const notes = el<HTMLTextAreaElement>('[data-notes]');
  const count = el('[data-count]');
  const mic = el<HTMLButtonElement>('[data-mic]');
  const micLabel = el('[data-mic-label]');
  const micNote = el('[data-mic-note]');
  const micStatus = el('[data-mic-status]');
  const mrz = q<HTMLElement>('[data-mrz]');

  const output = el('[data-output]');
  const led = el('[data-led]');
  const statusEl = el('[data-status]');
  const progress = el('[data-progress]');
  const stopButton = el<HTMLButtonElement>('[data-stop]');
  const demoBadge = el('[data-demo-badge]');
  const sheet = el('[data-sheet]');
  const outTitle = el('#plan-out-title');
  const draftEl = el('[data-draft]');
  const demoStamp = el('[data-demo-stamp]');
  const itineraryRoot = el('[data-itinerary]');
  const alertBox = el('[data-alert]');
  const alertText = el('[data-alert-text]');
  const retryButton = el<HTMLButtonElement>('[data-retry]');
  const demoNotice = el('[data-demo-notice]');
  const truncatedNote = el('[data-truncated]');
  const actions = el('[data-actions]');
  const refineForm = el<HTMLFormElement>('[data-refine-form]');
  const refineInput = el<HTMLInputElement>('[data-refine-input]');
  const refineMsg = el('[data-refine-msg]');
  const sendLinks = qa<HTMLAnchorElement>('[data-send]');
  const compare = q<HTMLElement>('[data-compare]');
  const compareRequest = q<HTMLElement>('[data-compare-request]');
  const compareSample = q<HTMLElement>('[data-compare-sample]');
  const compareSampleRow = q<HTMLElement>('[data-compare-sample-row]');
  const copyButton = el<HTMLButtonElement>('[data-copy]');
  const readButton = el<HTMLButtonElement>('[data-read]');
  const readLabel = readButton.querySelector('.btn__label') ?? readButton;
  const restartButton = el<HTMLButtonElement>('[data-restart]');
  const actionMsg = el('[data-action-msg]');

  const mapPanel = el('[data-map-panel]');
  const mapSvg = el<SVGSVGElement>('[data-map]');
  const mapStatus = el('[data-map-status]');
  const mapTitle = el('[data-map-title]');
  const routeList = el<HTMLOListElement>('[data-route-list]');

  const map = new RouteMap(mapSvg, reducedMotion);
  const view = new ItineraryView(itineraryRoot, { locale });

  // ---------------------------------------------------------------- state
  let phase: Phase = 'idle';
  let busy = false;
  let controller: AbortController | null = null;
  let last: PlanResult | null = null;
  let lastRequest: PlanRequest | null = null;
  let draft = 0;
  let requestedDays = 7;
  let lastStatus = '';
  let session: ListeningSession | null = null;
  let speaking = false;

  // ---------------------------------------------------------------- form state
  const pressed = (kind: 'country' | 'experience') =>
    qa<HTMLButtonElement>(`[data-stamp="${kind}"][aria-pressed="true"]`).map((b) => b.value);
  const radio = (name: string) => form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? '';
  const days = () => Math.min(PLAN_DAYS_MAX, Math.max(PLAN_DAYS_MIN, Math.round(Number(daysInput.value) || 7)));
  const monthName = (value: string) => monthSelect.querySelector<HTMLOptionElement>(`option[value="${value}"]`)?.textContent?.trim() ?? '';

  /** The month list as the next 12 months with their year ("May 2027" → "2027-05"),
   *  so a request says which May. Names come from the page (built per language). */
  function datedMonths(): void {
    const names = new Map([...monthSelect.options].map((o) => [o.value, o.textContent?.trim() ?? '']));
    const picked = Number(monthSelect.value) || 0;
    const now = new Date();
    const options = Array.from({ length: 12 }, (_, i) => {
      const index = now.getMonth() + i;
      const year = now.getFullYear() + Math.floor(index / 12);
      const month = (index % 12) + 1;
      const option = new Option(`${names.get(String(month)) ?? month} ${year}`, `${year}-${String(month).padStart(2, '0')}`);
      option.selected = month === picked;
      return option;
    });
    const any = monthSelect.options[0];
    if (any && !any.value) monthSelect.replaceChildren(any, ...options);
  }

  function readRequest(): PlanRequest {
    const travellers = radio('travellers');
    const pace = radio('pace');
    const month = monthSelect.value;
    const text = notes.value.trim().slice(0, PLAN_NOTES_MAX);
    return {
      locale,
      countries: pressed('country') as CountryCode[],
      interests: pressed('experience') as ExperienceId[],
      days: days(),
      ...(month ? { month } : {}),
      ...(travellers ? { travellers: travellers as TravellerType } : {}),
      ...(pace ? { pace: pace as Pace } : {}),
      ...(text ? { notes: text } : {}),
    };
  }

  function updateDays(): void {
    const n = days();
    daysOut.textContent = String(n);
    daysInput.setAttribute('aria-valuetext', fill(t.form.daysValue, { n }));
    daysInput.style.setProperty('--fill', `${((n - PLAN_DAYS_MIN) / (PLAN_DAYS_MAX - PLAN_DAYS_MIN)) * 100}%`);
    q<HTMLButtonElement>('[data-days-step="-1"]')?.toggleAttribute('disabled', n <= PLAN_DAYS_MIN);
    q<HTMLButtonElement>('[data-days-step="1"]')?.toggleAttribute('disabled', n >= PLAN_DAYS_MAX);
  }

  function updateCount(): void {
    count.textContent = `${notes.value.length} / ${PLAN_NOTES_MAX}`;
  }

  /** Passport-style machine-readable zone that mirrors the choices. */
  function updateMrz(): void {
    if (!mrz) return;
    const r = readRequest();
    const clean = (s: string) => s.toUpperCase().normalize('NFD').replace(/[^A-Z0-9]+/g, '<');
    const pad = (s: string) => (s + '<'.repeat(44)).slice(0, 44);
    const line1 = pad(`P<LHT<${r.countries.join('<') || 'XXX'}<<${clean(r.month ? `M${r.month.replace('-', '')}` : 'ANY')}<${String(r.days).padStart(2, '0')}D`);
    const line2 = pad(`${r.interests.map((i) => clean(i)).join('<') || 'MIX'}<<${clean(r.travellers ?? '')}<${clean(r.pace ?? '')}`);
    mrz.textContent = `${line1}\n${line2}`;
  }

  function summaryLine(r: PlanRequest): string {
    const parts = [
      r.countries.map((c) => t.countries[c]).join(' & '),
      fill(t.form.daysValue, { n: r.days }),
      r.month ? monthName(r.month) : t.form.monthAny,
      r.travellers ? t.travellers[r.travellers] : '',
      r.pace ? t.pace[r.pace] : '',
      r.interests.map((i) => t.experiences[i]).join(', '),
    ].filter(Boolean);
    const note = r.notes ? ` · “${r.notes.length > 70 ? `${r.notes.slice(0, 68).trimEnd()}…` : r.notes}”` : '';
    return parts.join(' · ') + note;
  }

  /** Countries · length · interests: the same terms for the request and the sample. */
  function tripLine(trip: { countries: readonly CountryCode[]; interests: readonly ExperienceId[]; days: number }): string {
    return [
      trip.countries.map((c) => t.countries[c]).join(' & '),
      fill(t.form.daysValue, { n: trip.days }),
      trip.interests.map((i) => t.experiences[i]).join(', '),
    ]
      .filter(Boolean)
      .join('\u00a0· '); // the dot never starts a line
  }

  function showSample(sample: PlanSample): void {
    if (!compare || !compareSample || !compareSampleRow) return;
    const written = sample.locale === locale ? '' : (t.output.sampleLang as Record<string, string>)[sample.locale];
    compareSample.textContent = tripLine(sample) + (written ? ` (${written})` : '');
    compareSampleRow.hidden = false;
    sheet.dataset.compared = '';
  }

  function sync(options: { reveal?: boolean } = {}): void {
    const countries = pressed('country') as CountryCode[];
    map.setCountries(countries);
    if (countries.length) countriesError.hidden = true;
    updateMrz();
    if (options.reveal) expandForm(false);
  }

  // ---------------------------------------------------------------- collapse
  function collapseForm(): void {
    summaryText.textContent = summaryLine(lastRequest ?? readRequest());
    form.dataset.collapsed = '';
    body.hidden = true;
    summary.hidden = false;
    editButton.setAttribute('aria-expanded', 'false');
  }

  function expandForm(focus: boolean): void {
    if (!('collapsed' in form.dataset)) return;
    delete form.dataset.collapsed;
    body.hidden = false;
    summary.hidden = true;
    editButton.setAttribute('aria-expanded', 'true');
    if (focus) q<HTMLButtonElement>('[data-stamp]')?.focus();
  }

  editButton.addEventListener('click', () => expandForm(true));

  // ---------------------------------------------------------------- status
  function setPhase(next: Phase): void {
    phase = next;
    planner.dataset.state = next;
    mapPanel.dataset.mapState = next === 'connecting' || next === 'streaming' ? 'drawing' : map.stopCount ? 'done' : 'idle';
    led.dataset.phase = next;
    stopButton.hidden = !(next === 'connecting' || next === 'streaming');
    sheet.setAttribute('aria-busy', String(next === 'connecting' || next === 'streaming'));
  }

  function setStatus(text: string): void {
    if (text === lastStatus) return;
    lastStatus = text;
    statusEl.textContent = text;
  }

  function streamingStatus(): void {
    const n = view.dayCount;
    const total = Math.max(requestedDays, n);
    if (demoMode) setStatus(n ? fill(t.output.showingSampleDay, { day: n }) : t.output.loadingSample);
    else setStatus(n ? fill(t.output.writingDay, { day: n, days: total }) : t.output.designing);
    progress.style.setProperty('--p', String(n ? Math.min(0.96, (n - 0.5) / total) : 0.04));
  }

  function showAlert(message: string, retry: boolean): void {
    alertText.textContent = message;
    retryButton.hidden = !retry;
    alertBox.hidden = false;
  }

  // ---------------------------------------------------------------- map
  function onRoute(route: PlanRoute): void {
    map.draw(route);
    const places = route.places;
    const numbers = new Map<string, number>();
    places.forEach((p) => numbers.has(p.id) || numbers.set(p.id, numbers.size + 1));
    routeList.replaceChildren(
      ...places.map((p) => {
        const li = document.createElement('li');
        const n = document.createElement('span');
        n.className = 'nmap__n';
        n.textContent = String(numbers.get(p.id) ?? '');
        n.setAttribute('aria-hidden', 'true');
        li.append(n, document.createTextNode(p.name));
        return li;
      }),
    );
    routeList.hidden = places.length === 0;
    const tail = places[places.length - 1];
    mapStatus.textContent = tail ? `${tail.name} · ${formatCoords([tail.lat, tail.lon], 'dm')}` : t.map.drawing;
    mapTitle.textContent = places.length ? fill(t.map.routeTitle, { route: places.map((p) => p.name).join(' → ') }) : t.map.title;
  }

  function resetMap(): void {
    map.reset();
    routeList.replaceChildren();
    routeList.hidden = true;
    mapStatus.textContent = t.map.idle;
    mapTitle.textContent = t.map.title;
  }

  // ---------------------------------------------------------------- run
  function resetOutput(): void {
    view.clear();
    alertBox.hidden = true;
    demoNotice.hidden = true;
    truncatedNote.hidden = true;
    // A demo build labels the output as a sample from the first moment.
    demoStamp.hidden = !demoMode;
    demoBadge.hidden = !demoMode;
    outTitle.textContent = demoMode ? t.output.sampleTitle : t.output.title;
    if (compare && compareSampleRow) {
      compare.hidden = !demoMode;
      compareSampleRow.hidden = true;
      delete sheet.dataset.compared;
    }
    for (const link of sendLinks) if (compare?.contains(link)) link.hidden = true;
    actions.hidden = true;
    actionMsg.textContent = demoMode ? t.actions.sendDemoHint : t.actions.sendHint;
    refineMsg.textContent = '';
    progress.style.setProperty('--p', '0');
    stopReading();
  }

  function callbacks(): PlanCallbacks {
    controller = new AbortController();
    return {
      signal: controller.signal,
      onText: (markdown) => {
        if (phase === 'connecting' && markdown) setPhase('streaming');
        view.update(markdown, true);
        if (phase === 'streaming') streamingStatus();
      },
      onRoute,
      onSample: showSample,
      onDone: (result) => void finish(result),
      onError: (error) => fail(error),
    };
  }

  async function run(kind: 'plan' | 'refine', change = ''): Promise<void> {
    if (busy) return;
    const request = kind === 'refine' && last ? last.request : readRequest();
    if (!request.countries.length) {
      expandForm(false);
      countriesError.hidden = false;
      q<HTMLButtonElement>('[data-stamp="country"]')?.focus();
      return;
    }
    busy = true;
    lastRequest = request;
    requestedDays = request.days;
    draft = kind === 'plan' ? 1 : draft + 1;
    draftEl.textContent = demoMode ? t.output.sampleKicker : fill(t.output.draft, { n: draft });
    stopListening();
    resetOutput();
    resetMap();
    if (compareRequest) compareRequest.textContent = tripLine(request);
    output.hidden = false;
    planner.dataset.started = '';
    setPhase('connecting');
    setStatus(demoMode ? t.output.loadingSample : t.output.connecting);

    if (kind === 'plan') {
      collapseForm();
      outTitle.focus({ preventScroll: true });
      form.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }

    const cb = callbacks();
    const outcome = kind === 'refine' && last ? await refinePlan(last, change, cb) : await planTrip(request, cb);
    busy = false;
    controller = null;
    if (!outcome.ok && outcome.aborted) {
      setPhase('stopped');
      view.update(outcome.error.partialText, false);
      setStatus(t.output.stopped);
      alertBox.dataset.tone = 'quiet';
      showAlert(t.output.stopped, true);
      void map.finish();
    }
  }

  async function finish(result: PlanResult): Promise<void> {
    last = result;
    view.update(result.text, false);
    setPhase('done');
    progress.style.setProperty('--p', '1');
    const demo = result.mode === 'demo';
    const stops = new Set(result.route).size;
    setStatus(fill(demo ? t.output.doneDemo : t.output.done, { days: result.plan.days.length || view.dayCount, stops }));
    demoBadge.hidden = !demo;
    // The request/sample table already says it (demo builds); the note covers a
    // live build that answers with a sample.
    demoNotice.hidden = !demo || !!result.sample;
    demoStamp.hidden = !demo;
    // A sample is not the visitor's plan: name it so.
    outTitle.textContent = demo ? t.output.sampleTitle : t.output.title;
    if (demo && result.sample) showSample(result.sample);
    if (result.truncated) {
      truncatedNote.textContent = planErrorMessage('truncated', locale);
      truncatedNote.hidden = false;
    }
    // The month as the form shows it (the browser may lack Georgian month names).
    const month = result.request.month ? monthName(result.request.month) : '';
    const mail = buildMailto(result, month ? { monthName: month } : {});
    for (const link of sendLinks) {
      link.href = mail;
      link.hidden = false;
    }
    actions.hidden = false;
    readButton.hidden = true;
    mapPanel.dataset.mapState = 'done';
    // The map keeps drawing and zooming for a few seconds; the day chips get
    // their stop numbers once it is done (unless a new run has started).
    const run = draft;
    const current = () => run === draft && phase === 'done' && last === result;
    void map.finish().then(() => {
      if (current()) view.annotate(map.numbers());
    });
    // Read aloud only when this device has a voice for the plan's language
    // (Georgian voices are rare; a demo sample may be in English).
    if (isVoiceSupported('speak') && (await hasVoiceFor(view.planLang)) && current()) readButton.hidden = false;
  }

  function fail(error: PlanError): void {
    setPhase('error');
    alertBox.dataset.tone = error.refusal ? 'quiet' : 'alert';
    let message = error.message;
    if ((error.code === 'rate_limited' || error.code === 'daily_cap') && error.retryAfter) {
      message += ` ${fill(t.output.rateLimited, { minutes: Math.max(1, Math.ceil(error.retryAfter / 60)) })}`;
    }
    if (error.refusal) {
      view.clear();
      resetMap();
    } else if (error.partialText) {
      view.update(error.partialText, false);
      void map.finish();
    }
    setStatus(t.output.failed);
    showAlert(message, true);
    demoBadge.hidden = error.mode !== 'demo';
  }

  // ---------------------------------------------------------------- actions
  stopButton.addEventListener('click', () => controller?.abort());
  retryButton.addEventListener('click', () => void run('plan'));
  restartButton.addEventListener('click', () => {
    controller?.abort();
    expandForm(true);
    form.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  });

  refineForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const change = refineInput.value.trim();
    if (!change) {
      refineMsg.textContent = t.actions.refineEmpty;
      refineInput.focus();
      return;
    }
    refineMsg.textContent = '';
    void run('refine', change).then(() => {
      if (phase === 'done') refineInput.value = '';
    });
    sheet.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  });

  copyButton.addEventListener('click', async () => {
    const text = view.plainText();
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      area.remove();
    }
    actionMsg.textContent = ok ? t.actions.copied : t.actions.copyFailed;
  });

  function stopReading(): void {
    if (speaking) stopSpeaking();
    speaking = false;
    readButton.setAttribute('aria-pressed', 'false');
    readLabel.textContent = t.actions.read;
  }

  readButton.addEventListener('click', async () => {
    if (speaking) {
      stopReading();
      return;
    }
    if (!last) return;
    speaking = true;
    readButton.setAttribute('aria-pressed', 'true');
    readLabel.textContent = t.actions.readStop;
    const outcome = await speak(view.plainText(), view.planLang);
    if (outcome === 'no-voice' || outcome === 'unsupported') {
      readButton.hidden = true;
      actionMsg.textContent = voiceErrorMessage(outcome === 'no-voice' ? 'no-voice' : 'unsupported', locale);
    }
    speaking = false;
    readButton.setAttribute('aria-pressed', 'false');
    readLabel.textContent = t.actions.read;
  });

  // ---------------------------------------------------------------- dictation
  function stopListening(): void {
    session?.stop();
  }

  if (isVoiceSupported('listen')) {
    mic.hidden = false;
    micNote.hidden = false;
  }

  mic.addEventListener('click', () => {
    if (session?.active) {
      session.stop();
      return;
    }
    const before = notes.value.trimEnd();
    const join = (text: string) => [before, text].filter(Boolean).join(' ').slice(0, PLAN_NOTES_MAX);
    session = startListening(
      locale,
      {
        onStart: () => {
          mic.setAttribute('aria-pressed', 'true');
          micLabel.textContent = t.form.dictateStop;
          micStatus.textContent = t.form.listening;
        },
        onPartial: (text) => {
          notes.value = join(text);
          updateCount();
        },
        onFinal: (text) => {
          notes.value = join(text);
          updateCount();
          updateMrz();
        },
        onError: (error) => {
          micStatus.textContent = voiceErrorMessage(error.code, locale);
        },
        onEnd: () => {
          mic.setAttribute('aria-pressed', 'false');
          micLabel.textContent = t.form.dictate;
          if (micStatus.textContent === t.form.listening) micStatus.textContent = '';
        },
      },
      { continuous: true },
    );
  });

  // ---------------------------------------------------------------- form wiring
  daysInput.addEventListener('input', () => {
    updateDays();
    updateMrz();
  });
  qa<HTMLButtonElement>('[data-days-step]').forEach((button) =>
    button.addEventListener('click', () => {
      daysInput.value = String(days() + Number(button.dataset.daysStep));
      updateDays();
      updateMrz();
    }),
  );
  notes.addEventListener('input', updateCount);
  form.addEventListener('change', updateMrz);
  planner.addEventListener('plan:sync', (event) => sync((event as CustomEvent<{ reveal?: boolean }>).detail ?? {}));

  // Day ↔ map: hovering a day lights up its stops.
  itineraryRoot.addEventListener('pointerover', (event) => {
    const day = (event.target as Element).closest<HTMLElement>('.it-day');
    map.highlight(day?.dataset.places ? day.dataset.places.split(' ') : null);
  });
  itineraryRoot.addEventListener('pointerleave', () => map.highlight(null));

  datedMonths();
  updateDays();
  updateCount();
  sync();
  planner.dataset.ready = '';

  const api: PlannerApi = {
    submit: () => void run('plan'),
    sync,
  };
  (planner as HTMLElement & { __planner?: PlannerApi }).__planner = api;
  return api;
}
