import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { blockNetwork, loadPinnedCodecs, sha } from './helpers/wallet-sdk-fixture.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const signer = { actor: 'alice', permission: 'active' };
const chainId = '11'.repeat(32);
const fields = {
  version: 1, purpose: 'login', audience: 'https://first.invalid',
  nonce: 'a'.repeat(64), sessionBinding: 'b'.repeat(64),
  issuedAt: '2030-01-01T00:00:00', expiresAt: '2030-01-01T00:02:00',
};
let codecs;

before(async () => {
  blockNetwork(mock);
  codecs = await loadPinnedCodecs(root);
});
after(() => mock.restoreAll());

// An unsigned serialization experiment, NOT a deployed or wallet-approved action.
// Empty receivers ensure this is not a real payment or callable chain contract.
function transaction(app, changes = {}) {
  const identity = codecs.get(app).sdk.SigningRequest.identity({
    chainId, account: signer.actor, permission: signer.permission,
  }).resolve(new Map(), signer).transaction.actions[0];
  const payload = { ...fields, ...changes };
  return {
    expiration: payload.expiresAt, ref_block_num: 0, ref_block_prefix: 0,
    actions: [JSON.parse(JSON.stringify(identity))],
    context_free_actions: [{
      account: '', name: 'nonce', authorization: [],
      data: Buffer.from(JSON.stringify(payload), 'utf8').toString('hex'),
    }],
  };
}

function encodingOptions(app) {
  return { scheme: 'proton-dev', zlib: codecs.get(app).requireFromLink('pako') };
}

function request(app, tx = transaction(app)) {
  const codec = codecs.get(app);
  return codec.sdk.SigningRequest.createSync({
    chainId, transaction: tx, broadcast: false,
  }, encodingOptions(app));
}

function resolved(req) { return req.resolve(new Map(), signer); }
function digest(req) {
  const r = resolved(req);
  return r.transaction.signingDigest(r.chainId).toString();
}

// Execute installed transport source with ONLY device/window IO replaced.
// This is source-level transport characterization, not bundled wallet E2E.
function transportModule(app, relative, dependencies, globals, t) {
  const codec = codecs.get(app);
  const filename = path.join(codec.appRoot, 'node_modules', relative);
  const ts = codec.requireFromLink('typescript');
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  });
  assert.deepEqual(output.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error), []);
  const exports = {};
  vm.runInNewContext(output.outputText, {
    exports, console,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Unmocked transport import: ${name}`);
      return dependencies[name];
    },
    ...globals,
  }, { filename, timeout: 1000 });
  t.diagnostic(`${app} transport source SHA-256=${sha(filename)}`);
  return exports;
}

for (const app of ['web', 'mobile']) {
  test(`${app}: explicit full-transaction envelope preserves unsigned challenge bytes`, () => {
    const req = request(app);
    const decoded = codecs.get(app).sdk.SigningRequest.from(req.encode(false), encodingOptions(app));
    assert.equal(decoded.shouldBroadcast(), false);
    assert.equal(decoded.isIdentity(), false);
    const tx = resolved(decoded).transaction;
    assert.equal(tx.expiration.toString(), fields.expiresAt);
    assert.equal(tx.actions.length, 1);
    assert.equal(tx.actions[0].account.toString(), '');
    assert.equal(tx.actions[0].name.toString(), 'identity');
    assert.equal(tx.context_free_actions.length, 1);
    assert.equal(tx.context_free_actions[0].account.toString(), '');
    assert.equal(tx.context_free_actions[0].authorization.length, 0);
    assert.deepEqual(JSON.parse(Buffer.from(tx.context_free_actions[0].data.array).toString('utf8')), fields);
    assert.equal(digest(req), digest(decoded));
  });

  for (const [field, changed] of Object.entries({
    version: 2, purpose: 'link', audience: 'https://second.invalid',
    nonce: 'c'.repeat(64), sessionBinding: 'd'.repeat(64),
    issuedAt: '2030-01-01T00:00:01', expiresAt: '2030-01-01T00:02:01',
  })) {
    test(`${app}: full-transaction digest binds ${field}`, () => {
      assert.notEqual(digest(request(app)), digest(request(app, transaction(app, { [field]: changed }))));
    });
  }
}

test('web and native full-transaction encodings/digests agree', () => {
  assert.equal(request('web').encode(false), request('mobile').encode(false));
  assert.equal(digest(request('web')), digest(request('mobile')));
});

test('native transport retains the payload in the URI without opening a device', t => {
  const uris = [];
  const { default: Transport } = transportModule('mobile', '@proton/react-native-sdk/src/transport.ts', {
    'react-native': { Linking: { openURL: uri => { uris.push(uri); return Promise.resolve(); } } },
  }, {}, t);
  const transport = new Transport({ requestAccount: 'gcsc.test', getReturnUrl: () => 'smartcontractor://fixture' });
  const req = request('mobile');
  req.setCallback('http://127.0.0.1/fixture', true);
  transport.onRequest(req, () => assert.fail('unexpected cancel'));
  assert.equal(uris.length, 1);
  const codec = codecs.get('mobile');
  const decoded = codec.sdk.SigningRequest.from(uris[0], encodingOptions('mobile'));
  assert.equal(decoded.shouldBroadcast(), false);
  assert.equal(digest(decoded), digest(req));
});

test('web popup forwards explicit transaction and sign-only options without opening a browser', async t => {
  const messages = [];
  let opened = 0;
  const child = { closed: false, close() {}, postMessage: payload => messages.push(JSON.parse(payload)) };
  const { ProtonWebLink } = transportModule('web', '@proton/web-sdk/src/links/protonWeb.ts', {
    '@proton/js': { JsonRpc: class { constructor() { assert.fail('RPC initialization forbidden'); } } },
  }, {
    setInterval: () => 0,
    window: { addEventListener() {}, open: () => { opened++; return child; } },
  }, t);
  const link = new ProtonWebLink({ scheme: 'proton-dev', chainId, transport: {}, storage: null });
  const session = link.createSession(signer);
  const tx = transaction('web');
  const pending = session.transact({ transaction: tx }, { broadcast: false, noModify: true });
  await link.onEvent({ origin: 'https://testnet.webauth.com', data: JSON.stringify({ type: 'isReady' }) });
  assert.equal(opened, 1);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].type, 'transaction');
  assert.deepEqual(messages[0].data.transaction, tx);
  assert.deepEqual(messages[0].data.params, { broadcast: false, noModify: true });
  await link.onEvent({ origin: 'https://testnet.webauth.com', data: JSON.stringify({ type: 'transactionSuccess', data: { fixture: true } }) });
  assert.deepEqual(JSON.parse(JSON.stringify(await pending)), { fixture: true });
});
