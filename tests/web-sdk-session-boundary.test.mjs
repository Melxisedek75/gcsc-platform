import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../apps/web/src/services/webauth.ts', import.meta.url), 'utf8').replaceAll('import.meta.env', 'env');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function setup(auth = { actor: 'alice', permission: 'active' }) {
  const raw = { auth, chainId: 'test-chain', transact: async () => ({}) };
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, env: {}, window: { location: { origin: 'https://example.test' } }, require: name => {
    if (name === '@proton/web-sdk') return { __esModule: true, default: async () => ({ session: raw }) };
    if (name.endsWith('request-proof.mjs')) return { createOwnershipProofRequester() {} };
    throw new Error(name);
  } });
  return { raw, connect: module.exports.connectWebAuthSession };
}
test('web SDK missing permission is refused instead of assumed active', async () => {
  const { connect } = setup({ actor: 'alice' });
  await assert.rejects(connect(), /permission/i);
});
test('web signing wrapper reflects subsequent SDK identity and chain changes', async () => {
  const { connect, raw } = setup();
  const connected = await connect();
  raw.auth = { actor: 'mallory', permission: 'owner' }; raw.chainId = 'changed-chain';
  assert.equal(connected.session.auth.actor, 'mallory');
  assert.equal(connected.session.auth.permission, 'owner');
  assert.equal(connected.session.chainId, 'changed-chain');
  assert.equal(connected.wallet.accountName, 'alice');
});
