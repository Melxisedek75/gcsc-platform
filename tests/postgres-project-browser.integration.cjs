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
    main: selectedSources.web.files['src/main.tsx'],
    app: selectedSources.web.files['src/App.tsx'],
    navbar: selectedSources.web.files['src/components/Navbar.tsx'],
    dashboard: selectedSources.web.files['src/pages/Dashboard.tsx'],
    panel: selectedSources.web.files['src/pages/dashboard/ProjectsPanel.tsx'],
    account: selectedSources.web.files['src/pages/dashboard/AccountAccess.tsx'],
    client: selectedSources.web.files['src/services/api.ts'],
  };
  if (!selectedSources.api.explicit) assert.equal(expected.api, defaultPins.api, 'Default API pin changed');
  if (!selectedSources.web.explicit) {
    for (const name of ['panel', 'client']) assert.equal(expected[name], defaultPins[name], `Default ${name} pin changed`);
  }
  const sourcePaths = { api: fs.realpathSync(process.env.GCSC_API_SOURCE),
    main: path.join(webRoot, 'src/main.tsx'),
    app: path.join(webRoot, 'src/App.tsx'),
    navbar: path.join(webRoot, 'src/components/Navbar.tsx'),
    dashboard: path.join(webRoot, 'src/pages/Dashboard.tsx'),
    panel: path.join(webRoot, 'src/pages/dashboard/ProjectsPanel.tsx'),
    account: path.join(webRoot, 'src/pages/dashboard/AccountAccess.tsx'),
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
    const bundleOptions = { absWorkingDir: webRoot, bundle: true, write: false,
      minify: true, jsx: 'automatic', platform: 'browser', format: 'iife', metafile: true,
      define: { 'import.meta.env': '{}', 'process.env.NODE_ENV': '"production"',
        'import.meta.env.VITE_API_URL': JSON.stringify(origin),
        'import.meta.env.VITE_ENABLE_LEGACY_ESCROW_WORKFLOW': '"false"' },
    };
    const bundle = await esbuild.build({ ...bundleOptions, loader: { '.css': 'empty' },
      stdin: { resolveDir: webRoot, loader: 'js', contents: "import './src/main.tsx';" } });
    const registrationBundle = await esbuild.build({ ...bundleOptions,
      stdin: { resolveDir: webRoot, loader: 'tsx', contents: `
        import {createRoot} from 'react-dom/client';
        import {HashRouter} from 'react-router';
        import {ProjectsPanel} from './src/pages/dashboard/ProjectsPanel';
        import {AccountAccess} from './src/pages/dashboard/AccountAccess';
        import {useState} from 'react';
        const fixture = window.__qaFixture;
        function Registration() {
          const [user, setUser] = useState(null);
          return user
            ? <ProjectsPanel user={user} onOpenChat={()=>{}} onEditStateChange={()=>{}}/>
            : <AccountAccess initialRole={fixture.registrationRole} onAuthenticated={setUser}/>;
        }
        createRoot(document.getElementById('root')).render(<HashRouter><Registration/></HashRouter>);
      ` } });
    const code = bundle.outputFiles[0].text;
    const registrationCode = registrationBundle.outputFiles[0].text;
    report.bundleSha256 = hash(code);
    report.registrationBundleSha256 = hash(registrationCode);
    const inputNames = [...new Set([...Object.keys(bundle.metafile.inputs),
      ...Object.keys(registrationBundle.metafile.inputs)])];
    report.virtualInputs = inputNames
      .filter(file => file.startsWith('<') || file.startsWith('(disabled):'));
    report.webInputs = Object.fromEntries(inputNames
      .filter(file => !report.virtualInputs.includes(file) && !file.includes('node_modules'))
      .map(file => [file, hash(fs.readFileSync(path.resolve(webRoot, file)))]));
    for (const name of ['main', 'app', 'navbar', 'dashboard', 'panel', 'account', 'client']) assert.ok(Object.values(report.webInputs).includes(expected[name]),
      `${name} must be an actual bundle input`);
    for (const [name, file] of Object.entries(sourcePaths)) assert.equal(hash(fs.readFileSync(file)), expected[name]);
    fs.writeFileSync(path.join(runDirectory, 'project-ui.js'), code);
    fs.writeFileSync(path.join(runDirectory, 'project-registration-ui.js'), registrationCode);
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

    let draftEditProjectId = null;
    async function openRole(user, registrationRole = null) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 },
        reducedMotion: 'reduce', serviceWorkers: 'block' });
      // Edge requires loopback permission for this intercepted-HTML origin.
      await context.grantPermissions(['local-network-access'], { origin: uiOrigin });
      await context.addInitScript(fixture => {
        window.__qaFixture = fixture;
        if (fixture.token) localStorage.setItem('gcsc_auth_token', fixture.token);
      },
        { user, token: user ? api.jwtSign({ userId: user.id, role: user.role, email: user.email }) : null,
          registrationRole });
      await context.route('**/*', route => {
        const req = route.request();
        const url = new URL(req.url());
        if (url.origin === uiOrigin && req.method() === 'GET' && url.pathname === '/qa') {
          return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"></head><body><div id="root"></div><script src="/qa-bundle.js"></script></body></html>' });
        }
        if (url.origin === uiOrigin && req.method() === 'GET' && url.pathname === '/qa-bundle.js') {
          return route.fulfill({ contentType: 'text/javascript', body: registrationRole ? registrationCode : code });
        }
        if (url.origin === uiOrigin && req.method() === 'GET'
          && ['/gcsc-header-banner.jpg', '/gcsc-logo-round-64.png'].includes(url.pathname)) {
          const file = path.join(webRoot, 'public', url.pathname.slice(1));
          return route.fulfill({ contentType: url.pathname.endsWith('.jpg') ? 'image/jpeg' : 'image/png',
            body: fs.readFileSync(file) });
        }
        const read = ['GET', 'OPTIONS'].includes(req.method())
          && (/^\/api\/projects(?:\/my\/projects|\/\d+(?:\/details)?)?$/.test(url.pathname)
            || url.pathname === '/api/auth/profile');
        const write = ['POST', 'OPTIONS'].includes(req.method()) && /^\/api\/(?:auth\/(?:register|login)|projects(?:\/\d+\/publish)?|bids)$/.test(url.pathname);
        const edit = req.method() === 'PUT' && draftEditProjectId !== null
          && url.pathname === `/api/projects/${draftEditProjectId}`;
        if (url.origin === origin && (read || write || edit)) return route.continue();
        report.blockedRequests.push({ method: req.method(), url: url.href });
        return route.abort('blockedbyclient');
      });
      const page = await context.newPage();
      page.setDefaultTimeout(7000);
      page.setDefaultNavigationTimeout(10000);
      page.on('pageerror', error => report.pageErrors.push(error.message));
      page.on('requestfailed', req => report.requestFailures.push({ url: req.url(), error: req.failure()?.errorText }));
      page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
      await page.goto(uiOrigin + '/qa' + (registrationRole ? '' : '#/dashboard'));
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
        'QA_BROWSER_EDITED_TITLE', 'QA_BROWSER_EDITED_BRIEF', 'QA_BROWSER_EDITED_ADDRESS',
        'QA_BROWSER_CONFLICT_WIN_TITLE', 'QA_BROWSER_SERVER_TITLE',
        'QA_BROWSER_OTHER_PRIVATE_TITLE', 'QA_BROWSER_OTHER_PRIVATE_BRIEF', 'QA_BROWSER_OTHER_PRIVATE_ADDRESS',
        'QA_BROWSER_REGISTER_PRIVATE_TITLE', 'QA_BROWSER_REGISTER_PRIVATE_BRIEF']) {
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
    draftEditProjectId = id;
    report.projectId = id;
    assert.deepEqual((await pool.query('SELECT homeowner_id,published,published_at FROM projects WHERE id=$1', [id])).rows,
      [{ homeowner_id: owner.id, published: false, published_at: null }]);
    await ownerPage.getByRole('button', { name: 'Edit draft', exact: true }).click();
    const editForm = ownerPage.locator('form').filter({ has: ownerPage.getByRole('heading', { name: 'Edit private draft' }) });
    await editForm.getByRole('textbox', { name: 'Project title' }).fill('QA_BROWSER_EDITED_TITLE');
    await editForm.getByRole('textbox', { name: 'Description' }).fill('QA_BROWSER_EDITED_BRIEF');
    await editForm.getByRole('textbox', { name: 'Location' }).fill('QA_BROWSER_EDITED_ADDRESS');
    const rejectDiscard = async click => {
      const dialogPromise = ownerPage.waitForEvent('dialog', { timeout: 7000 });
      const clickPromise = click();
      const dialog = await dialogPromise;
      assert.equal(dialog.type(), 'confirm');
      assert.equal(dialog.message(), 'Discard unsaved project changes?');
      await dialog.dismiss();
      await clickPromise;
      assert.equal(await editForm.getByRole('textbox', { name: 'Project title' }).inputValue(),
        'QA_BROWSER_EDITED_TITLE');
      await editForm.getByRole('heading', { name: 'Edit private draft' }).waitFor();
    };
    await rejectDiscard(() => editForm.getByRole('button', { name: 'Cancel' }).click());
    await rejectDiscard(() => ownerPage.locator('aside').first().getByRole('button', { name: 'Estimator' }).click());
    await rejectDiscard(() => ownerPage.locator('aside.fixed').first().getByRole('link', { name: 'Token' }).click());
    await rejectDiscard(() => ownerPage.locator('nav').first().getByRole('link', { name: 'Wallet' }).first().click());
    await rejectDiscard(() => ownerPage.getByRole('button', { name: 'Sign out' }).click());
    await ownerPage.setViewportSize({ width: 390, height: 844 });
    await ownerPage.locator('main main button').first().click();
    await rejectDiscard(() => ownerPage.locator('aside.fixed').last().getByRole('button', { name: 'Estimator' }).click());
    await ownerPage.setViewportSize({ width: 1280, height: 900 });
    report.steps.push('Cancel, desktop/mobile section, sidebar Token, top Navbar and sign-out require explicit discard of unsaved edits');
    const discardDialog = ownerPage.waitForEvent('dialog', { timeout: 7000 });
    const discardClick = editForm.getByRole('button', { name: 'Cancel' }).click();
    const confirmedDiscard = await discardDialog;
    assert.equal(confirmedDiscard.message(), 'Discard unsaved project changes?');
    await confirmedDiscard.accept();
    await discardClick;
    await editForm.getByRole('heading', { name: 'Edit private draft' }).waitFor({ state: 'detached' });
    assert.deepEqual((await pool.query('SELECT title,description,location FROM projects WHERE id=$1', [id])).rows,
      [{ title: 'QA_BROWSER_PRIVATE_TITLE', description: 'QA_BROWSER_PRIVATE_BRIEF',
        location: 'QA_BROWSER_PRIVATE_ADDRESS' }]);
    assert.equal(report.apiRequests.filter(request => request.method === 'PUT').length, 0);
    report.steps.push('accepting discard closes the editor without PUT or changing the PostgreSQL draft');
    await ownerPage.getByRole('button', { name: 'Edit draft', exact: true }).click();
    const reopenedEditForm = ownerPage.locator('form').filter({
      has: ownerPage.getByRole('heading', { name: 'Edit private draft' }),
    });
    await reopenedEditForm.getByRole('textbox', { name: 'Project title' }).fill('QA_BROWSER_EDITED_TITLE');
    await reopenedEditForm.getByRole('textbox', { name: 'Description' }).fill('QA_BROWSER_EDITED_BRIEF');
    await reopenedEditForm.getByRole('textbox', { name: 'Location' }).fill('QA_BROWSER_EDITED_ADDRESS');
    const navDiscardDialog = ownerPage.waitForEvent('dialog', { timeout: 7000 });
    const aboutNavigation = ownerPage.locator('nav').first().getByRole('link', { name: 'About' }).first().click();
    const acceptedNavDiscard = await navDiscardDialog;
    assert.equal(acceptedNavDiscard.message(), 'Discard unsaved project changes?');
    await acceptedNavDiscard.accept();
    await aboutNavigation;
    await ownerPage.waitForURL(/#\/about$/);
    assert.equal(report.apiRequests.filter(request => request.method === 'PUT').length, 0);
    assert.deepEqual((await pool.query('SELECT title,description,location FROM projects WHERE id=$1', [id])).rows,
      [{ title: 'QA_BROWSER_PRIVATE_TITLE', description: 'QA_BROWSER_PRIVATE_BRIEF',
        location: 'QA_BROWSER_PRIVATE_ADDRESS' }]);
    await ownerPage.locator('nav').first().getByRole('link', { name: 'Dashboard' }).first().click();
    await ownerPage.waitForURL(/#\/dashboard$/);
    await row(ownerPage, id).getByRole('button', { name: 'View' }).click();
    await ownerPage.getByRole('button', { name: 'Edit draft', exact: true }).click();
    const saveForm = ownerPage.locator('form').filter({
      has: ownerPage.getByRole('heading', { name: 'Edit private draft' }),
    });
    assert.equal(await saveForm.getByRole('textbox', { name: 'Project title' }).inputValue(),
      'QA_BROWSER_PRIVATE_TITLE');
    await saveForm.getByRole('textbox', { name: 'Project title' }).fill('QA_BROWSER_EDITED_TITLE');
    await saveForm.getByRole('textbox', { name: 'Description' }).fill('QA_BROWSER_EDITED_BRIEF');
    await saveForm.getByRole('textbox', { name: 'Location' }).fill('QA_BROWSER_EDITED_ADDRESS');
    report.steps.push('accepted Navbar discard changes route without PUT or PostgreSQL write; reopened editor shows saved draft');
    const backDialogPromise = ownerPage.waitForEvent('dialog', { timeout: 7000 });
    await ownerPage.evaluate(() => { window.history.back(); });
    const backDialog = await backDialogPromise;
    assert.equal(backDialog.type(), 'confirm');
    assert.equal(backDialog.message(), 'Discard unsaved project changes?');
    await backDialog.dismiss();
    await ownerPage.waitForURL(/#\/dashboard$/);
    assert.equal(await saveForm.getByRole('textbox', { name: 'Project title' }).inputValue(),
      'QA_BROWSER_EDITED_TITLE');
    report.steps.push('browser Back through real in-app history preserves unsaved edits when discard is rejected');
    let releasePut;
    let putHeld;
    const putGate = new Promise(resolve => { releasePut = resolve; });
    const putIntercepted = new Promise(resolve => { putHeld = resolve; });
    const holdPut = async route => {
      if (route.request().method() === 'PUT') {
        putHeld();
        await putGate;
      }
      await route.continue();
    };
    await ownerPage.route(`${origin}/api/projects/${id}`, holdPut);
    const editSave = action(ownerPage, 'PUT', `/api/projects/${id}`,
      () => saveForm.getByRole('button', { name: 'Save changes' }).click(), 200)
      .then(value => ({ value }), error => ({ error }));
    let interceptionTimer;
    let completedSave;
    try {
      await Promise.race([
        putIntercepted,
        editSave.then(result => { throw result.error || new Error('PUT completed before interception'); }),
        new Promise((_, reject) => {
          interceptionTimer = setTimeout(() => reject(new Error('Timed out waiting for draft PUT interception')), 7000);
        }),
      ]);
      clearTimeout(interceptionTimer);
      assert.equal(await saveForm.getByRole('button', { name: 'Save changes' }).isDisabled(), true);
      const warningPromise = ownerPage.waitForEvent('dialog', { timeout: 7000 });
      const walletClick = ownerPage.locator('nav').first().getByRole('link', { name: 'Wallet' }).first().click();
      const warning = await warningPromise;
      assert.equal(warning.type(), 'alert');
      assert.equal(warning.message(), 'Wait for the draft to finish saving.');
      await warning.accept();
      await walletClick;
      assert.match(ownerPage.url(), /#\/dashboard$/);
      await saveForm.getByRole('heading', { name: 'Edit private draft' }).waitFor();
      assert.deepEqual((await pool.query('SELECT title,description,location FROM projects WHERE id=$1', [id])).rows,
        [{ title: 'QA_BROWSER_PRIVATE_TITLE', description: 'QA_BROWSER_PRIVATE_BRIEF',
          location: 'QA_BROWSER_PRIVATE_ADDRESS' }]);
    } finally {
      clearTimeout(interceptionTimer);
      releasePut();
      completedSave = await editSave;
      await ownerPage.unroute(`${origin}/api/projects/${id}`, holdPut);
    }
    if (completedSave.error) throw completedSave.error;
    const edited = completedSave.value;
    report.steps.push('Navbar navigation is blocked while a versioned draft PUT is still in flight');
    assert.equal(edited.project.id, id);
    assert.equal(edited.project.title, 'QA_BROWSER_EDITED_TITLE');
    assert.deepEqual((await pool.query('SELECT title,description,location,published FROM projects WHERE id=$1', [id])).rows,
      [{ title: 'QA_BROWSER_EDITED_TITLE', description: 'QA_BROWSER_EDITED_BRIEF',
        location: 'QA_BROWSER_EDITED_ADDRESS', published: false }]);
    assert.deepEqual(report.apiRequests.filter(request => request.method === 'PUT'),
      [{ method: 'PUT', path: `/api/projects/${id}`, status: 200 }]);
    report.steps.push('owner UI edits private draft through PUT; PostgreSQL retains revised fields before publication');
    await ownerPage.getByRole('button', { name: 'Edit draft', exact: true }).click();
    const conflictForm = ownerPage.locator('form').filter({
      has: ownerPage.getByRole('heading', { name: 'Edit private draft' }),
    });
    await conflictForm.getByRole('textbox', { name: 'Project title' }).fill('QA_BROWSER_CONFLICT_WIN_TITLE');
    await pool.query(`UPDATE projects SET title='QA_BROWSER_SERVER_TITLE',
      updated_at=GREATEST(NOW(), updated_at + INTERVAL '1 second') WHERE id=$1`, [id]);
    const conflict = await action(ownerPage, 'PUT', `/api/projects/${id}`,
      () => conflictForm.getByRole('button', { name: 'Save changes' }).click(), 409);
    assert.deepEqual(conflict, { error: 'Project changed; refresh and retry' });
    await conflictForm.getByText('Current saved draft', { exact: true }).waitFor();
    await conflictForm.getByText('Title: QA_BROWSER_SERVER_TITLE', { exact: true }).waitFor();
    assert.equal(await conflictForm.getByRole('textbox', { name: 'Project title' }).inputValue(),
      'QA_BROWSER_CONFLICT_WIN_TITLE');
    assert.equal(await conflictForm.getByRole('button', { name: 'Save changes' }).isDisabled(), true);
    assert.deepEqual(report.apiRequests.filter(request => request.method === 'PUT').map(request => request.status),
      [200, 409]);
    await conflictForm.getByRole('button', { name: 'Keep my edits' }).click();
    assert.equal(await conflictForm.getByRole('button', { name: 'Save changes' }).isEnabled(), true);
    const retried = await action(ownerPage, 'PUT', `/api/projects/${id}`,
      () => conflictForm.getByRole('button', { name: 'Save changes' }).click(), 200);
    assert.equal(retried.project.title, 'QA_BROWSER_CONFLICT_WIN_TITLE');
    assert.deepEqual((await pool.query('SELECT title,description FROM projects WHERE id=$1', [id])).rows,
      [{ title: 'QA_BROWSER_CONFLICT_WIN_TITLE', description: 'QA_BROWSER_EDITED_BRIEF' }]);
    report.steps.push('real PostgreSQL version conflict preserves browser edits until explicit compare and retry');
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
      for (const value of ['QA_BROWSER_PRIVATE_TITLE', 'QA_BROWSER_PRIVATE_BRIEF', 'QA_BROWSER_PRIVATE_ADDRESS',
        'QA_BROWSER_EDITED_TITLE', 'QA_BROWSER_EDITED_BRIEF', 'QA_BROWSER_EDITED_ADDRESS',
        'QA_BROWSER_CONFLICT_WIN_TITLE', 'QA_BROWSER_SERVER_TITLE']) {
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
    const viewDeniedPreview = async (page, deniedId) => {
      const detailsResponse = page.waitForResponse(response =>
        response.url() === `${origin}/api/projects/${deniedId}/details` && response.request().method() === 'GET');
      const preview = await action(page, 'GET', `/api/projects/${deniedId}`,
        () => row(page, deniedId).getByRole('button', { name: 'View', exact: true }).click(), 200);
      assert.deepEqual(Object.keys(preview), ['project']);
      assert.deepEqual(Object.keys(preview.project).sort(), previewKeys);
      assert.equal(preview.project.title, 'Roofing project');
      const denied = await detailsResponse;
      assert.equal(denied.status(), 404);
      assert.match(denied.headers()['cache-control'], /no-store/);
      assert.deepEqual(await denied.json(),
        { error: 'Project details unavailable', code: 'project_details_unavailable' });
      await page.getByRole('button', { name: 'Check access', exact: true }).waitFor();
      await noBrief(page);
    };
    const otherContractorPage = await openRole(otherContractor);
    await row(otherContractorPage, id).waitFor();
    await row(otherContractorPage, otherProject.id).waitFor();
    await viewDeniedPreview(otherContractorPage, id);
    const contractorScopePage = await openRole(contractor);
    await row(contractorScopePage, otherProject.id).waitFor();
    await viewDeniedPreview(contractorScopePage, otherProject.id);
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
    await contractorPage.locator('aside').getByText('QA_BROWSER_EDITED_BRIEF', { exact: true }).waitFor();
    assert.ok(!(await contractorPage.locator('body').innerText()).includes('QA_BROWSER_EDITED_ADDRESS'));
    await pool.query("UPDATE project_access_entitlements SET status='refunded' WHERE project_id=$1 AND contractor_id=$2",
      [id, contractor.id]);
    await action(contractorPage, 'GET', `/api/projects/${id}/details`,
      () => contractorPage.getByRole('button', { name: 'Refresh details', exact: true }).click(), 404);
    await contractorPage.getByRole('button', { name: 'Check access', exact: true }).waitFor();
    await noBrief(contractorPage);
    await pool.query("UPDATE project_access_entitlements SET status='paid' WHERE project_id=$1 AND contractor_id=$2",
      [id, contractor.id]);
    await action(contractorPage, 'GET', `/api/projects/${id}/details`,
      () => contractorPage.getByRole('button', { name: 'Check access', exact: true }).click(), 200);
    await contractorPage.locator('aside').getByText('QA_BROWSER_EDITED_BRIEF', { exact: true }).waitFor();
    report.steps.push('refunded synthetic grant clears a previously visible brief; restored local grant requires a new access check');
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

    const registerPage = async (role, email) => {
      const page = await openRole(null, role);
      await page.getByPlaceholder('Full name', { exact: true }).fill(`Browser ${role}`);
      await page.getByPlaceholder('Email', { exact: true }).fill(email);
      await page.getByPlaceholder('Password, minimum 8 characters').fill('local-browser-password');
      if (role === 'homeowner') await page.getByPlaceholder('Phone', { exact: true }).fill('+12065550102');
      const registered = await action(page, 'POST', '/api/auth/register',
        () => page.getByRole('button', { name: 'Create GCSC Account', exact: true }).click(), 201);
      assert.equal(registered.user.role, role);
      assert.equal(registered.user.is_verified, false);
      assert.equal(registered.user.verification_status, 'verification_provider_pending');
      assert.equal(registered.verification_required, false);
      assert.equal(registered.verification_configured, false);
      assert.equal(registered.verification_channel, role === 'homeowner' ? 'sms' : 'email');
      assert.equal(await page.evaluate(() => localStorage.getItem('gcsc_auth_token')), registered.token);
      if (role === 'homeowner') await page.getByPlaceholder('Project title', { exact: true }).waitFor();
      else await row(page, id).waitFor();
      const stored = (await pool.query(`SELECT role,is_verified,verification_status,verification_channel
        FROM users WHERE email=$1`, [email])).rows[0];
      assert.deepEqual(stored, {
        role, is_verified: false, verification_status: 'verification_provider_pending',
        verification_channel: role === 'homeowner' ? 'sms' : 'email',
      });
      return { page, registered };
    };
    const registeredOwner = await registerPage('homeowner', 'qa-browser-registered-owner@example.invalid');
    await registeredOwner.page.getByPlaceholder('Project title', { exact: true }).fill('QA_BROWSER_REGISTER_PRIVATE_TITLE');
    await registeredOwner.page.locator('select').selectOption({ label: 'Roofing' });
    await registeredOwner.page.getByPlaceholder('Describe the work, property condition, timing, and anything contractors should know.')
      .fill('QA_BROWSER_REGISTER_PRIVATE_BRIEF');
    const registeredDraft = await action(registeredOwner.page, 'POST', '/api/projects',
      () => registeredOwner.page.getByRole('button', { name: 'Save Draft', exact: true }).click(), 201);
    const registeredId = registeredDraft.project.id;
    assert.equal(registeredDraft.project.homeowner_id, registeredOwner.registered.user.id);
    const existingOwnerPage = await openRole(null, 'contractor');
    await existingOwnerPage.getByRole('button', { name: 'Sign in', exact: true }).click();
    await existingOwnerPage.getByPlaceholder('Email', { exact: true })
      .fill('qa-browser-registered-owner@example.invalid');
    await existingOwnerPage.getByPlaceholder('Password, minimum 8 characters')
      .fill('local-browser-password');
    const existingOwner = await action(existingOwnerPage, 'POST', '/api/auth/login',
      () => existingOwnerPage.getByRole('button', { name: 'Open Dashboard', exact: true }).click(), 200);
    assert.equal(existingOwner.user.id, registeredOwner.registered.user.id);
    assert.equal(existingOwner.user.role, 'homeowner');
    assert.equal(await existingOwnerPage.evaluate(() => localStorage.getItem('gcsc_auth_token')), existingOwner.token);
    await existingOwnerPage.getByRole('heading', { name: 'My Projects', exact: true }).waitFor();
    await existingOwnerPage.getByPlaceholder('Project title', { exact: true }).waitFor();
    assert.equal(await existingOwnerPage.getByRole('heading', { name: 'Open Projects', exact: true }).count(), 0);
    await row(existingOwnerPage, registeredId).waitFor();
    const registeredContractor = await registerPage('contractor', 'qa-browser-registered-contractor@example.invalid');
    assert.equal(await row(registeredContractor.page, registeredId).count(), 0);
    const privateDraft = await registeredContractor.page.request.get(`${origin}/api/projects/${registeredId}`, {
      headers: { Authorization: `Bearer ${registeredContractor.registered.token}` },
    });
    assert.equal(privateDraft.status(), 404);
    assert.deepEqual(await privateDraft.json(), { error: 'Project not found' });
    await action(registeredOwner.page, 'POST', `/api/projects/${registeredId}/publish`,
      () => registeredOwner.page.getByRole('button', { name: 'Publish project', exact: true }).click(), 200);
    await registeredContractor.page.reload();
    await registeredContractor.page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await registeredContractor.page.getByPlaceholder('Email', { exact: true })
      .fill('qa-browser-registered-contractor@example.invalid');
    await registeredContractor.page.getByPlaceholder('Password, minimum 8 characters')
      .fill('local-browser-password');
    const signedIn = await action(registeredContractor.page, 'POST', '/api/auth/login',
      () => registeredContractor.page.getByRole('button', { name: 'Open Dashboard', exact: true }).click(), 200);
    assert.equal(signedIn.user.id, registeredContractor.registered.user.id);
    assert.equal(await registeredContractor.page.evaluate(() => localStorage.getItem('gcsc_auth_token')), signedIn.token);
    await row(registeredContractor.page, registeredId).waitFor();
    await viewDeniedPreview(registeredContractor.page, registeredId);
    report.steps.push('browser registration persists unverified roles; previously registered owner signs in from a separate contractor-selected context; draft stays private, published preview is generic');

    assert.deepEqual(report.apiRequests.filter(req => req.method === 'POST' && req.path === '/api/bids').map(req => req.status), [201, 403]);
    assert.ok(report.apiRequests.length < 100);
    assert.deepEqual(report.blockedRequests, []);
    assert.deepEqual(report.apiRequests.filter(request => request.method === 'PUT'),
      [200, 409, 200].map(status => ({ method: 'PUT', path: `/api/projects/${id}`, status })));
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
