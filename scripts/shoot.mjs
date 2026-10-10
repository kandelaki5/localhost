// Screenshot helper: node scripts/shoot.mjs <url> <out.png> [width=1440] [height=900] [--full] [--wait=ms] [--selector=css]
// Uses the preinstalled Chromium + global Playwright in this environment.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const [url, out, w = '1440', h = '900', ...flags] = process.argv.slice(2);
if (!url || !out) { console.error('usage: node scripts/shoot.mjs <url> <out.png> [width] [height] [--full] [--wait=ms] [--selector=css] [--dark]'); process.exit(1); }
const full = flags.includes('--full');
const dark = flags.includes('--dark');
const wait = Number((flags.find(f => f.startsWith('--wait=')) || '--wait=600').split('=')[1]);
const selector = (flags.find(f => f.startsWith('--selector=')) || '').slice(11);
const browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, colorScheme: dark ? 'dark' : 'light' });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
if (full) { // trigger lazy images
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); });
}
await page.waitForTimeout(wait);
if (selector) { await page.locator(selector).first().screenshot({ path: out }); }
else { await page.screenshot({ path: out, fullPage: full }); }
await browser.close();
if (errors.length) { console.log('Browser errors:\n' + errors.join('\n')); }
console.log('saved', out);
