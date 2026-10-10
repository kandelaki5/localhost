/**
 * Voice input/output for the AI features: thin, feature-detected wrappers
 * around the Web Speech API (BROWSER-SAFE; every function is a no-op or
 * reports "unsupported" during SSR and in browsers without the API).
 *
 *   import { isVoiceSupported, startListening, speak, stopSpeaking } from '../lib/ai/client/voice';
 *
 *   if (isVoiceSupported('listen')) {
 *     const session = startListening('it', {
 *       onPartial: (text) => (notes.value = text),   // live transcript
 *       onFinal: (text) => (notes.value = text),
 *       onError: (err) => show(voiceErrorMessage(err.code, 'it')),
 *     });
 *     stopButton.onclick = () => session?.stop();
 *   }
 *   const outcome = await speak(planMarkdown, 'de');   // 'done' | 'cancelled' | 'no-voice' | 'unsupported' | 'error'
 *
 * Privacy: in Chrome and Edge, speech recognition is processed by the
 * browser vendor's online service (audio leaves the device); Safari uses
 * Apple's service. Tell visitors before they press the mic button.
 * Browser support (2026): recognition in Chromium browsers and Safari, not
 * Firefox; synthesis everywhere, but voices depend on the OS — Georgian voices
 * are rare, so speak(…, 'ka') often resolves 'no-voice'.
 */
import { LOCALE_INFO, normalizeLocale } from '../locales';
import type { Locale } from '../types';

// ---------------------------------------------------------------------------
// Minimal Web Speech typings (SpeechRecognition is not in TypeScript's DOM lib)
// ---------------------------------------------------------------------------

interface RecognitionAlternative {
  readonly transcript: string;
}
interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: RecognitionAlternative | undefined;
}
interface RecognitionResultEvent extends Event {
  readonly resultIndex: number;
  readonly results: { readonly length: number; readonly [index: number]: RecognitionResult | undefined };
}
interface RecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}
interface Recognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function synthesis(): SpeechSynthesis | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    return undefined;
  }
  return window.speechSynthesis;
}

// ---------------------------------------------------------------------------
// Feature detection
// ---------------------------------------------------------------------------

export type VoiceFeature = 'listen' | 'speak';

/**
 * true when the browser offers speech recognition ('listen'), speech
 * synthesis ('speak'), or — without an argument — at least one of them.
 * Whether a voice exists for a given language is a separate, async question:
 * see hasVoiceFor().
 */
export function isVoiceSupported(feature?: VoiceFeature): boolean {
  const listen = recognitionConstructor() !== undefined;
  const talk = synthesis() !== undefined;
  if (feature === 'listen') return listen;
  if (feature === 'speak') return talk;
  return listen || talk;
}

/**
 * BCP-47 tag for the Web Speech APIs. English uses the visitor's own English
 * variant when the browser has one (en-GB, en-US…), else en-GB.
 */
export function speechLang(locale: Locale): string {
  const loc = normalizeLocale(locale);
  if (loc === 'en') {
    const nav = typeof navigator !== 'undefined' ? navigator.language : '';
    return /^en-[a-z]{2}$/i.test(nav) ? nav : 'en-GB';
  }
  return LOCALE_INFO[loc].bcp47;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type VoiceErrorCode =
  | 'unsupported'
  | 'not-allowed'
  | 'no-speech'
  | 'audio-capture'
  | 'network'
  | 'language-not-supported'
  | 'aborted'
  | 'no-voice'
  | 'unknown';

export interface VoiceError {
  code: VoiceErrorCode;
  /** Browser detail (English, for logs). */
  detail?: string;
}

function mapRecognitionError(error: string): VoiceErrorCode {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'not-allowed';
    case 'no-speech':
    case 'audio-capture':
    case 'network':
    case 'language-not-supported':
    case 'aborted':
      return error;
    default:
      return 'unknown';
  }
}

