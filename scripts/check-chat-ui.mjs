import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, copyFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const webRoot = path.join(root, 'apps/web');
process.chdir(webRoot);
const args = process.argv.slice(2);
assert.ok(args.length === 2 && args[0] === '--playwright-dir' && path.isAbsolute(args[1]),
  'Usage: node scripts/check-chat-ui.mjs --playwright-dir <installed node_modules>');
const { chromium } = createRequire(path.join(args[1], 'fixture.cjs'))('playwright');
const webRequire = createRequire(path.join(webRoot, 'package.json'));
const { createServer } = await import(pathToFileURL(webRequire.resolve('vite')).href);
const { default: react } = await import(pathToFileURL(webRequire.resolve('@vitejs/plugin-react')).href);
await mkdir(path.join(webRoot, '.tmp'), { recursive: true });
const scratch = await mkdtemp(path.join(webRoot, '.tmp/chat-ui-'));
await copyFile(path.join(root, 'tests/fixtures/chat-ui.html'), path.join(scratch, 'index.html'));
await copyFile(path.join(root, 'tests/fixtures/chat-ui.tsx'), path.join(scratch, 'entry.tsx'));

const thread = {
  id: 3, project_id: 11, homeowner_id: 2, contractor_id: 7, title: 'Kitchen fixture',
  counterparty: { id: 2, full_name: 'Fixture Owner', role: 'homeowner' }, can_send: true,
  last_sequence: 1, created_at: '2026-09-23T15:00:00Z', updated_at: '2026-09-23T15:00:00Z',
};
const olderThread = { ...thread, id: 2, project_id: 10, title: 'Older bathroom fixture',
  counterparty: { id: 4, full_name: 'Older Fixture Owner', role: 'homeowner' } };
const messages = [{ id: 1, thread_id: 3, sequence: 1, sender_id: 2,
  client_message_id: '123e4567-e89b-12d3-a456-426614174111', text: 'Existing server message', created_at: '2026-09-23T15:00:00Z' }];
const sends = [];
let uncertain = true;
const threadFor = (req, value) => ({
  ...value,
  can_send: req.headers['x-fixture-mode'] !== 'readonly',
  counterparty: req.headers.authorization === 'Bearer chat-ui-owner'
    ? { id: 7, full_name: 'Fixture Contractor', role: 'contractor' }
    : value.counterparty,
});
const apiServer = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Fixture-Mode');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  const reply = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
  if (!['Bearer chat-ui-contractor', 'Bearer chat-ui-owner'].includes(req.headers.authorization)) return reply(401, { error: 'Fixture token required' });
  if (req.headers['x-fixture-mode'] === 'forbidden') return reply(403, { error: 'Forbidden fixture' });
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/api/chat/threads' && req.method === 'GET') {
    return url.searchParams.has('before')
      ? reply(200, { threads: [threadFor(req, olderThread)], next_before: 2, has_more: false })
      : reply(200, { threads: [threadFor(req, thread)], next_before: 3, has_more: true });
  }
  if (url.pathname === '/api/chat/threads' && req.method === 'POST') return reply(200, { thread: threadFor(req, thread) });
  if (url.pathname === '/api/chat/threads/3/messages' && req.method === 'GET') {
    const after = Number(url.searchParams.get('after') || 0);
    return reply(200, { thread: { ...threadFor(req, thread), last_sequence: messages.at(-1)?.sequence || 0 }, messages: messages.filter(message => message.sequence > after), next_after: messages.at(-1)?.sequence || after, has_more: false });
  }
  if (url.pathname === '/api/chat/threads/2/messages' && req.method === 'GET') {
    const olderMessage = { id: 4, thread_id: 2, sequence: 1, sender_id: 4,
      client_message_id: '123e4567-e89b-12d3-a456-426614174222', text: 'Older conversation message', created_at: '2026-09-22T15:00:00Z' };
    return reply(200, { thread: { ...threadFor(req, olderThread), last_sequence: 1 }, messages: [olderMessage], next_after: 1, has_more: false });
  }
  if (url.pathname === '/api/chat/threads/3/messages' && req.method === 'POST') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    sends.push(body);
    let message = messages.find(item => item.client_message_id === body.client_message_id);
    if (!message) {
      message = { id: 2, thread_id: 3, sequence: 2,
        sender_id: req.headers.authorization === 'Bearer chat-ui-owner' ? 2 : 7,
        client_message_id: body.client_message_id, text: body.text, created_at: '2026-09-23T15:01:00Z' };
      messages.push(message);
    }
    if (uncertain) { uncertain = false; return reply(503, { error: 'Fixture uncertain response' }); }
    return reply(200, { message, duplicate: true });
  }
  return reply(404, { error: 'Unknown fixture route' });
});

