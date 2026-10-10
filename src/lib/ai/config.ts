/**
 * Environment + Anthropic client for the AI layer. SERVER-ONLY: never import
 * this module from client scripts (it reads secrets and pulls in the SDK).
 *
 * Env vars (see .env.example and docs/AI-ARCHITECTURE.md):
 *   ANTHROPIC_API_KEY        – Claude API key. Missing/empty → demo mode.
 *   ANTHROPIC_MODEL          – model override (default "claude-opus-5-5").
 *   AI_RATE_LIMIT_PER_HOUR   – requests per IP per rolling hour (default 20).
 *   AI_DAILY_CAP             – live Claude calls per UTC day, site-wide (default 2000).
 *   AI_FALLBACKS             – "default" (server-side refusal fallbacks, default) or "off".
 *   ANTHROPIC_BASE_URL       – tests only (mock server). Read from process.env at
 *                              runtime only, so it is never baked into a build.
 *
 * Values are read from `import.meta.env` (Vite/Astro: includes `.env` files in
 * dev and is inlined into the *server* bundle at build time) with a
 * `process.env` fallback (Vercel serverless runtime, shell variables).
 */
import Anthropic from '@anthropic-ai/sdk';
import type { AiMode } from './types';

export const DEFAULT_MODEL = 'claude-opus-5-5';
export const DEFAULT_RATE_LIMIT_PER_HOUR = 20;
export const DEFAULT_DAILY_CAP = 2000;

/** Beta header that enables `fallbacks: "default"` (scalar form). */
export const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

type EnvKey =
  | 'ANTHROPIC_API_KEY'
  | 'ANTHROPIC_MODEL'
  | 'AI_RATE_LIMIT_PER_HOUR'
  | 'AI_DAILY_CAP'
  | 'AI_FALLBACKS';

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function processEnv(key: string): string | undefined {
  // `process` does not exist in every runtime (e.g. edge); guard it.
  if (typeof process === 'undefined' || !process.env) return undefined;
  return clean(process.env[key]);
}

/**
 * Static `import.meta.env.X` accesses are required so Vite/Astro can resolve
 * them (dynamic `import.meta.env[key]` is not replaced at build time).
 */
function metaEnv(key: EnvKey): string | undefined {
  switch (key) {
    case 'ANTHROPIC_API_KEY':
      return clean(import.meta.env.ANTHROPIC_API_KEY);
    case 'ANTHROPIC_MODEL':
      return clean(import.meta.env.ANTHROPIC_MODEL);
    case 'AI_RATE_LIMIT_PER_HOUR':
      return clean(import.meta.env.AI_RATE_LIMIT_PER_HOUR);
    case 'AI_DAILY_CAP':
      return clean(import.meta.env.AI_DAILY_CAP);
    case 'AI_FALLBACKS':
      return clean(import.meta.env.AI_FALLBACKS);
  }
}

/** Reads one AI env var: import.meta.env first, then process.env. */
export function readEnv(key: EnvKey): string | undefined {
  return metaEnv(key) ?? processEnv(key);
}

function positiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** True when an API key is configured → real Claude calls. */
export function isLive(): boolean {
  return readEnv('ANTHROPIC_API_KEY') !== undefined;
}

export function aiMode(): AiMode {
  return isLive() ? 'live' : 'demo';
}

/** Model id for every AI feature. */
export function model(): string {
  return readEnv('ANTHROPIC_MODEL') ?? DEFAULT_MODEL;
}

export function rateLimitPerHour(): number {
  return positiveInt(readEnv('AI_RATE_LIMIT_PER_HOUR'), DEFAULT_RATE_LIMIT_PER_HOUR);
}

export function dailyCap(): number {
  return positiveInt(readEnv('AI_DAILY_CAP'), DEFAULT_DAILY_CAP);
}

/**
 * Server-side refusal fallbacks are on unless AI_FALLBACKS=off (e.g. when
 * ANTHROPIC_MODEL points at a model or platform that rejects `fallbacks`).
 */
export function fallbacksEnabled(): boolean {
  const raw = readEnv('AI_FALLBACKS')?.toLowerCase();
  return raw !== 'off' && raw !== 'false' && raw !== '0';
}

/** Test-only override (mock server). Runtime process.env only — never inlined. */
export function baseUrl(): string | undefined {
  return processEnv('ANTHROPIC_BASE_URL');
}

let cachedClient: Anthropic | null = null;
let cachedKey = '';

/**
 * Lazy singleton Anthropic client. Throws if called in demo mode, so always
 * branch on `isLive()` first. Recreated if the key/base URL changes (tests).
 */
export function anthropic(): Anthropic {
  const apiKey = readEnv('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('anthropic() called without ANTHROPIC_API_KEY — check isLive() first (demo mode).');
  }
  const url = baseUrl();
  const key = `${apiKey}|${url ?? ''}`;
  if (!cachedClient || cachedKey !== key) {
    cachedClient = new Anthropic({
      apiKey,
      ...(url ? { baseURL: url } : {}),
      // Public endpoints on a 60 s serverless budget: one retry, bounded wait.
      maxRetries: 1,
      timeout: 55_000,
    });
    cachedKey = key;
  }
  return cachedClient;
}