/** Localised messages for voice errors (drafts — native review pending for ka/pl/it/de). */
export const VOICE_MESSAGES: Readonly<Record<Locale, Record<VoiceErrorCode, string>>> = {
  en: {
    unsupported: "Voice input isn't available in this browser. Try Chrome, Edge or Safari — or type instead.",
    'not-allowed': 'Please allow microphone access to use voice input.',
    'no-speech': "We didn't hear anything. Please try again.",
    'audio-capture': 'No microphone was found.',
    network: 'Voice recognition needs an internet connection.',
    'language-not-supported': "Voice input isn't available for this language in your browser.",
    aborted: 'Voice input stopped.',
    'no-voice': "Your device has no voice for this language, so the plan can't be read aloud.",
    unknown: 'Voice input failed. Please try again or type instead.',
  },
  ka: {
    unsupported: 'ხმოვანი შეყვანა ამ ბრაუზერში მიუწვდომელია. სცადეთ Chrome, Edge ან Safari — ან აკრიფეთ ტექსტი.',
    'not-allowed': 'ხმოვანი შეყვანისთვის, გთხოვთ, მიკროფონზე წვდომა დაუშვათ.',
    'no-speech': 'ვერაფერი გავიგეთ. გთხოვთ, თავიდან სცადოთ.',
    'audio-capture': 'მიკროფონი ვერ მოიძებნა.',
    network: 'ხმის ამოცნობას ინტერნეტკავშირი სჭირდება.',
    'language-not-supported': 'ამ ენაზე ხმოვანი შეყვანა თქვენს ბრაუზერში მიუწვდომელია.',
    aborted: 'ხმოვანი შეყვანა შეჩერდა.',
    'no-voice': 'თქვენს მოწყობილობას ამ ენისთვის ხმა არ აქვს, ამიტომ გეგმის ხმამაღლა წაკითხვა შეუძლებელია.',
    unknown: 'ხმოვანი შეყვანა ვერ მოხერხდა. სცადეთ თავიდან ან აკრიფეთ ტექსტი.',
  },
  pl: {
    unsupported: 'Wprowadzanie głosowe nie jest dostępne w tej przeglądarce. Spróbuj Chrome, Edge lub Safari — albo wpisz tekst.',
    'not-allowed': 'Zezwól na dostęp do mikrofonu, aby korzystać z wprowadzania głosowego.',
    'no-speech': 'Niczego nie usłyszeliśmy. Spróbuj ponownie.',
    'audio-capture': 'Nie znaleziono mikrofonu.',
    network: 'Rozpoznawanie mowy wymaga połączenia z internetem.',
    'language-not-supported': 'Wprowadzanie głosowe w tym języku nie jest dostępne w Twojej przeglądarce.',
    aborted: 'Wprowadzanie głosowe zatrzymane.',
    'no-voice': 'Twoje urządzenie nie ma głosu dla tego języka, więc planu nie można odczytać na głos.',
    unknown: 'Wprowadzanie głosowe nie powiodło się. Spróbuj ponownie albo wpisz tekst.',
  },
  it: {
    unsupported: "L'input vocale non è disponibile in questo browser. Provate Chrome, Edge o Safari, oppure scrivete il testo.",
    'not-allowed': "Consentite l'accesso al microfono per usare l'input vocale.",
    'no-speech': 'Non abbiamo sentito nulla. Riprovate.',
    'audio-capture': 'Nessun microfono trovato.',
    network: 'Il riconoscimento vocale richiede una connessione a internet.',
    'language-not-supported': "L'input vocale non è disponibile per questa lingua nel vostro browser.",
    aborted: 'Input vocale interrotto.',
    'no-voice': 'Il vostro dispositivo non ha una voce per questa lingua, quindi il programma non può essere letto ad alta voce.',
    unknown: "L'input vocale non è riuscito. Riprovate oppure scrivete il testo.",
  },
  de: {
    unsupported: 'Spracheingabe ist in diesem Browser nicht verfügbar. Versuchen Sie Chrome, Edge oder Safari — oder tippen Sie.',
    'not-allowed': 'Bitte erlauben Sie den Mikrofonzugriff, um die Spracheingabe zu nutzen.',
    'no-speech': 'Wir haben nichts gehört. Bitte versuchen Sie es erneut.',
    'audio-capture': 'Es wurde kein Mikrofon gefunden.',
    network: 'Die Spracherkennung benötigt eine Internetverbindung.',
    'language-not-supported': 'Spracheingabe ist für diese Sprache in Ihrem Browser nicht verfügbar.',
    aborted: 'Spracheingabe beendet.',
    'no-voice': 'Ihr Gerät hat keine Stimme für diese Sprache, daher kann der Plan nicht vorgelesen werden.',
    unknown: 'Die Spracheingabe ist fehlgeschlagen. Bitte versuchen Sie es erneut oder tippen Sie.',
  },
};

