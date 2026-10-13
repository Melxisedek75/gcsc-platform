import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Render the actual Expo app with browser-only fixtures, never a live account/API.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = new URL(process.env.MOBILE_PREVIEW_URL || 'http://localhost:8093');
assert(['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname), 'Loopback preview only');
const output = fileURLToPath(new URL('../.tmp/mobile-design-verification/', import.meta.url));
mkdirSync(output, { recursive: true });
const result = { mode: 'browser UI with synthetic fixtures; NOT native/auth/payment acceptance', checks: [], errors: [], consoleErrors: [], blockedRequests: [] };
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });

async function createPage(role, viewport) {
  const user = role ? {
    id: 99991, role, email: 'design.check.with.a.long.address@example.invalid',
    full_name: 'Design Test Contractor', phone: '', verification_status: 'unverified',
    wallet: { account: 'uitest111111', permission: 'active', verified: false },
  } : null;
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin.origin) return route.continue();
    if (url.origin === 'http://127.0.0.1:10000') {
      if (url.pathname === '/api/auth/profile' && user) return route.fulfill({ json: { user } });
      if (url.pathname === '/api/projects') return route.fulfill({ json: { projects: [] } });
      return route.fulfill({ status: 503, json: { error: 'UI fixture: backend not connected' } });
    }
    result.blockedRequests.push(url.origin + url.pathname);
    return route.abort();
  });
  await context.addInitScript((fixture) => {
    localStorage.setItem('@gcsc/onboarding/completed', 'true');
    if (fixture) {
      localStorage.setItem('@gcsc/auth/token', 'synthetic-ui-fixture-not-a-jwt');
      localStorage.setItem('@gcsc/auth/user', JSON.stringify(fixture));
    }
  }, user);
  const page = await context.newPage();
  page.on('pageerror', (error) => result.errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') result.consoleErrors.push(message.text());
  });
  page.setDefaultTimeout(30000);
  return { page, context };
}

async function checkBounds(page, label) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: horizontal overflow`);
  const buttons = await page.getByRole('button').or(page.getByRole('tab')).evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { label: element.getAttribute('aria-label') || element.textContent, width: rect.width, height: rect.height };
  }).filter((item) => item.width > 0 && item.height > 0));
  result.checks.push({ label, buttons });
  for (const button of buttons) assert(button.width >= 48 && button.height >= 48, `${label}: small target ${button.label}`);
}

try {
  const deadline = Date.now() + 120000;
  let ready = false;
  while (!ready && Date.now() < deadline) {
    try { ready = (await fetch(origin, { method: 'HEAD', signal: AbortSignal.timeout(3000) })).ok; } catch {}
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert(ready, 'Preview server did not become ready within 120 seconds');
  for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 768, height: 1024 }]) {
    const { page, context } = await createPage(null, viewport);
    try {
      await page.goto(new URL('/sign-in', origin).href, { waitUntil: 'networkidle', timeout: 120000 });
      const signIn = page.getByRole('button', { name: 'Sign in', exact: true });
      await signIn.click();
      await page.getByRole('alert').filter({ hasText: 'Email and password required' }).waitFor();
      await page.getByLabel('Email', { exact: true }).fill('qa@example.invalid');
      const password = page.getByLabel('Password', { exact: true });
      await password.fill('synthetic-ui-example');
      assert.equal(await password.evaluate((input) => input.type), 'password');
      await page.getByRole('button', { name: 'Show password', exact: true }).click();
      assert.equal(await password.evaluate((input) => input.type), 'text');
      await page.getByRole('button', { name: 'Hide password', exact: true }).click();
      assert.equal(await password.evaluate((input) => input.type), 'password');
      await checkBounds(page, `sign-in-${viewport.width}`);
      const buttonSize = await signIn.boundingBox();
      assert(buttonSize.height >= 56 && buttonSize.width >= 48);
      await page.screenshot({ path: `${output}/sign-in-${viewport.width}.png`, fullPage: true });
      await page.getByRole('link', { name: 'Create account', exact: true }).click();
      await page.getByRole('textbox', { name: 'Email', exact: true }).waitFor();
      assert(new URL(page.url()).pathname.endsWith('/sign-up'));
      result.checks.push({ label: `sign-in-interactions-${viewport.width}`, passed: true });
    } finally { await context.close(); }
  }

  for (const role of ['contractor', 'homeowner']) {
    const { page, context } = await createPage(role, { width: 320, height: 740 });
    try {
      await page.goto(origin.href, { waitUntil: 'networkidle', timeout: 120000 });
      const profile = page.getByRole('tab', { name: 'Profile', exact: true });
      await profile.waitFor();
      assert.equal(await page.getByRole('tab').count(), 5, `${role}: only primary tabs visible`);
      await checkBounds(page, `${role}-tabs-320`);
      await page.screenshot({ path: `${output}/${role}-jobs-320.png`, fullPage: true });
      await profile.click();
      await page.getByText('design.check.with.a.long.address@example.invalid', { exact: true }).waitFor();
      assert(await page.getByText('design.check.with.a.long.address@example.invalid', { exact: true }).evaluate((element) => element.scrollWidth <= element.clientWidth + 1), `${role}: profile value must wrap, not clip`);
      if (role === 'contractor') {
        await page.getByText('Reviews unavailable', { exact: true }).waitFor();
        assert.equal(await page.getByText('4.8', { exact: true }).count(), 0);
      }
      await checkBounds(page, `${role}-profile-320`);
      await page.screenshot({ path: `${output}/${role}-profile-320.png`, fullPage: true });
      await page.setViewportSize({ width: 768, height: 1024 });
      await checkBounds(page, `${role}-profile-768`);
      await page.screenshot({ path: `${output}/${role}-profile-768.png`, fullPage: true });
      result.checks.push({ label: `${role}-navigation`, passed: true });
    } finally { await context.close(); }
  }
  assert.deepEqual(result.errors, [], 'No uncaught browser runtime errors');
  assert.deepEqual(result.consoleErrors, [], 'No browser console errors');
  assert.deepEqual(result.blockedRequests, [], 'No unexpected external services');
  result.passed = true;
} catch (error) {
  result.passed = false;
  result.failure = error.stack;
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync(`${output}/result.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
