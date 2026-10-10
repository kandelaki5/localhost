// AI Lab screenshots in demo mode: runs every feature and captures idle + result states.
//   node design/build/ai-lab/shoot-ai-lab.mjs [baseUrl=http://127.0.0.1:4523] [--only=photo,proposal,…] [--out=dir]
// Based on scripts/shoot.mjs (preinstalled Chromium + global Playwright).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:4523').replace(/\/$/, '');
const only = (args.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const outDir = (args.find((a) => a.startsWith('--out=')) ?? '').slice(6) || dirname(fileURLToPath(import.meta.url));
mkdirSync(outDir, { recursive: true });
const want = (k) => !only.length || only.includes(k);

const browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const problems = [];

async function open(path, width, height = 900, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: opts.reducedMotion ?? 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`${path} @${width} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${path} @${width} console: ${m.text()}`); });
  await page.goto(base + path, { waitUntil: 'networkidle', timeout: 90000 });
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
  // horizontal overflow check
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 0) problems.push(`${path} @${width}: horizontal overflow ${overflow}px`);
  return { page, ctx };
}

async function ready(page, id) {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  await page.waitForFunction((i) => document.getElementById(i)?.dataset.labState === 'ready', id, { timeout: 30000 });
}

async function shot(page, selector, file) {
  await page.waitForTimeout(400);
  await page.locator(selector).first().screenshot({ path: join(outDir, file), animations: 'disabled' });
  console.log('saved', file);
}

for (const width of [1440, 390]) {
  const tag = width;
  if (want('hero')) {
    const { page, ctx } = await open('/ai-lab/', width);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(outDir, `hero-${tag}.png`), animations: 'disabled' });
    console.log('saved', `hero-${tag}.png`);
    await shot(page, '#trip-designer', `teaser-${tag}.png`);
    await ctx.close();
  }

  if (want('photo')) {
    const { page, ctx } = await open('/ai-lab/', width);
    await ready(page, 'photo-match');
    await shot(page, '#photo-match', `photo-idle-${tag}.png`);
    await page.click('#photo-match [data-sample="tuscany-vineyard"]');
    await page.waitForSelector('#photo-match [data-results]:not([hidden])', { timeout: 30000 });
    await page.waitForTimeout(1200);
    await shot(page, '#photo-match', `photo-result-${tag}.png`);
    await ctx.close();
  }

  if (want('proposal')) {
    const { page, ctx } = await open('/ai-lab/', width);
    await ready(page, 'proposal');
    await shot(page, '#proposal', `proposal-idle-${tag}.png`);
    await page.click('#proposal [data-submit]');
    await page.waitForSelector('#proposal [data-sheet]:not([hidden])', { timeout: 30000 });
    await page.waitForTimeout(1500);
    await shot(page, '#proposal', `proposal-result-${tag}.png`);
    if (width === 1440) {
      await page.emulateMedia({ media: 'print' });
      await page.pdf({ path: join(outDir, 'proposal-print.pdf'), format: 'A4', printBackground: true }).catch(() => {});
      await page.screenshot({ path: join(outDir, `proposal-print-${tag}.png`), fullPage: true });
      console.log('saved', `proposal-print-${tag}.png`);
      await page.emulateMedia({ media: 'screen' });
    }
    await ctx.close();
  }

  if (want('policy')) {
    const { page, ctx } = await open('/ai-lab/', width);
    await ready(page, 'policy-qa');
    await shot(page, '#policy-qa', `policy-idle-${tag}.png`);
    await page.click('#policy-qa [data-ask="animals"]');
    await page.waitForSelector('#policy-qa [data-turn][data-done]', { timeout: 30000 });
    await page.click('#policy-qa [data-ask="hotels"]');
    await page.waitForFunction(() => document.querySelectorAll('#policy-qa [data-turn][data-done]').length >= 2, null, { timeout: 30000 });
    await page.waitForTimeout(800);
    await shot(page, '#policy-qa', `policy-result-${tag}.png`);
    await ctx.close();
  }

  if (want('triage')) {
    const { page, ctx } = await open('/ai-lab/', width);
    await ready(page, 'triage');
    await shot(page, '#triage', `triage-idle-${tag}.png`);
    await page.click('#triage [data-sample="de-transfer-complaint"]');
    await page.waitForSelector('#triage [data-card]:not([hidden])', { timeout: 30000 });
    await page.waitForTimeout(800);
    await shot(page, '#triage', `triage-result-${tag}.png`);
    await ctx.close();
  }

  if (want('mcp')) {
    const { page, ctx } = await open('/ai-lab/', width);
    await ready(page, 'mcp');
    await shot(page, '#mcp', `mcp-${tag}.png`);
    await shot(page, '.lab-how', `how-${tag}.png`);
    await ctx.close();
  }
}

if (want('ka')) {
  const { page, ctx } = await open('/ka/ai-lab/', 1440);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(outDir, 'ka-hero-1440.png') });
  await ready(page, 'proposal');
  await page.click('#proposal [data-submit]');
  await page.waitForSelector('#proposal [data-sheet]:not([hidden])', { timeout: 30000 });
  await page.waitForTimeout(1200);
  await shot(page, '#proposal', 'ka-proposal-result-1440.png');
  await ctx.close();
}

if (want('full')) {
  const { page, ctx } = await open('/ai-lab/', 1440);
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(outDir, 'full-1440.png'), fullPage: true, animations: 'disabled' });
  console.log('saved full-1440.png');
  await ctx.close();
}

await browser.close();
if (problems.length) console.log('\nPROBLEMS:\n' + problems.join('\n'));
else console.log('\nno console errors, no horizontal overflow');