export function voiceErrorMessage(code: VoiceErrorCode, locale: Locale): string {
  return VOICE_MESSAGES[normalizeLocale(locale)][code];
}

// ---------------------------------------------------------------------------
// Listening (speech → text)
// ---------------------------------------------------------------------------

export interface ListenCallbacks {
  /** Live transcript so far (final + interim words), called often. */
  onPartial?: (text: string) => void;
  /** Complete transcript, once, when recognition ends with something heard. */
  onFinal?: (text: string) => void;
  /** Not called for stop()/abort() initiated by the page. */
  onError?: (error: VoiceError) => void;
  onStart?: () => void;
  /** Always called last (after onFinal / onError). */
  onEnd?: () => void;
}

export interface ListenOptions {
  /** Keep listening across pauses until stop() (default false: one utterance). */
  continuous?: boolean;
}

export interface ListeningSession {
  /** Stop listening and deliver what was heard (onFinal). */
  stop(): void;
  /** Stop listening and discard the transcript. */
  abort(): void;
  readonly active: boolean;
}

let currentSession: ListeningSession | null = null;

/**
 * Starts speech recognition in the locale's language (BCP-47, e.g. "ka-GE").
 * Returns null — after calling onError({code:'unsupported'}) — when the
 * browser has no SpeechRecognition. Only one session runs at a time; starting
 * a new one aborts the previous one. Stops any speech output first.
 */
export function startListening(
  locale: Locale,
  callbacks: ListenCallbacks = {},
  options: ListenOptions = {},
): ListeningSession | null {
  const Ctor = recognitionConstructor();
  if (!Ctor) {
    callbacks.onError?.({ code: 'unsupported' });
    callbacks.onEnd?.();
    return null;
  }
  currentSession?.abort();
  stopSpeaking();

  const recognition = new Ctor();
  recognition.lang = speechLang(locale);
  recognition.continuous = options.continuous ?? false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let active = true;
  let discarded = false;
  let stoppedByPage = false;
  let finalText = '';
  let latest = '';
  let failed = false;

  recognition.onstart = () => callbacks.onStart?.();
  recognition.onresult = (event) => {
    let committed = '';
    let interim = '';
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result?.[0]?.transcript ?? '';
      if (result?.isFinal) committed += transcript;
      else interim += transcript;
    }
    finalText = committed.replace(/\s+/g, ' ').trim();
    latest = `${committed} ${interim}`.replace(/\s+/g, ' ').trim();
    if (!discarded) callbacks.onPartial?.(latest);
  };
  recognition.onerror = (event) => {
    const code = mapRecognitionError(event.error);
    if (code === 'aborted' && stoppedByPage) return;
    if (code === 'no-speech' && (finalText || latest)) return;
    failed = true;
    callbacks.onError?.({ code, ...(event.message ? { detail: event.message } : {}) });
  };
  recognition.onend = () => {
    active = false;
    if (currentSession === session) currentSession = null;
    // Some engines (Safari) never mark the last result final: fall back to the latest transcript.
    const text = finalText || latest;
    if (!discarded && !failed && text) callbacks.onFinal?.(text);
    callbacks.onEnd?.();
  };

  const session: ListeningSession = {
    stop() {
      if (!active) return;
      stoppedByPage = true;
      recognition.stop();
    },
    abort() {
      if (!active) return;
      stoppedByPage = true;
      discarded = true;
      recognition.abort();
    },
    get active() {
      return active;
    },
  };

  try {
    recognition.start();
  } catch (err) {
    active = false;
    callbacks.onError?.({ code: 'unknown', detail: err instanceof Error ? err.message : String(err) });
    callbacks.onEnd?.();
    return null;
  }
  currentSession = session;
  return session;
}

