const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { build } = require('esbuild');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const repo = path.resolve(root, '../..');
const marketingMode = process.argv.includes('--marketing');
const sourceRef = process.argv.slice(2).find(arg => arg !== '--marketing');
assert(!(marketingMode && sourceRef), 'Marketing CTA acceptance requires the current receiving tree');
const git = (...args) => execFileSync('git', ['--no-optional-locks', ...args], { cwd: repo, encoding: 'utf8', windowsHide: true });
const source = git('rev-parse', '--verify', `${sourceRef || 'HEAD'}^{commit}`).trim();
const output = path.join(repo, '.tmp', 'account-role-browser', source.slice(0, 8));
const origin = 'http://127.0.0.1:40719';
const results = [];
const fixture = path.join(__dirname, 'fixtures/account-role-api.ts');
const apiPattern = /(?:^|\/)services\/(?:api|walletLogin)$/;
const panelPattern = /^\.\/dashboard\/(?:\w+Panel|TokenRedirect)$/;
const digest = contents => createHash('sha256').update(contents).digest('hex');
const marketingRoot = path.join(repo, 'apps/marketing');
const marketingHtml = marketingMode ? fs.readFileSync(path.join(marketingRoot, 'index.html'), 'utf8') : null;
const marketingInputs = marketingMode ? ['index.html', 'site.css', 'assets/renovation-hero-v1.png'].map(file => ({
  file, sha256: digest(fs.readFileSync(path.join(marketingRoot, file))),
})) : [];
const componentInputs = ['src/pages/Dashboard.tsx', 'src/pages/dashboard/AccountAccess.tsx'].map(file => ({
  file, sha256: digest(sourceRef ? git('show', `${source}:apps/web/${file}`) : fs.readFileSync(path.join(root, file))),
}));