let vite;
let browser;
const errors = [];
try {
  apiServer.listen(0, '127.0.0.1');
  await once(apiServer, 'listening');
  vite = await createServer({ root: webRoot, configFile: false, envFile: false, plugins: [react()],
    cacheDir: path.join(scratch, 'node_modules/.vite'), logLevel: 'error', resolve: { alias: { '@': path.join(webRoot, 'src') } },
    optimizeDeps: { entries: [path.join(scratch, 'index.html')] },
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify(`http://127.0.0.1:${apiServer.address().port}`) },
    server: { host: '127.0.0.1', port: 0, fs: { allow: [root, await realpath(path.join(webRoot, 'node_modules'))] } },
  });
  await vite.listen();
  const url = `http://127.0.0.1:${vite.httpServer.address().port}/${path.relative(webRoot, scratch).split(path.sep).join('/')}/index.html`;
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem('gcsc_auth_token', 'chat-ui-contractor'));
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => errors.push(error.message));
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(url);
    await page.getByText('Existing server message', { exact: true }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'No horizontal page overflow');
    await page.screenshot({ path: path.join(scratch, `chat-${viewport.width}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: 'Load more conversations' }).click();
  await page.getByText('Older Fixture Owner', { exact: true }).waitFor();
  await page.getByText('Older Fixture Owner', { exact: true }).click();
  await page.getByText('Older conversation message', { exact: true }).waitFor();
  assert.equal(await page.getByText('Existing server message', { exact: true }).count(), 0);
  await page.getByText('Fixture Owner', { exact: true }).click();
  await page.getByText('Existing server message', { exact: true }).waitFor();
  const composer = page.getByPlaceholder('Write a message');
  await composer.fill('Retry-safe fixture message');
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.getByText(/Retry keeps the same message key/).waitFor();
  await page.getByRole('button', { name: 'Retry message' }).click();
  await page.getByText('Retry-safe fixture message', { exact: true }).waitFor();
  assert.equal(sends.length, 2);
  assert.equal(sends[0].client_message_id, sends[1].client_message_id);
  assert.equal(await page.getByText('Retry-safe fixture message', { exact: true }).count(), 1);

  const ownerContext = await browser.newContext();
  await ownerContext.addInitScript(() => localStorage.setItem('gcsc_auth_token', 'chat-ui-owner'));
  await ownerContext.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  const ownerPage = await ownerContext.newPage();
  ownerPage.setDefaultTimeout(60000);
  ownerPage.on('pageerror', error => errors.push(error.message));
  await ownerPage.goto(url + '?owner');
  await ownerPage.getByText('Retry-safe fixture message', { exact: true }).waitFor();
  await ownerContext.close();

  const readOnlyContext = await browser.newContext({ extraHTTPHeaders: { 'X-Fixture-Mode': 'readonly' } });
  await readOnlyContext.addInitScript(() => localStorage.setItem('gcsc_auth_token', 'chat-ui-owner'));
  await readOnlyContext.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  const readOnlyPage = await readOnlyContext.newPage();
  await readOnlyPage.goto(url + '?owner');
  const readOnlyComposer = readOnlyPage.getByPlaceholder('This conversation is read only');
  await readOnlyComposer.waitFor();
  assert.equal(await readOnlyComposer.isDisabled(), true);
  await readOnlyContext.close();

  const forbiddenContext = await browser.newContext({ extraHTTPHeaders: { 'X-Fixture-Mode': 'forbidden' } });
  await forbiddenContext.addInitScript(() => localStorage.setItem('gcsc_auth_token', 'chat-ui-contractor'));
  await forbiddenContext.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  const forbiddenPage = await forbiddenContext.newPage();
  await forbiddenPage.goto(url);
  await forbiddenPage.getByText('Forbidden fixture', { exact: false }).first().waitFor();
  await forbiddenContext.close();

  assert.deepEqual(errors, []);
  await writeFile(path.join(scratch, 'result.json'), JSON.stringify({ status: 'PASS', boundary: 'Real React chat client; isolated mock HTTP backend.', sends, pageErrors: errors }, null, 2));
  console.log(`Chat UI smoke PASS: ${scratch}`);
} finally {
  if (browser) await browser.close();
  if (vite) await vite.close();
  if (apiServer.listening) await new Promise(resolve => apiServer.close(resolve));
}
