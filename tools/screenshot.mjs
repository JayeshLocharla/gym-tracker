/**
 * Drives the app in a real browser at iPhone size and screenshots every screen,
 * exercising the flows rather than just loading pages.
 *
 *   node tools/mock-api.mjs --week 6 --seed-logs &
 *   node tools/screenshot.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.SHOT_DIR || join(root, 'screenshots');
const PORT = process.env.PORT || 8080;
const BASE = `http://localhost:${PORT}`;
const TOKEN = 'mock-token-0000000000000000000000000000';

mkdirSync(OUT, { recursive: true });

const errors = [];
let shot = 0;

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },      // iPhone 14/15
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  locale: 'en-GB'
});

await ctx.addInitScript(([url, token]) => {
  localStorage.setItem('gt.url', url);
  localStorage.setItem('gt.token', token);
}, [`${BASE}/api`, TOKEN]);

const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

const snap = async (name, opts = {}) => {
  await page.waitForTimeout(opts.wait ?? 420);
  const file = join(OUT, `${String(++shot).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: opts.full ?? false });
  console.log(`  ${file.replace(root + '/', '')}`);
};

const tab = async (name) => {
  await page.click(`[data-tab="${name}"]`);
  await page.waitForTimeout(320);
};

console.log('\nDriving the app:');

// --- setup screen (fresh device, no credentials) ---------------------------
const fresh = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const fp = await fresh.newPage();
await fp.goto(BASE, { waitUntil: 'networkidle' });
await fp.waitForTimeout(300);
await fp.screenshot({ path: join(OUT, `${String(++shot).padStart(2, '0')}-setup.png`) });
console.log(`  ${String(shot).padStart(2, '0')}-setup.png`);
await fresh.close();

// --- today -----------------------------------------------------------------
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-tab="today"]', { timeout: 10000 });
await page.waitForTimeout(500);
await snap('today');
await snap('today-full', { full: true });

// --- train: tick an exercise, swap a variant, open a coaching note ---------
await tab('train');
await snap('train');

const before = await page.locator('[data-toggle]').nth(3).getAttribute('aria-checked');
await page.locator('[data-toggle]').nth(3).click();
await page.waitForTimeout(700);
const after = await page.locator('[data-toggle]').nth(3).getAttribute('aria-checked');
console.log(`  · tick toggled ${before} -> ${after}`);
if (before === after) errors.push('Exercise tick did not change state');

await page.locator('[data-variant$=":2"]').first().click();
await page.waitForTimeout(700);
await page.locator('details summary').first().click();
await snap('train-interacted', { full: true });

// --- food: totals, picker, quantity, add ----------------------------------
await tab('food');
await snap('food');

const kcalBefore = await page.locator('.row-value.t-num').count();
await page.click('[data-add-food]');
await page.waitForTimeout(500);
await snap('food-picker');

await page.fill('#food-search', 'shrimp');
await page.waitForTimeout(300);
await snap('food-search');

await page.click('[data-food="Shrimp / prawns"]');
await page.waitForTimeout(500);
await snap('food-quantity');

await page.click('[data-qty="2"]');
await page.waitForTimeout(200);
await page.click('[data-action]');
await page.waitForTimeout(900);
await snap('food-added', { full: true });

const entries = await page.locator('[data-entry]').count();
console.log(`  · ${entries} entries after adding`);
if (entries < 1) errors.push('Food entry was not added');

// --- progress: charts, check-in -------------------------------------------
await tab('progress');
await page.waitForTimeout(600);
await snap('progress');
await snap('progress-full', { full: true });

await page.click('[data-checkin]');
await page.waitForTimeout(600);
await snap('checkin');

await page.fill('#ci-weight', '76.8');
await page.fill('#ci-waist', '85.5');
await page.fill('#ci-steps', '9100');
await page.fill('#ci-sleep', '7.4');
await page.fill('#ci-cardio', '2');
await page.click('[data-action]');
await page.waitForTimeout(1400);
await snap('progress-after-checkin', { full: true });

// --- plan ------------------------------------------------------------------
await tab('plan');
await snap('plan');
await page.locator('details summary').nth(1).click();
await page.locator('details summary').nth(2).click();
await page.waitForTimeout(300);
await snap('plan-expanded', { full: true });

await page.click('[data-edit-config]');
await page.waitForTimeout(500);
await snap('plan-settings');
await page.click('[data-close]');
await page.waitForTimeout(400);

console.log(`\n${shot} screenshots written to ${OUT.replace(root + '/', '')}/`);

if (errors.length) {
  console.log('\nErrors:');
  errors.forEach((e) => console.log('  ' + e));
} else {
  console.log('No console or page errors.');
}

await browser.close();
process.exit(errors.length ? 1 : 0);
