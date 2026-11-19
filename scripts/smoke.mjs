// Browser smoke test: node scripts/smoke.mjs [url] [outDir]
// Walks onboarding → demo → Help Me Start → planner → focus room (3D) → world → settings,
// collecting console errors, failed requests, and screenshots.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] ?? 'https://aadit-issar.github.io/project-udaan/';
const out = process.argv[3] ?? 'screenshots';
mkdirSync(out, { recursive: true });
const exe = process.env.CHROME ?? join(homedir(), 'AppData/Local/ms-playwright/chromium-1254/chrome-win64/chrome.exe');

const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const problems = [];
const run = async (name, viewport) => {
  const page = await browser.newPage({ viewport });
  page.on('console', (m) => m.type() === 'error' && problems.push(`[${name}] console: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`[${name}] pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[${name}] failed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => r.status() >= 400 && problems.push(`[${name}] HTTP ${r.status()} ${r.url()}`));
  const shot = (n) => page.screenshot({ path: `${out}/${name}-${n}.png` });

  await page.goto(url, { waitUntil: 'networkidle' });
  await shot('01-onboarding');
  await page.getByRole('button', { name: 'Explore demo' }).click();
  await page.getByRole('heading', { name: /One small step first/ }).waitFor();
  await shot('02-dashboard');
  await page.getByRole('button', { name: 'Help Me Start' }).first().click();
  await page.getByText(/Recommended because/).first().waitFor();
  await shot('03-help-me-start');
  await page.getByRole('button', { name: /Break into steps/ }).click();
  await page.getByText('Task Quest').first().waitFor();
  await shot('04-planner-quest');
  await page.goto(url + '#/focus');
  await page.locator('.stage canvas').waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500);
  await shot('05-focus-room');
  await page.getByRole('button', { name: /Demo: 1-minute session/ }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /skip to the end/ }).click();
  await page.waitForTimeout(400);
  await shot('06-focus-done');
  await page.goto(url + '#/world');
  await page.locator('.stage canvas').waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500);
  await shot('07-world');
  await page.goto(url + '#/settings');
  await page.waitForTimeout(300);
  await shot('08-settings');
  const xr = await page.evaluate(() => ('xr' in navigator ? 'navigator.xr present' : 'navigator.xr absent'));
  console.log(`[${name}] ${xr}`);
  await page.close();
};

await run('desktop', { width: 1440, height: 900 });
await run('mobile', { width: 390, height: 844 });
await browser.close();
console.log(problems.length ? problems.join('\n') : 'No console errors or failed requests.');
