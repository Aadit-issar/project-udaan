// Verifies the WebXR entry path with a *mocked* navigator.xr (not a hardware test).
import { chromium } from 'playwright';
import { homedir } from 'node:os';
import { join } from 'node:path';
const url = process.argv[2] ?? 'https://aadit-issar.github.io/project-udaan/';
const exe = process.env.CHROME ?? join(homedir(), 'AppData/Local/ms-playwright/chromium-1254/chrome-win64/chrome.exe');
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.addInitScript(() => {
  window.__xrCalls = [];
  const xr = {
    isSessionSupported: async (mode) => mode === 'immersive-vr',
    requestSession: async (mode, init) => { window.__xrCalls.push({ mode, init }); throw new DOMException('mock: no device', 'NotSupportedError'); },
    addEventListener() {}, removeEventListener() {},
  };
  Object.defineProperty(navigator, 'xr', { value: xr, configurable: true });
});
await page.goto(url + '#/focus');
await page.evaluate(() => localStorage.setItem('udaan:v1', JSON.stringify({ version: 1, onboarded: true, tasks: [], sessions: [], events: [], settings: {}, timer: null })));
await page.reload();
const btn = page.getByRole('button', { name: /Enter VR/ });
await btn.waitFor({ timeout: 20000 });
console.log('Enter VR button visible:', await btn.isVisible());
await btn.click();
await page.waitForTimeout(500);
console.log('requestSession calls:', JSON.stringify(await page.evaluate(() => window.__xrCalls)));
console.log('error note shown:', await page.locator('.xr-note[role=alert]').textContent().catch(() => 'none'));
await browser.close();
