const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { build } = require('esbuild');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const origin = 'http://127.0.0.1:40721';
const hash = value => createHash('sha256').update(value).digest('hex');
const preview = id => ({ id, title: `Project preview ${id}`, category: 'Kitchen',
  budget_min: 1000, budget_max: 2000, timeline_days: 14, status: 'open', published: true });
const brief = id => ({ id, title: `Private title ${id}`, description: `Private brief ${id}`,
  category: 'Kitchen', budget_min: 1000, budget_max: 2000, timeline_days: 14,
  status: 'open', published_at: '2026-09-30T00:00:00.000Z' });
const deny = { error: 'Project details unavailable', code: 'project_details_unavailable' };

async function main() {
  const bundled = await build({
    absWorkingDir: root, bundle: true, write: false, minify: true, jsx: 'automatic',
    platform: 'browser', format: 'iife', define: {
      'import.meta.env': '{}',
      'process.env.NODE_ENV': '"production"', 'import.meta.env.VITE_API_URL': JSON.stringify(origin),
      'import.meta.env.VITE_ENABLE_LEGACY_ESCROW_WORKFLOW': '"false"',
    },
    stdin: { contents: `import {useState} from 'react';
      import {createRoot} from 'react-dom/client'; import {flushSync} from 'react-dom';
      import {HashRouter} from 'react-router';
      import {ProjectsPanel} from './src/pages/dashboard/ProjectsPanel';
      import {api} from './src/services/api';
      window.readBrief=id=>api.getProjectDetails(id);
      function App() {
        const [user,setUser]=useState({id:21,role:'contractor',full_name:'Fixture',email:'fixture@example.test'});
        window.changeUser=(id,role='contractor')=>flushSync(()=>{api.setToken('fixture-'+id);setUser({...user,id,role})});
        return <ProjectsPanel user={user} onOpenChat={()=>{}} onEditStateChange={()=>{}}/>;
      }
      api.setToken('fixture-21');
      createRoot(document.getElementById('root')).render(<HashRouter><App/></HashRouter>);`,
      resolveDir: root, loader: 'tsx' },
  });
  const code = bundled.outputFiles[0].text;
  const browser = await chromium.launch({ channel: process.env.GCSC_BROWSER_CHANNEL || undefined, headless: true });
  const results = [];
  try {
    async function test(name, run, width = 1280) {
      if (process.env.GCSC_BROWSER_TEST && !name.includes(process.env.GCSC_BROWSER_TEST)) return;
      console.log(`RUN ${name}`);
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const errors = [], unexpected = [], calls = [];
      let handler = null;
      const json = (route, body, status = 200) => route.fulfill({ status,
        contentType: 'application/json', headers: { 'Cache-Control': 'private, no-store' }, body: JSON.stringify(body) });
      const state = { calls, json, setHandler: fn => { handler = fn; } };
      try {
        await context.addInitScript(() => {
          window.fetches = [];
          const original = window.fetch;
          window.fetch = async (url, options) => {
            const item = { url, cache: options?.cache, done: false }; window.fetches.push(item);
            try { return await original(url, options); } finally { item.done = true; }
          };
        });
        await context.route('**/*', async route => {
          const url = new URL(route.request().url());
          if (url.origin !== origin) { unexpected.push(url.href); return route.abort(); }
          if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body:
            '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>' });
          if (url.pathname === '/fixture.js') return route.fulfill({ contentType: 'text/javascript', body: code });
          const call = { path: url.pathname, method: route.request().method(),
            authorization: route.request().headers().authorization, body: route.request().postDataJSON() };
          calls.push(call);
          if (handler && await handler(route, call)) return;
          if (call.path === '/api/projects') return json(route, { projects: [preview(11), preview(12)] });
          if (call.path === '/api/projects/my/projects') return json(route, { projects: [] });
          const match = call.path.match(/^\/api\/projects\/(11|12)(\/details)?$/);
          if (match) return json(route, { project: match[2] ? brief(Number(match[1])) : preview(Number(match[1])) });
          if (call.path === '/api/bids' && call.method === 'POST') return json(route, { bid: { id: 61, ...call.body } }, 201);
          unexpected.push(url.href); return route.abort();
        });
        const page = await context.newPage(); page.setDefaultTimeout(4000); page.setDefaultNavigationTimeout(10000);
        page.on('pageerror', error => errors.push(error.message));
        await run(page, state);
        assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
        results.push({ name, pass: true });
      } catch (error) { results.push({ name, pass: false, error: error.message, errors, unexpected }); }
      finally { await context.close(); console.log(JSON.stringify(results.at(-1))); }
    }
    const go = page => page.goto(origin);
    const view = (page, id) => page.getByRole('row').filter({ hasText: `#${id}` }).getByRole('button', { name: 'View', exact: true }).click();
    const shown = (page, id) => page.locator('aside').getByText(`Private brief ${id}`, { exact: true }).waitFor();
    const noPrivate = async page => assert.doesNotMatch(await page.locator('aside').innerText(), /Private (brief|title)/);
    const noComposer = async page => {
      assert.equal(await page.getByRole('button', { name: /Prepare Bid|Send Bid/ }).count(), 0);
      await noPrivate(page);
    };
    const compose = async page => {
      await page.getByRole('button', { name: 'Prepare Bid', exact: true }).click();
      await page.getByPlaceholder('Bid amount', { exact: true }).fill('1500');
      await page.getByPlaceholder('Explain your scope, materials approach, and milestone plan.').fill('Fixture proposal');
    };
    for (const width of [1280, 390]) await test(`paid brief and real API-client bid at ${width}`, async (page, s) => {
      await go(page); await view(page, 11); await shown(page, 11); await compose(page);
      await page.getByRole('button', { name: 'Send Bid', exact: true }).click();
      await page.getByText('Bid submitted. You can track it in My Bids.', { exact: true }).waitFor();
      const requests = s.calls.filter(call => call.path.endsWith('/details'));
      assert(requests.length > 0); assert(requests.every(call => call.authorization === 'Bearer fixture-21'));
      const posted = s.calls.filter(call => call.method === 'POST'); assert.equal(posted.length, 1);
      assert.deepEqual(posted[0].body, { project_id: 11, amount: 1500, proposed_timeline_days: 14, message: 'Fixture proposal' });
      const reads = await page.evaluate(() => window.fetches.filter(item => item.url.endsWith('/details')));
      assert(reads.every(item => item.cache === 'no-store'));
    }, width);
    for (const status of [401, 403, 404, 500]) await test(`details ${status} stays a preview`, async (page, s) => {
      s.setHandler(async (route, call) => {
        if (!call.path.endsWith('/details')) return false;
        await s.json(route, deny, status); return true;
      });
      await go(page); await view(page, 11);
      await page.getByRole('button', { name: 'Check access', exact: true }).waitFor();
      await noComposer(page); assert.equal(s.calls.filter(call => call.method === 'POST').length, 0);
    });
    await test('unpaid preview field cannot authorize a bid', async (page, s) => {
      s.setHandler(async (route, call) => {
        if (call.path === '/api/projects/11') { await s.json(route, { project: { ...preview(11), access_status: 'paid', description: 'Private brief forged' } }); return true; }
        if (call.path.endsWith('/details')) { await s.json(route, deny, 404); return true; }
        return false;
      });
      await go(page); await view(page, 11);
      await page.getByRole('button', { name: 'Check access', exact: true }).waitFor(); await noComposer(page);
    });
    await test('paid response is narrowed and free text is not HTML', async (page, s) => {
      s.setHandler(async (route, call) => {
        if (!call.path.endsWith('/details')) return false;
        await s.json(route, { project: { ...brief(11), description: '<img src=x onerror=alert(1)>',
          homeowner_id: 31, location: 'Not allowed', attachments: ['https://example.invalid/private'] }, bids: [] }); return true;
      });
      await go(page); await view(page, 11);
      await page.locator('aside').getByText('<img src=x onerror=alert(1)>', { exact: true }).waitFor();
      assert.equal(await page.locator('aside img').count(), 0);
      const value = await page.evaluate(() => window.readBrief(11));
      assert.deepEqual(Object.keys(value.project).sort(), Object.keys(brief(11)).sort());
      assert.doesNotMatch(await page.locator('aside').innerText(), /Not allowed/);
    });
    for (const reason of ['revoked', 'network', 'wrong-project', 'incomplete']) await test(`${reason} read clears previously paid state`, async (page, s) => {
      await go(page); await view(page, 11); await shown(page, 11); await compose(page);
      s.setHandler(async (route, call) => {
        if (!call.path.endsWith('/details')) return false;
        if (reason === 'network') await route.abort('failed');
        else if (reason === 'wrong-project') await s.json(route, { project: brief(12) });
        else if (reason === 'incomplete') await s.json(route, { project: { id: 11, status: 'open' } });
        else await s.json(route, deny, 404);
        return true;
      });
      await page.getByRole('button', { name: 'Refresh details', exact: true }).click();
      await page.getByRole('button', { name: 'Check access', exact: true }).waitFor(); await noComposer(page);
    });
    await test('revoked bid clears brief and composer', async (page, s) => {
      s.setHandler(async (route, call) => {
        if (call.path !== '/api/bids') return false;
        await s.json(route, { error: 'Paid access to this project required' }, 403); return true;
      });
      await go(page); await view(page, 11); await shown(page, 11); await compose(page);
      await page.getByRole('button', { name: 'Send Bid', exact: true }).click();
      await page.getByRole('button', { name: 'Check access', exact: true }).waitFor(); await noComposer(page);
    });
    await test('uncertain submission does not retry automatically', async (page, s) => {
      s.setHandler(async (route, call) => {
        if (call.path !== '/api/bids') return false;
        await route.abort('failed'); return true;
      });
      await go(page); await view(page, 11); await shown(page, 11); await compose(page);
      await page.getByRole('button', { name: 'Send Bid', exact: true }).click();
      await page.getByText('Could not confirm submission. Check My Bids before trying again.', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Send Bid', exact: true }).isDisabled(), true);
      assert.equal(s.calls.filter(call => call.path === '/api/bids').length, 1);
    });
    await test('late details cannot replace another selected project', async (page, s) => {
      let release;
      s.setHandler(async (route, call) => {
        if (call.path !== '/api/projects/11/details') return false;
        await new Promise(resolve => { release = async () => { await s.json(route, { project: brief(11) }); resolve(); }; }); return true;
      });
      await go(page); await view(page, 11);
      await page.waitForFunction(() => window.fetches.some(item => item.url.endsWith('/11/details')));
      assert(release); await view(page, 12); await shown(page, 12); await release();
      await page.waitForFunction(() => window.fetches.some(item => item.url.endsWith('/11/details') && item.done));
      await shown(page, 12); assert.doesNotMatch(await page.locator('aside').innerText(), /Private brief 11/);
    });
    for (const pending of [false, true]) await test(`account change clears ${pending ? 'pending' : 'visible'} private data`, async (page, s) => {
      let release;
      if (pending) s.setHandler(async (route, call) => {
        if (!call.path.endsWith('/details')) return false;
        await new Promise(resolve => { release = async () => { await s.json(route, { project: brief(11) }); resolve(); }; }); return true;
      });
      await go(page); await view(page, 11);
      if (pending) await page.waitForFunction(() => window.fetches.some(item => item.url.endsWith('/11/details')));
      else { await shown(page, 11); await compose(page); }
      const immediate = await page.evaluate(() => { window.changeUser(22); return document.querySelector('aside').textContent; });
      assert.doesNotMatch(immediate, /Private (brief|title)|Submit a bid/);
      if (pending) { assert(release); await release(); await page.waitForFunction(() => window.fetches.some(item => item.url.endsWith('/11/details') && item.done)); }
      await page.getByText('Select a project', { exact: true }).waitFor(); await noComposer(page);
      assert(s.calls.some(call => call.path === '/api/projects/my/projects' && call.authorization === 'Bearer fixture-22'));
    });
    await test('role change for the same user clears the paid view', async page => {
      await go(page); await view(page, 11); await shown(page, 11); await compose(page);
      const text = await page.evaluate(() => { window.changeUser(21, 'homeowner'); return document.querySelector('aside').textContent; });
      assert.doesNotMatch(text, /Private (brief|title)|Submit a bid/); await noComposer(page);
    });
    await test('old proposal failure cannot clear the next project', async (page, s) => {
      let release;
      s.setHandler(async (route, call) => {
        if (call.path !== '/api/bids') return false;
        await new Promise(resolve => { release = async () => { await s.json(route, deny, 403); resolve(); }; }); return true;
      });
      await go(page); await view(page, 11); await shown(page, 11); await compose(page);
      await page.getByRole('button', { name: 'Send Bid', exact: true }).click();
      await page.waitForFunction(() => window.fetches.some(item => item.url.endsWith('/api/bids')));
      assert(release); await view(page, 12); await shown(page, 12); await release();
      await page.waitForFunction(() => window.fetches.some(item => item.url.endsWith('/api/bids') && item.done)); await shown(page, 12);
    });
    await test('owner can still open a private draft and review bids', async (page, s) => {
      s.setHandler(async (route, call) => {
        if (call.authorization !== 'Bearer fixture-31') return false;
        const project = { ...preview(11), description: 'Owner draft', published: false };
        if (call.path === '/api/projects/my/projects') { await s.json(route, { projects: [project] }); return true; }
        if (call.path === '/api/projects/11') { await s.json(route, { project, bids: [] }); return true; }
        return false;
      });
      await go(page); await page.getByText('Open Projects', { exact: true }).waitFor();
      await page.evaluate(() => window.changeUser(31, 'homeowner')); await view(page, 11);
      await page.getByText('Owner draft', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Publish project', exact: true }).count(), 1);
      assert.equal(s.calls.filter(call => call.path.endsWith('/details')).length, 0);
    });
    for (const status of ['in_progress', 'completed']) await test(`accepted ${status} brief stays readable without escrow actions`, async (page, s) => {
      s.setHandler(async (route, call) => {
        const project = { ...brief(11), status, escrow_id: 81, homeowner_id: 31 };
        if (call.path === '/api/projects/my/projects') { await s.json(route, { projects: [project] }); return true; }
        if (call.path === '/api/projects/11') { await s.json(route, { project, bids: [] }); return true; }
        return false;
      });
      await go(page); await view(page, 11); await shown(page, 11);
      await page.getByText('You are assigned to this project.', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: /Prepare Bid|Send Bid|Accept and Create Escrow/ }).count(), 0);
      assert.equal(s.calls.filter(call => call.path.endsWith('/details') || call.path.startsWith('/api/escrow')).length, 0);
      await page.getByRole('button', { name: 'Refresh details', exact: true }).click(); await shown(page, 11);
      s.setHandler(async (route, call) => {
        if (call.path !== '/api/projects/11') return false;
        await s.json(route, deny, 404); return true;
      });
      await page.getByRole('button', { name: 'Refresh details', exact: true }).click();
      await page.getByText('Select a project', { exact: true }).waitFor(); await noPrivate(page);
    });
    const files = ['src/pages/dashboard/ProjectsPanel.tsx', 'src/services/api.ts', 'scripts/verify-paid-project-browser.cjs'];
    const report = { source: files.map(file => ({ file, sha256: hash(fs.readFileSync(path.join(root, file))) })),
      bundleSha256: hash(code), browser: browser.version(),
      filter: process.env.GCSC_BROWSER_TEST || null,
      boundary: 'Actual React ProjectsPanel and ApiClient, synthetic HTTP fixtures only; no running backend/DB, payments or external requests. Not visual acceptance.', results };
    const output = path.resolve(root, '../../.tmp/paid-project-browser'); fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    assert(results.every(result => result.pass), 'Paid-project browser regression failed');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