async function bundle() {
  const result = await build({
    absWorkingDir: root, bundle: true, write: false, minify: true, jsx: 'automatic',
    platform: 'browser', format: 'iife', define: { 'process.env.NODE_ENV': '"production"' },
    stdin: { contents: `import {createRoot} from 'react-dom/client';
      import {createHashRouter, RouterProvider, Routes, Route, useLocation} from 'react-router';
      import Dashboard from './src/pages/Dashboard';
      function Query() { return <output data-query>{useLocation().search}</output>; }
      const router = createHashRouter([{path: '*', element: <><Query/><Routes>
        <Route path="/dashboard" element={<Dashboard/>}/></Routes></>}]);
      createRoot(document.getElementById('root')).render(<RouterProvider router={router}/>);`,
      resolveDir: root, loader: 'tsx' },
    plugins: [{ name: 'local-role-fixture', setup(api) {
      api.onResolve({ filter: apiPattern }, () => ({ path: fixture }));
      // Authenticated panels are outside this test; real Dashboard/router/form remain.
      api.onResolve({ filter: panelPattern }, args => ({ path: args.path.split('/').pop(), namespace: 'role-panel' }));
      api.onLoad({ filter: /.*/, namespace: 'role-panel' }, args => ({ contents:
        `export function ${args.path}({user}) {return <div data-role-panel>{user?.role || 'panel'}</div>}`, loader: 'tsx', resolveDir: root }));
      if (sourceRef) api.onLoad({ filter: /[\\/]src[\\/]pages[\\/](?:Dashboard|dashboard[\\/]AccountAccess)\.tsx$/ }, args => ({
        contents: git('show', `${source}:${path.relative(repo, args.path).replaceAll('\\', '/')}`), loader: 'tsx', resolveDir: path.dirname(args.path),
      }));
    } }],
  });
  return result.outputFiles[0].text;
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const code = await bundle();
  const browser = await chromium.launch({ channel: process.env.GCSC_BROWSER_CHANNEL || undefined, headless: true });
  try {
    async function test(name, run, seed) {
      const context = await browser.newContext({ viewport: { width: 1024, height: 900 }, reducedMotion: 'reduce' });
      const errors = [], unexpected = [];
      try {
        await context.addInitScript(role => {
          if (role) { window.__roleSeed = role; localStorage.setItem('gcsc_auth_token', 'synthetic-session'); }
        }, seed);
        await context.route('**/*', route => {
          const url = new URL(route.request().url());
          if (marketingMode && url.origin === origin) {
            if (url.pathname === '/marketing/') return route.fulfill({ contentType: 'text/html', body: marketingHtml });
            if (url.pathname === '/marketing/site.css') return route.fulfill({ contentType: 'text/css', path: path.join(marketingRoot, 'site.css') });
            if (url.pathname === '/marketing/assets/renovation-hero-v1.png') return route.fulfill({ contentType: 'image/png', path: path.join(marketingRoot, 'assets/renovation-hero-v1.png') });
          }
          if (url.origin === origin && url.pathname === '/') return route.fulfill({ contentType: 'text/html', body:
            '<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="icon" href="data:,"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>' });
          if (url.origin === origin && url.pathname === '/fixture.js') return route.fulfill({ contentType: 'text/javascript', body: code });
          unexpected.push(route.request().url());
          return route.abort();
        });
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        page.on('pageerror', error => errors.push(error.message));
        await run(page);
        assert.deepEqual(errors, [], 'Unexpected browser errors');
        assert.deepEqual(unexpected, [], 'Unexpected network request');
        results.push({ name, pass: true });
      } catch (error) { results.push({ name, pass: false, error: error.message, errors, unexpected }); }
      finally { await context.close(); }
    }
    const go = (page, query) => page.goto(`${origin}/#/dashboard${query}`);
    const select = async (page, role) => {
      const button = page.getByRole('button', { name: role === 'homeowner' ? /^Owner/ : /^Builder/ });
      await button.waitFor();
      await page.waitForFunction(role => [...document.querySelectorAll('button')].some(button =>
        button.textContent.startsWith(role === 'homeowner' ? 'Owner' : 'Builder') && button.style.borderColor === 'rgb(123, 47, 247)'), role);
    };
    const fill = async page => {
      await page.getByPlaceholder('Full name', { exact: true }).fill('Synthetic Test');
      await page.getByPlaceholder('Email', { exact: true }).fill('role-test@example.test');
      await page.getByPlaceholder('Password, minimum 8 characters').fill('SyntheticOnly-123!');
      await page.getByPlaceholder('Phone', { exact: true }).fill('+12025550123');
    };
    const send = async page => {
      await page.getByRole('button', { name: 'Create GCSC Account', exact: true }).click();
      await page.getByPlaceholder('6-digit code').waitFor();
    };
    const calls = page => page.evaluate(() => window.__roleTest.calls);
    if (marketingMode) for (const role of ['homeowner', 'contractor']) await test(`marketing ${role} link`, async page => {
      await page.goto(`${origin}/marketing/`);
      const link = page.locator('.pathway a').filter({ hasText: role === 'homeowner' ? 'Explore owner account' : 'Explore contractor account' });
      assert.equal(await link.count(), 1);
      const href = await link.getAttribute('href');
      assert.equal(href, `https://gcsc.store/#/dashboard?role=${role}`);
      const target = new URL(href);
      // Only the origin is mapped to the fixture; route and role remain from the real CTA.
      await link.evaluate((element, destination) => { element.href = destination; }, `${origin}${target.pathname}${target.search}${target.hash}`);
      await link.click();
      await select(page, role); await fill(page); await send(page);
      assert.equal((await calls(page))[0].input.role, role);
    });
    for (const [name, query, role] of [
      ['owner CTA', '?role=homeowner', 'homeowner'], ['contractor CTA', '?role=contractor', 'contractor'],
      ['default', '', 'contractor'], ['invalid role', '?role=admin', 'contractor'],
      ['duplicate role', '?role=contractor&role=homeowner', 'contractor'],
    ]) await test(name, async page => {
      await go(page, query); await select(page, role); await fill(page); await send(page);
      const requests = await calls(page);
      assert.equal(requests[0].input.role, role);
      assert.equal(requests[0].input.verificationMode, 'preferred');
    });
    await test('manual role choice', async page => {
      await go(page, '?role=homeowner'); await select(page, 'homeowner');
      await page.getByRole('button', { name: /^Builder/ }).click();
      await fill(page); await send(page); assert.equal((await calls(page))[0].input.role, 'contractor');
    });
    await test('query change before submit', async page => {
      await go(page, '?role=contractor'); await select(page, 'contractor');
      await page.evaluate(() => { location.hash = '/dashboard?role=homeowner'; });
      await select(page, 'homeowner'); await fill(page); await send(page);
      assert.equal((await calls(page))[0].input.role, 'homeowner');
    });
    await test('pending code keeps original identity on resend', async page => {
      await go(page, '?role=homeowner'); await select(page, 'homeowner'); await fill(page); await send(page);
      await page.evaluate(() => { location.hash = '/dashboard?role=contractor'; });
      // Observe the router commit rather than only the mutable browser URL.
      await page.waitForFunction(() => document.querySelector('[data-query]').textContent === '?role=contractor');
      await page.getByPlaceholder('6-digit code').fill('654321');
      await page.getByRole('button', { name: 'Send code again', exact: true }).click();
      await page.waitForFunction(() => window.__roleTest.calls.length === 2);
      await page.waitForFunction(() => document.querySelector('input[placeholder="6-digit code"]').value === '');
      const requests = await calls(page);
      assert.deepEqual(requests[1].input, requests[0].input);
      await page.getByPlaceholder('6-digit code').fill('123456');
      await page.getByRole('button', { name: 'Verify and Open Dashboard', exact: true }).click();
      await page.locator('[data-role-panel]').waitFor();
      assert.equal((await calls(page))[2].input.role, 'homeowner');
    });
    await test('in-flight registration locks request identity', async page => {
      await go(page, '?role=homeowner'); await select(page, 'homeowner'); await fill(page);
      await page.evaluate(() => { window.__roleTest.deferred = true; });
      await page.getByRole('button', { name: 'Create GCSC Account', exact: true }).click();
      await page.waitForFunction(() => Boolean(window.__roleTest.release));
      for (const placeholder of ['Full name', 'Email', 'Password, minimum 8 characters', 'Phone']) {
        assert.equal(await page.getByPlaceholder(placeholder, { exact: true }).isDisabled(), true);
      }
      assert.equal(await page.getByRole('button', { name: /^Builder/ }).isDisabled(), true);
      await page.evaluate(() => { location.hash = '/dashboard?role=contractor'; });
      await page.waitForFunction(() => document.querySelector('[data-query]').textContent === '?role=contractor');
      await select(page, 'homeowner');
      assert.equal(await page.getByRole('button', { name: /^Owner/ }).getAttribute('aria-pressed'), 'true');
      await page.evaluate(() => { window.__roleTest.release(); });
      await page.getByPlaceholder('6-digit code').waitFor();
      await page.evaluate(() => { window.__roleTest.deferred = false; });
      await page.getByRole('button', { name: 'Send code again', exact: true }).click();
      await page.waitForFunction(() => window.__roleTest.calls.length === 2);
      const requests = await calls(page);
      assert.equal(requests[0].input.role, 'homeowner');
      assert.deepEqual(requests[1].input, requests[0].input);
    });
    await test('authenticated role is not rewritten by query', async page => {
      await go(page, '?role=homeowner'); await page.locator('[data-role-panel]').waitFor();
      assert.equal(await page.locator('[data-role-panel]').innerText(), 'contractor');
      assert.deepEqual(await calls(page), []);
    }, 'contractor');
    const report = { source, sourceMode: sourceRef ? 'pinned two-component source' : 'working tree',
      componentInputs, marketingInputs, marketingOriginRemapped: marketingMode, bundleSha256: digest(code), browser: browser.version(),
      boundary: 'Real React/data-backed hash router/Dashboard/AccountAccess, synthetic API and authenticated panels; no actual server or external requests', results };
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    assert(results.every(result => result.pass), 'Account-role browser regression failed');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