// ---------------------------------------------------------------------------
// Speaking (text → speech)
// ---------------------------------------------------------------------------

/**
 * Markdown → plain text for speech: drops the route tag, stream markers,
 * code, links' URLs, heading/bullet/emphasis syntax and table pipes, and
 * ends headings and bullets with a pause.
 */
export function stripMarkdown(markdown: string): string {
  const sentenceEnd = (line: string) => (/[.!?…:;。]$/.test(line) ? line : `${line}.`);
  return markdown
    .replace(/<route>[\s\S]*?(<\/route>|$)/gi, '')
    .replace(/\n*\[\[(?:refusal|truncated|error:[a-z0-9_]+)\]\]\s*$/i, '')
    .replace(/```[\s\S]*?(```|$)/g, '')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map((raw) => {
      let line = raw.trim();
      if (!line || /^[-*_=]{3,}$/.test(line)) return '';
      const heading = /^#{1,6}\s+(.*?)\s*#*$/.exec(line);
      const bullet = /^(?:[-*+•]|\d+[.)])\s+(.*)$/.exec(line);
      if (heading) line = heading[1] ?? '';
      else if (bullet) line = bullet[1] ?? '';
      line = line
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/(\*\*|__)(.+?)\1/g, '$2')
        .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,;:!?]|$)/g, '$1$2')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/\s*\|\s*/g, ', ')
        .replace(/\s*[→⇒↔]\s*/g, ', ')
        .replace(/[*_#>]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!line || line === '—') return '';
      return heading || bullet ? sentenceEnd(line) : line;
    })
    .filter(Boolean)
    .join('\n');
}

/** Splits plain text into utterance-sized chunks (Chrome stops long utterances after ~15 s). */
export function speechChunks(text: string, maxChars = 220): string[] {
  const chunks: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    const sentences = paragraph.match(/[^.!?…。]+[.!?…。]+["'»”)]*\s*|[^.!?…。]+$/g) ?? [paragraph];
    let current = '';
    for (const sentence of sentences) {
      const s = sentence.trim();
      if (!s) continue;
      if (s.length > maxChars) {
        if (current) chunks.push(current);
        current = '';
        // Very long sentence: split at commas/spaces.
        let rest = s;
        while (rest.length > maxChars) {
          const cut = Math.max(rest.lastIndexOf(', ', maxChars), rest.lastIndexOf(' ', maxChars));
          const at = cut > maxChars * 0.4 ? cut + 1 : maxChars;
          chunks.push(rest.slice(0, at).trim());
          rest = rest.slice(at).trim();
        }
        if (rest) current = rest;
        continue;
      }
      if (current && current.length + 1 + s.length > maxChars) {
        chunks.push(current);
        current = s;
      } else {
        current = current ? `${current} ${s}` : s;
      }
    }
    if (current) chunks.push(current);
  }
  return chunks;
}

/** Voices load asynchronously in Chromium: waits for `voiceschanged` (max ~1.5 s). */
export async function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  const synth = synthesis();
  if (!synth) return [];
  const now = synth.getVoices();
  if (now.length) return now;
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener('voiceschanged', done);
      resolve(synth.getVoices());
    };
    synth.addEventListener('voiceschanged', done);
    setTimeout(done, timeoutMs);
  });
}

const NOVELTY_VOICES =
  /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|pipe organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b/i;

/**
 * Best voice for a locale: same language required (never reads Georgian with
 * an English voice); prefers the exact regional tag, natural/neural/premium
 * voices, then the platform default. null when none matches.
 */
