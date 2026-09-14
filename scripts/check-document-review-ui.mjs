import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, copyFile, readFile, writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const webRoot = path.join(root, 'apps/web');
// Tailwind's existing configuration resolves its content paths from cwd.
process.chdir(webRoot);
const args = process.argv.slice(2);
assert.ok(args.length === 2 && args[0] === '--playwright-dir' && path.isAbsolute(args[1]),
  'Usage: node scripts/check-document-review-ui.mjs --playwright-dir <installed node_modules>');
const { chromium } = createRequire(path.join(args[1], 'fixture.cjs'))('playwright');
const webRequire = createRequire(path.join(webRoot, 'package.json'));
const { createServer } = await import(pathToFileURL(webRequire.resolve('vite')).href);
const { default: react } = await import(pathToFileURL(webRequire.resolve('@vitejs/plugin-react')).href);
await mkdir(path.join(webRoot, '.tmp'), { recursive: true });
const scratch = await mkdtemp(path.join(webRoot, '.tmp/documents-ui-'));
await copyFile(path.join(root, 'tests/fixtures/documents-ui.html'), path.join(scratch, 'index.html'));
await copyFile(path.join(root, 'tests/fixtures/documents-ui.tsx'), path.join(scratch, 'entry.tsx'));
const bytes = Buffer.from('%PDF-1.4\nLocal UI fixture\n%%EOF');
let document = {
  id: 1, user_id: 1, document_type: 'contractor_license', file_name: 'fixture-license.pdf',
  mime_type: 'application/pdf', file_size: bytes.length, file_sha256: createHash('sha256').update(bytes).digest('hex'),
  revision: 1, status: 'submitted', submitted_at: '2026-09-14T06:00:00Z',
  user: { id: 1, full_name: 'Fixture Builder', companyName: 'Fixture Construction', email: 'fixture@example.invalid', role: 'contractor' },
};
let conflict = false;
const reviews = [];
const fixture = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  const reply = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
  if (req.headers.authorization !== 'Bearer document-ui-fixture-only') return reply(401, { error: 'Fixture token required' });
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/api/admin/documents') {
    const status = url.searchParams.get('status');
    return reply(200, { documents: !status || status === document.status ? [document] : [] });
  }
  if (url.pathname === '/api/auth/compliance') return reply(200, {
    overall_status: 'pending_review', profile_completion: { completed: true, percent: 100, missing: [] },
    required_documents: [{ document_type: 'contractor_license', label: 'Contractor license', status: document.status, document }],
  });
  if (url.pathname.endsWith('/file')) {
    if (Number(url.searchParams.get('revision')) !== document.revision) return reply(409, { error: 'Document changed. Refresh the document list.' });
    return reply(200, { document, file_data_url: `data:application/pdf;base64,${bytes.toString('base64')}` });
  }
  if (url.pathname.endsWith('/review') && req.method === 'PUT') {
    let text = '';
    for await (const chunk of req) text += chunk;
    const body = JSON.parse(text);
    reviews.push(body);
    if (conflict) { conflict = false; document = { ...document, revision: document.revision + 1 }; }
    if (body.expectedRevision !== document.revision) return reply(409, { error: 'Document changed. Refresh the document list.' });
    document = { ...document, status: body.status, review_note: body.reviewNote };
    return reply(200, { document });
  }
  reply(404, { error: 'Unknown fixture route' });
});
let vite;
let browser;
const errors = [];
try {
  fixture.listen(0, '127.0.0.1');
  await once(fixture, 'listening');
  vite = await createServer({ root: webRoot, configFile: false, envFile: false, plugins: [react()],
    cacheDir: path.join(scratch, 'node_modules/.vite'), logLevel: 'error',
    resolve: { alias: { '@': path.join(webRoot, 'src') } },
    optimizeDeps: { entries: [path.join(scratch, 'index.html')] },
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify(`http://127.0.0.1:${fixture.address().port}`) },
    server: { host: '127.0.0.1', port: 0, fs: { allow: [root, await realpath(path.join(webRoot, 'node_modules'))] } },
  });
  await vite.listen();
  const url = `http://127.0.0.1:${vite.httpServer.address().port}/${path.relative(webRoot, scratch).split(path.sep).join('/')}/index.html`;
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => errors.push(error.message));
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(url);
    await page.getByRole('button', { name: 'Download', exact: true }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'No horizontal page overflow');
    await page.screenshot({ path: path.join(scratch, `admin-${viewport.width}.png`), fullPage: true });
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download', exact: true }).click();
    const file = await downloaded;
    assert.equal(file.suggestedFilename(), 'fixture-license.pdf');
    await file.saveAs(path.join(scratch, `download-${viewport.width}.pdf`));
    assert.deepEqual(await readFile(path.join(scratch, `download-${viewport.width}.pdf`)), bytes);
  }
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Manual note required' }).waitFor();
  assert.equal(reviews.length, 0);
  await page.getByRole('textbox').fill('Unreadable license');
  conflict = true;
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Document changed' }).waitFor();
  assert.equal(reviews.at(-1).expectedRevision, 1);
  assert.equal(await page.getByRole('textbox').inputValue(), '');
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await page.getByText('No documents in this queue', { exact: true }).waitFor();
  assert.equal(reviews.at(-1).expectedRevision, 2);
  await page.goto(url + '?owner');
  await page.getByRole('button', { name: 'Download', exact: true }).waitFor();
  const ownerDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  assert.equal((await ownerDownload).suggestedFilename(), 'fixture-license.pdf');
  await page.screenshot({ path: path.join(scratch, 'owner-390.png'), fullPage: true });
  assert.deepEqual(errors, []);
  await writeFile(path.join(scratch, 'result.json'), JSON.stringify({ status: 'PASS', boundary: 'Real React components; isolated mock HTTP backend. Real API/PostgreSQL checked separately.',
    viewports: [1280, 390], reviews, pageErrors: errors }, null, 2));
  console.log(`Document UI smoke PASS: ${scratch}`);
} finally {
  if (browser) await browser.close();
  if (vite) await vite.close();
  if (fixture.listening) await new Promise(resolve => fixture.close(resolve));
}
