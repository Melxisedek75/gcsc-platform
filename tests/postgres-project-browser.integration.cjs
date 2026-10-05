const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const { once } = require('node:events');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const { validateLocalTestDatabase } = require('../scripts/local-test-database.cjs');
const { readProjectManifest, copyApiSnapshot } = require('./postgres-project-sources.cjs');

const root = path.resolve(__dirname, '..');
const apiRoot = path.join(root, 'services/api/v3');
const defaultPins = {
  api: '01613262aaac5529cd11abfe298f9a399c2bd93fe52d22a45becda4973a3dd9a',
  panel: '316b708a56eada68e0b1f18df23d197e4a5b2e5ba6f3e91bace2de50633ba044',
  client: 'a51b71f7d0cbdf22850b6285c243471e28e905c8031d613303da3b23cc1649fd',
};
const hash = value => createHash('sha256').update(value).digest('hex');

function portClosed(port) {
  return new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const finish = closed => { socket.destroy(); resolve(closed); };
    socket.once('connect', () => finish(false));
    socket.once('error', error => finish(error.code === 'ECONNREFUSED'));
    socket.setTimeout(1000, () => finish(false));
  });
}

test('real Edge ProjectsPanel -> API -> isolated PostgreSQL journey', { timeout: 90000 }, async () => {
  const runDirectory = fs.realpathSync(process.env.GCSC_TEST_RUN_DIRECTORY);
  assert.match(path.relative(fs.realpathSync(path.join(apiRoot, '.tmp')), runDirectory),
    /^postgres-baseline-[a-zA-Z0-9]+$/);
  const databaseUrl = validateLocalTestDatabase(process.env.TEST_DATABASE_URL);
  assert.equal(process.env.DATABASE_URL, databaseUrl);
  assert.equal(process.env.NODE_ENV, 'test');
  assert.ok(path.isAbsolute(process.env.GCSC_PLAYWRIGHT_DIR));
  const selectedSources = readProjectManifest(runDirectory);
  assert.ok(selectedSources.web, 'Browser suite requires selected web sources');
  const webRoot = selectedSources.web.root;
  const expected = {
    api: selectedSources.api.files['pure-server.js'],
    panel: selectedSources.web.files['src/pages/dashboard/ProjectsPanel.tsx'],
    client: selectedSources.web.files['src/services/api.ts'],
  };
  if (!selectedSources.api.explicit) assert.equal(expected.api, defaultPins.api, 'Default API pin changed');
  if (!selectedSources.web.explicit) {
    for (const name of ['panel', 'client']) assert.equal(expected[name], defaultPins[name], `Default ${name} pin changed`);
  }
  const sourcePaths = { api: fs.realpathSync(process.env.GCSC_API_SOURCE),
    panel: path.join(webRoot, 'src/pages/dashboard/ProjectsPanel.tsx'),
    client: path.join(webRoot, 'src/services/api.ts') };
  const sources = Object.fromEntries(Object.entries(sourcePaths).map(([name, file]) =>
    [name, { path: file, sha256: hash(fs.readFileSync(file)) }]));
  for (const name of Object.keys(expected)) assert.equal(sources[name].sha256, expected[name], `${name} source changed`);
  assert.equal(sources.api.sha256, process.env.GCSC_API_SOURCE_SHA256);

  const report = { status: 'FAIL', sources, projectSources: selectedSources, steps: [], apiRequests: [], blockedRequests: [],
    pageErrors: [], requestFailures: [], consoleErrors: [] };
  let pool, api, uiServer, browser, browserServer, esbuild;
  try {
    const appFile = copyApiSnapshot(selectedSources, runDirectory);
    const { Pool } = createRequire(path.join(apiRoot, 'package.json'))('pg');
    pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 3000, query_timeout: 5000 });
    const data = await pool.query('SHOW data_directory');
    assert.equal(fs.realpathSync(data.rows[0].data_directory), fs.realpathSync(path.join(runDirectory, 'cluster')));
    assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM pg_tables WHERE schemaname='public'")).rows[0].count, 0);
    // Reserve a disposable browser origin before the API captures its CORS configuration.
    uiServer = http.createServer((req, res) => { res.writeHead(404); res.end(); });
    uiServer.listen(0, '127.0.0.1');
    await once(uiServer, 'listening');
    report.uiPort = uiServer.address().port;
    const uiOrigin = `http://127.0.0.1:${report.uiPort}`;
    process.env.CORS_ALLOWED_ORIGINS = uiOrigin;
    api = require(appFile);
    await api.initStorage();
    api.on('request', (req, res) => res.once('finish', () => {
      if (report.apiRequests.length < 100) report.apiRequests.push({ method: req.method, path: req.url, status: res.statusCode });
    }));
    api.listen(0, '127.0.0.1');
    await once(api, 'listening');
    report.apiPort = api.address().port;
    const origin = `http://127.0.0.1:${report.apiPort}`;
    const users = (await pool.query(`INSERT INTO users(email,password_hash,role,full_name) VALUES
      ('browser-owner@example.invalid','fixture','homeowner','Browser Owner'),
      ('browser-contractor@example.invalid','fixture','contractor','Browser Contractor'),
      ('browser-other-contractor@example.invalid','fixture','contractor','Other Browser Contractor')
      RETURNING id,email,role,full_name`)).rows;
    const owner = users.find(user => user.role === 'homeowner');
    const contractor = users.find(user => user.email === 'browser-contractor@example.invalid');
    const otherContractor = users.find(user => user.email === 'browser-other-contractor@example.invalid');

    const webRequire = createRequire(path.join(webRoot, 'package.json'));
    esbuild = webRequire('esbuild');
    const bundle = await esbuild.build({ absWorkingDir: webRoot, bundle: true, write: false,
      minify: true, jsx: 'automatic', platform: 'browser', format: 'iife', metafile: true,
      define: { 'import.meta.env': '{}', 'process.env.NODE_ENV': '"production"',
        'import.meta.env.VITE_API_URL': JSON.stringify(origin),
        'import.meta.env.VITE_ENABLE_LEGACY_ESCROW_WORKFLOW': '"false"' },
      stdin: { resolveDir: webRoot, loader: 'tsx', contents: `
        import {createRoot} from 'react-dom/client';
        import {HashRouter} from 'react-router';
        import {ProjectsPanel} from './src/pages/dashboard/ProjectsPanel';
        import {api} from './src/services/api';
        const fixture = window.__qaFixture;
        api.setToken(fixture.token);
        createRoot(document.getElementById('root')).render(
          <HashRouter><ProjectsPanel user={fixture.user} onOpenChat={()=>{}}/></HashRouter>);
      ` } });
    const code = bundle.outputFiles[0].text;
    report.bundleSha256 = hash(code);
    report.virtualInputs = Object.keys(bundle.metafile.inputs)
      .filter(file => file.startsWith('<') || file.startsWith('(disabled):'));
    report.webInputs = Object.fromEntries(Object.keys(bundle.metafile.inputs)
      .filter(file => !report.virtualInputs.includes(file) && !file.includes('node_modules'))
      .map(file => [file, hash(fs.readFileSync(path.resolve(webRoot, file)))]));
    for (const name of ['panel', 'client']) assert.ok(Object.values(report.webInputs).includes(expected[name]),
      `${name} must be an actual bundle input`);
    for (const [name, file] of Object.entries(sourcePaths)) assert.equal(hash(fs.readFileSync(file)), expected[name]);
    fs.writeFileSync(path.join(runDirectory, 'project-ui.js'), code);
    process.env.TEMP = runDirectory;
    process.env.TMP = runDirectory;
    const { chromium } = require(path.join(process.env.GCSC_PLAYWRIGHT_DIR, 'playwright'));
    report.edgeExecutable = fs.realpathSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
    browserServer = await chromium.launchServer({ channel: 'msedge', executablePath: report.edgeExecutable, headless: true,
      host: '127.0.0.1', port: 0, timeout: 15000,
      args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'] });
    report.edgePid = browserServer.process().pid;
    report.edgePort = Number(new URL(browserServer.wsEndpoint()).port);
    browser = await chromium.connect(browserServer.wsEndpoint(), { timeout: 10000 });
    report.browserVersion = browser.version();

    async function openRole(user) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 },
        reducedMotion: 'reduce', serviceWorkers: 'block' });
      // Edge requires loopback permission for this intercepted-HTML origin.
      await context.grantPermissions(['local-network-access'], { origin: uiOrigin });
      await context.addInitScript(fixture => { window.__qaFixture = fixture; },
        { user, token: api.jwtSign({ userId: user.id, role: user.role, email: user.email }) });
      await context.route('**/*', route => {
        const req = route.request();
        const url = new URL(req.url());
        if (url.origin === uiOrigin && req.method() === 'GET' && url.pathname === '/qa') {
          return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"></head><body><div id="root"></div><script src="/qa-bundle.js"></script></body></html>' });
        }
        if (url.origin === uiOrigin && req.method() === 'GET' && url.pathname === '/qa-bundle.js') {
          return route.fulfill({ contentType: 'text/javascript', body: code });
        }
        const read = ['GET', 'OPTIONS'].includes(req.method()) && /^\/api\/projects(?:\/my\/projects|\/\d+(?:\/details)?)?$/.test(url.pathname);
        const write = ['POST', 'OPTIONS'].includes(req.method()) && /^\/api\/(?:projects(?:\/\d+\/publish)?|bids)$/.test(url.pathname);
        if (url.origin === origin && (read || write)) return route.continue();
        report.blockedRequests.push({ method: req.method(), url: url.href });
        return route.abort('blockedbyclient');
      });
      const page = await context.newPage();
      page.setDefaultTimeout(7000);
      page.setDefaultNavigationTimeout(10000);
      page.on('pageerror', error => report.pageErrors.push(error.message));
      page.on('requestfailed', req => report.requestFailures.push({ url: req.url(), error: req.failure()?.errorText }));
      page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
      await page.goto(uiOrigin + '/qa');
      return page;
    }
    async function action(page, method, route, click, status) {
      const [response] = await Promise.all([page.waitForResponse(response =>
        response.url() === origin + route && response.request().method() === method), click()]);
      const body = await response.json();
      assert.equal(response.status(), status, `${method} ${route}: ${JSON.stringify(body)}`);
      return body;
    }
    const row = (page, id) => page.getByRole('row').filter({ hasText: `#${id}` });
    const noBrief = async page => {
      const text = await page.locator('body').innerText();
      for (const value of ['QA_BROWSER_PRIVATE_TITLE', 'QA_BROWSER_PRIVATE_BRIEF', 'QA_BROWSER_PRIVATE_ADDRESS',
        'QA_BROWSER_OTHER_PRIVATE_TITLE', 'QA_BROWSER_OTHER_PRIVATE_BRIEF', 'QA_BROWSER_OTHER_PRIVATE_ADDRESS']) {
        assert.ok(!text.includes(value), `Private value leaked: ${value}`);
      }
      assert.equal(await page.getByRole('button', { name: /Prepare Bid|Send Bid/ }).count(), 0);
    };
    const compose = async (page, message) => {
      await page.getByRole('button', { name: 'Prepare Bid', exact: true }).click();
      await page.getByPlaceholder('Bid amount', { exact: true }).fill('1500');
      await page.getByPlaceholder('Timeline days', { exact: true }).fill('12');
      await page.getByPlaceholder('Explain your scope, materials approach, and milestone plan.').fill(message);
    };

    const ownerPage = await openRole(owner);
    await ownerPage.getByPlaceholder('Project title', { exact: true }).fill('QA_BROWSER_PRIVATE_TITLE');
    await ownerPage.getByPlaceholder('Location', { exact: true }).fill('QA_BROWSER_PRIVATE_ADDRESS');
    await ownerPage.getByPlaceholder('Minimum budget').fill('1200');
    await ownerPage.getByPlaceholder('Maximum budget').fill('2400');
    await ownerPage.getByPlaceholder('Timeline days', { exact: true }).fill('14');
    await ownerPage.locator('select').selectOption({ label: 'Roofing' });
    await ownerPage.getByPlaceholder('Describe the work, property condition, timing, and anything contractors should know.').fill('QA_BROWSER_PRIVATE_BRIEF');
    const created = await action(ownerPage, 'POST', '/api/projects',
      () => ownerPage.getByRole('button', { name: 'Save Draft', exact: true }).click(), 201);
    const id = created.project.id;
    report.projectId = id;
    assert.deepEqual((await pool.query('SELECT homeowner_id,published,published_at FROM projects WHERE id=$1', [id])).rows,
      [{ homeowner_id: owner.id, published: false, published_at: null }]);
    const contractorPage = await openRole(contractor);
    await contractorPage.getByText('No open projects are available right now.', { exact: true }).waitFor();
    await noBrief(contractorPage);
    await action(ownerPage, 'POST', `/api/projects/${id}/publish`,
      () => ownerPage.getByRole('button', { name: 'Publish project', exact: true }).click(), 200);
    const publication = (await pool.query('SELECT published,published_at FROM projects WHERE id=$1', [id])).rows[0];
    assert.equal(publication.published, true);
    assert.ok(publication.published_at instanceof Date);
    const publicListResponse = await contractorPage.request.get(`${origin}/api/projects`);
    assert.equal(publicListResponse.status(), 200);
    const publicList = await publicListResponse.json();
    assert.deepEqual(Object.keys(publicList), ['projects']);
    assert.ok(Array.isArray(publicList.projects));
    const previewKeys = ['id', 'title', 'category', 'budget_min', 'budget_max', 'timeline_days', 'status', 'published_at'].sort();
    for (const preview of publicList.projects) {
      assert.deepEqual(Object.keys(preview).sort(), previewKeys);
    }
    const publicPreview = publicList.projects.find(project => project.id === id);
    assert.ok(publicPreview);
    assert.equal(publicPreview.title, 'Roofing project');
    const publicDetailResponse = await contractorPage.request.get(`${origin}/api/projects/${id}`);
    assert.equal(publicDetailResponse.status(), 200);
    assert.match(publicDetailResponse.headers()['cache-control'], /no-store/);
    const publicDetail = await publicDetailResponse.json();
    assert.deepEqual(Object.keys(publicDetail), ['project']);
    assert.deepEqual(publicDetail.project, publicPreview);
    for (const body of [JSON.stringify(publicList), JSON.stringify(publicDetail)]) {
      for (const value of ['QA_BROWSER_PRIVATE_TITLE', 'QA_BROWSER_PRIVATE_BRIEF', 'QA_BROWSER_PRIVATE_ADDRESS']) {
        assert.ok(!body.includes(value), `Private value leaked in public API: ${value}`);
      }
    }
    report.steps.push('owner UI creates private draft and publishes; SQL state and contractor draft invisibility verified');

    await contractorPage.reload();
    await action(contractorPage, 'GET', `/api/projects/${id}/details`,
      () => row(contractorPage, id).getByRole('button', { name: 'View', exact: true }).click(), 404);
    await contractorPage.getByRole('button', { name: 'Check access', exact: true }).waitFor();
    await noBrief(contractorPage);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM bids')).rows[0].count, 0);
    await contractorPage.screenshot({ path: path.join(runDirectory, 'unpaid-preview.png'), fullPage: true });
    report.steps.push('unpaid real protected GET returns 404; private text and proposal controls absent');

    await pool.query(`INSERT INTO project_access_entitlements
      (project_id,contractor_id,status,provider_payment_id,verified_at)
      VALUES ($1,$2,'paid','synthetic-browser-grant',NOW())`, [id, contractor.id]);
    const otherProject = (await pool.query(`INSERT INTO projects
      (homeowner_id,title,description,location,category,budget_min,budget_max,timeline_days,status,published,published_at)
      VALUES ($1,'QA_BROWSER_OTHER_PRIVATE_TITLE','QA_BROWSER_OTHER_PRIVATE_BRIEF',
        'QA_BROWSER_OTHER_PRIVATE_ADDRESS','roofing',1200,2400,14,'open',TRUE,NOW()) RETURNING id`,
    [owner.id])).rows[0];
    const otherContractorPage = await openRole(otherContractor);
    await row(otherContractorPage, id).waitFor();
    await row(otherContractorPage, otherProject.id).waitFor();
    await action(otherContractorPage, 'GET', `/api/projects/${id}`,
      () => row(otherContractorPage, id).getByRole('button', { name: 'View', exact: true }).click(), 200);
    await noBrief(otherContractorPage);
    const contractorScopePage = await openRole(contractor);
    await row(contractorScopePage, otherProject.id).waitFor();
    await action(contractorScopePage, 'GET', `/api/projects/${otherProject.id}`,
      () => row(contractorScopePage, otherProject.id).getByRole('button', { name: 'View', exact: true }).click(), 200);
    await noBrief(contractorScopePage);
    for (const [page, user, deniedId] of [
      [otherContractorPage, otherContractor, id], [contractorScopePage, contractor, otherProject.id],
    ]) {
      const denied = await page.request.get(`${origin}/api/projects/${deniedId}/details`, {
        headers: { Authorization: `Bearer ${api.jwtSign({ userId: user.id, role: user.role, email: user.email })}` },
      });
      assert.equal(denied.status(), 404);
      assert.match(denied.headers()['cache-control'], /no-store/);
      assert.deepEqual(await denied.json(),
        { error: 'Project details unavailable', code: 'project_details_unavailable' });
    }
    report.steps.push('paid grant stays bound to one contractor and one project across direct private API reads');
    const details = await action(contractorPage, 'GET', `/api/projects/${id}/details`,
      () => contractorPage.getByRole('button', { name: 'Check access', exact: true }).click(), 200);
    assert.deepEqual(Object.keys(details.project).sort(),
      ['id','title','description','category','budget_min','budget_max','timeline_days','status','published_at'].sort());
    assert.equal(details.project.published_at, publication.published_at.toISOString());
    await contractorPage.locator('aside').getByText('QA_BROWSER_PRIVATE_BRIEF', { exact: true }).waitFor();
    assert.ok(!(await contractorPage.locator('body').innerText()).includes('QA_BROWSER_PRIVATE_ADDRESS'));
    await compose(contractorPage, 'QA_BROWSER_PERSISTED_PROPOSAL');
    const submitted = await action(contractorPage, 'POST', '/api/bids',
      () => contractorPage.getByRole('button', { name: 'Send Bid', exact: true }).click(), 201);
    await contractorPage.getByText('Bid submitted. You can track it in My Bids.', { exact: true }).waitFor();
    report.bidId = submitted.bid.id;
    assert.deepEqual((await pool.query('SELECT project_id,contractor_id,amount,proposed_timeline_days,message,status FROM bids')).rows,
      [{ project_id: id, contractor_id: contractor.id, amount: 1500, proposed_timeline_days: 12,
        message: 'QA_BROWSER_PERSISTED_PROPOSAL', status: 'pending' }]);
    report.steps.push('matching SQL paid grant enables brief; UI proposal POST persists exact values in PostgreSQL');

    const ownerRead = await action(ownerPage, 'GET', `/api/projects/${id}`,
      () => row(ownerPage, id).getByRole('button', { name: 'View', exact: true }).click(), 200);
    assert.equal(ownerRead.bids[0].id, report.bidId);
    await ownerPage.locator('aside').getByText('QA_BROWSER_PERSISTED_PROPOSAL', { exact: true }).waitFor();
    await ownerPage.screenshot({ path: path.join(runDirectory, 'owner-proposal.png'), fullPage: true });
    report.steps.push('owner UI reads the persisted contractor proposal through the real API');

    await action(contractorPage, 'GET', `/api/projects/${id}/details`,
      () => contractorPage.getByRole('button', { name: 'Refresh details', exact: true }).click(), 200);
    await compose(contractorPage, 'QA_BROWSER_REVOKED_PROPOSAL');
    await pool.query("UPDATE project_access_entitlements SET status='revoked' WHERE project_id=$1 AND contractor_id=$2", [id, contractor.id]);
    await action(contractorPage, 'POST', '/api/bids',
      () => contractorPage.getByRole('button', { name: 'Send Bid', exact: true }).click(), 403);
    await contractorPage.getByRole('button', { name: 'Check access', exact: true }).waitFor();
    await noBrief(contractorPage);
    await action(contractorPage, 'GET', `/api/projects/${id}/details`,
      () => contractorPage.getByRole('button', { name: 'Check access', exact: true }).click(), 404);
    await contractorPage.getByRole('button', { name: 'Check access', exact: true }).waitFor();
    await noBrief(contractorPage);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM bids')).rows[0].count, 1);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM payment_receipts')).rows[0].count, 0);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM escrow_contracts')).rows[0].count, 0);
    await contractorPage.screenshot({ path: path.join(runDirectory, 'revoked-preview.png'), fullPage: true });
    report.steps.push('revoked grant rejects stale UI submission with 403 and details with 404; brief cleared and no second bid');
    assert.deepEqual(report.apiRequests.filter(req => req.method === 'POST' && req.path === '/api/bids').map(req => req.status), [201, 403]);
    assert.ok(report.apiRequests.length < 100);
    assert.deepEqual(report.blockedRequests, []);
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.requestFailures, []);
    report.status = 'PASS';
  } catch (error) {
    report.error = error.message;
    report.failureViews = [];
    for (const page of (browser?.contexts().flatMap(context => context.pages()) || []).slice(0, 2)) {
      const visibleText = await page.locator('body').innerText({ timeout: 1000 }).catch(e => e.message);
      const validation = await page.locator('input:invalid,textarea:invalid,select:invalid')
        .evaluateAll(nodes => nodes.map(node => ({ field: node.getAttribute('placeholder'), error: node.validationMessage })))
        .catch(e => e.message);
      report.failureViews.push({ visibleText, validation });
    }
    throw error;
  } finally {
    const cleanupErrors = [];
    const clean = async work => { try { await work(); } catch (error) { cleanupErrors.push(error.message); } };
    await clean(async () => { if (browser) await browser.close(); });
    await clean(async () => {
      if (browserServer) {
        await browserServer.close();
        report.edgeExitCode = browserServer.process().exitCode;
        report.edgePortClosed = await portClosed(report.edgePort);
        assert.equal(report.edgeExitCode, 0);
        assert.equal(report.edgePortClosed, true);
      }
    });
    await clean(async () => {
      if (api?.listening) await new Promise((resolve, reject) => api.close(error => error ? reject(error) : resolve()));
      if (report.apiPort) {
        report.apiPortClosed = await portClosed(report.apiPort);
        assert.equal(report.apiPortClosed, true);
      }
    });
    await clean(async () => {
      if (uiServer?.listening) await new Promise((resolve, reject) => uiServer.close(error => error ? reject(error) : resolve()));
      if (report.uiPort) {
        report.uiPortClosed = await portClosed(report.uiPort);
        assert.equal(report.uiPortClosed, true);
      }
    });
    await clean(async () => { if (api) await api.closeStorage(); });
    await clean(async () => { if (pool) await pool.end(); });
    if (esbuild) esbuild.stop();
    report.cleanupErrors = cleanupErrors;
    if (cleanupErrors.length) report.status = 'FAIL';
    fs.writeFileSync(path.join(runDirectory, 'browser-acceptance.json'), JSON.stringify(report, null, 2) + '\n');
    assert.deepEqual(cleanupErrors, [], 'Browser/API cleanup failed');
  }
});