export function pickVoice(locale: Locale, voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const target = speechLang(locale).toLowerCase();
  const base = target.split('-')[0] ?? target;
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const voice of voices) {
    const lang = voice.lang.replace(/_/g, '-').toLowerCase();
    if (lang.split('-')[0] !== base) continue;
    let score = 0;
    if (lang === target) score += 4;
    if (base === 'en' && lang === 'en-gb') score += 1;
    if (/natural|neural|premium|enhanced|online/i.test(voice.name)) score += 3;
    if (/google/i.test(voice.name)) score += 2;
    if (voice.default) score += 1;
    if (NOVELTY_VOICES.test(voice.name)) score -= 6;
    if (score > bestScore) {
      bestScore = score;
      best = voice;
    }
  }
  return best;
}

/** true when the device has a speech-synthesis voice for this locale's language. */
export async function hasVoiceFor(locale: Locale): Promise<boolean> {
  return pickVoice(locale, await loadVoices()) !== null;
}

export type SpeakOutcome = 'done' | 'cancelled' | 'no-voice' | 'unsupported' | 'error';

export interface SpeakOptions {
  /** 0.1–10, default 1. */
  rate?: number;
  /** 0–2, default 1. */
  pitch?: number;
  /** Use this voice instead of pickVoice() (must match the language). */
  voice?: SpeechSynthesisVoice;
  onStart?: () => void;
  /** Progress through the utterance chunks (0-based index, total). */
  onChunk?: (index: number, total: number) => void;
}

let speakGeneration = 0;

/**
 * Reads text aloud in the locale's language. Markdown is stripped first and
 * the text is spoken in sentence-sized chunks. Resolves when finished
 * ('done'), when stopSpeaking() or a newer speak() interrupts it
 * ('cancelled'), or immediately with 'no-voice' / 'unsupported'.
 * Call it from a user gesture (iOS requires one).
 */
export async function speak(text: string, locale: Locale, options: SpeakOptions = {}): Promise<SpeakOutcome> {
  const synth = synthesis();
  if (!synth) return 'unsupported';
  const generation = ++speakGeneration;
  const voice = options.voice ?? pickVoice(locale, await loadVoices());
  if (generation !== speakGeneration) return 'cancelled';
  if (!voice) return 'no-voice';
  const chunks = speechChunks(stripMarkdown(text));
  if (!chunks.length) return 'done';

  if (synth.speaking || synth.pending) {
    synth.cancel();
    // Chromium drops an utterance queued in the same tick as cancel().
    await new Promise((resolve) => setTimeout(resolve, 60));
    if (generation !== speakGeneration) return 'cancelled';
  }

  return new Promise<SpeakOutcome>((resolve) => {
    let settled = false;
    const finish = (outcome: SpeakOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };
    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = options.rate ?? 1;
      utterance.pitch = options.pitch ?? 1;
      utterance.onstart = () => {
        if (index === 0) options.onStart?.();
        options.onChunk?.(index, chunks.length);
      };
      utterance.onend = () => {
        if (generation !== speakGeneration) finish('cancelled');
        else if (index === chunks.length - 1) finish('done');
      };
      utterance.onerror = (event) => {
        finish(event.error === 'interrupted' || event.error === 'canceled' || generation !== speakGeneration ? 'cancelled' : 'error');
      };
      synth.speak(utterance);
    });
    // stopSpeaking() bumps the generation; resolve even if the engine fires no events after cancel().
    const watch = setInterval(() => {
      if (generation !== speakGeneration) {
        clearInterval(watch);
        finish('cancelled');
      } else if (settled) {
        clearInterval(watch);
      }
    }, 250);
  });
}

/** Stops speech output immediately (pending speak() promises resolve 'cancelled'). */
export function stopSpeaking(): void {
  speakGeneration++;
  synthesis()?.cancel();
}

/** true while speech output is playing or queued. */
export function isSpeaking(): boolean {
  const synth = synthesis();
  return !!synth && (synth.speaking || synth.pending);
}
