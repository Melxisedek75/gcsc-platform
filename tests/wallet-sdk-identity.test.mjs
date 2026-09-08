import test, { after, before, mock } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import net from 'node:net';
import dgram from 'node:dgram';
import { fileURLToPath } from 'node:url';
import { blockNetwork, loadPinnedCodecs, readJson, sha } from './helpers/wallet-sdk-fixture.mjs';

// Characterization of installed SDKs, NOT an authentication acceptance suite.
const root = fileURLToPath(new URL('../', import.meta.url));
const chainId = '11'.repeat(32); // Synthetic identifiers; no network is queried.
const signer = { actor: 'alice', permission: 'active' };
const expiration = '2030-01-01T00:00:00';
let codecs;

before(async () => {
  blockNetwork(mock);
  codecs = await loadPinnedCodecs(root);
});

after(() => mock.restoreAll());

function request(app, overrides = {}) {
  return codecs.get(app).sdk.SigningRequest.identity({
    chainId, account: signer.actor, permission: signer.permission,
    callback: 'http://127.0.0.1/identity/a', ...overrides,
  });
}

function resolve(req, actor = signer, time = expiration) {
  return req.resolve(new Map(), actor, { expiration: time });
}

function digest(req, actor = signer, time = expiration) {
  const result = resolve(req, actor, time);
  return result.transaction.signingDigest(result.chainId).toString();
}

for (const app of ['web', 'mobile']) {
  test(`${app}: installed SDK versions match the pinned lockfile`, t => {
    const { pkg, appRoot, lock, modulePath } = codecs.get(app);
    const names = ['@proton/link', '@proton/signing-request', '@proton/web-sdk'];
    if (app === 'mobile') names.push('@proton/react-native-sdk');
    for (const name of names) {
      const installed = readJson(path.join(appRoot, 'node_modules', name, 'package.json'));
      assert.equal(installed.version, lock.packages[`node_modules/${name}`]?.version, name);
      t.diagnostic(`${name}=${installed.version}`);
    }
    t.diagnostic(`codec ${pkg.version} module SHA-256=${sha(modulePath)}`);
  });

  test(`${app}: identity request round-trips as non-broadcast v2`, () => {
    const req = request(app);
    const decoded = codecs.get(app).sdk.SigningRequest.from(req.encode(false));
    assert.equal(decoded.version, 2);
    assert.equal(decoded.isIdentity(), true);
    assert.equal(decoded.shouldBroadcast(), false);
    assert.equal(decoded.getChainId().toString(), chainId);
    assert.equal(decoded.getIdentity().toString(), signer.actor);
    assert.equal(decoded.getIdentityPermission().toString(), signer.permission);
    const tx = resolve(decoded).transaction;
    assert.equal(tx.actions.length, 1);
    assert.equal(tx.actions[0].account.toString(), '');
    assert.equal(tx.actions[0].name.toString(), 'identity');
  });

  test(`${app}: explicit broadcasting of an identity request is rejected`, () => {
    assert.throws(() => codecs.get(app).sdk.SigningRequest.createSync({
      chainId, identity: { permission: signer }, broadcast: true,
    }), /identity request cannot be broadcast/);
  });

  for (const field of ['nonce', 'domain']) {
    test(`${app}: HAZARD ${field} metadata is not part of the signed digest`, () => {
      const info = { nonce: 'challenge-a', domain: 'first.invalid' };
      const first = request(app, { info });
      const second = request(app, { info: { ...info, [field]: 'changed.invalid' } });
      assert.notEqual(first.encode(false), second.encode(false));
      assert.equal(digest(first), digest(second));
    });
  }

  test(`${app}: HAZARD callback URL is not part of the signed digest`, () => {
    const first = request(app);
    const second = request(app, { callback: 'http://127.0.0.1/identity/b' });
    assert.notEqual(first.encode(false), second.encode(false));
    assert.equal(digest(first), digest(second));
  });

  test(`${app}: HAZARD unsupported identity scope is silently omitted`, () => {
    const first = request(app, { scope: 'first' });
    const second = request(app, { scope: 'second' });
    assert.equal(first.encode(false), second.encode(false));
    assert.equal(typeof first.getIdentityScope, 'undefined');
    assert.equal(digest(first), digest(second));
  });

  test(`${app}: HAZARD v2 resolution ignores supplied expiration`, () => {
    const req = request(app);
    assert.equal(resolve(req).transaction.expiration.toString(), '1970-01-01T00:00:00');
    assert.equal(digest(req, signer, expiration), digest(req, signer, '2031-01-01T00:00:00'));
  });

  test(`${app}: changing chain changes the signed digest`, () => {
    assert.notEqual(digest(request(app)), digest(request(app, { chainId: '22'.repeat(32) })));
  });

  test(`${app}: changing signer permission changes the signed digest`, () => {
    const other = { ...signer, permission: 'owner' };
    assert.notEqual(digest(request(app)), digest(request(app, { permission: other.permission }), other));
  });

  test(`${app}: changing signer account changes the signed digest`, () => {
    const other = { actor: 'bob', permission: 'active' };
    assert.notEqual(digest(request(app)), digest(request(app, { account: other.actor }), other));
  });
}

test('web/native codecs agree on identity bytes and digest in both directions', () => {
  const web = request('web');
  const mobile = request('mobile');
  assert.equal(web.encode(false), mobile.encode(false));
  assert.equal(digest(web), digest(mobile));
  for (const [from, to] of [['web', 'mobile'], ['mobile', 'web']]) {
    const decoded = codecs.get(to).sdk.SigningRequest.from(request(from).encode(false));
    assert.equal(digest(decoded), digest(request(to)));
  }
});

test('network entrypoints fail closed', async () => {
  assert.throws(() => globalThis.fetch('http://127.0.0.1'), /Network forbidden/);
  assert.throws(() => net.connect({ port: 9, host: '127.0.0.1' }), /Network forbidden/);
  assert.throws(() => dgram.createSocket('udp4'), /Network forbidden/);
});
