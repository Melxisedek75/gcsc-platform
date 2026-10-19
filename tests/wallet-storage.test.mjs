import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../apps/mobile/lib/walletStorage.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness() {
  const values = new Map();
  let finishWrite;
  let finishRemove;
  const native = {
    getItem: async key => values.get(key) ?? null,
    setItem: (key, value) => new Promise(resolve => {
      finishWrite = () => { values.set(key, value); resolve(); };
    }),
    removeItem: key => new Promise(resolve => {
      finishRemove = () => { values.delete(key); resolve(); };
    }),
  };
  const api = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: api.exports, module: api,
    require: name => {
      assert.equal(name, '@react-native-async-storage/async-storage');
      return { __esModule: true, default: native };
    },
    setTimeout, clearTimeout,
  });
  return { storage: api.exports.walletStorage, values,
    finishWrite: () => finishWrite(), finishRemove: () => finishRemove() };
}

test('wallet write does not report completion before native persistence', async () => {
  const h = harness();
  let completed = false;
  const writing = h.storage.setItem('user-auth', 'alice').then(() => { completed = true; });
  await Promise.resolve();
  assert.equal(completed, false);
  h.finishWrite();
  await writing;
  assert.equal(h.values.get('user-auth'), 'alice');
});

test('wallet removal does not report completion before native deletion', async () => {
  const h = harness();
  h.values.set('user-auth', 'alice');
  let completed = false;
  const removing = h.storage.removeItem('user-auth').then(() => { completed = true; });
  await Promise.resolve();
  assert.equal(completed, false);
  h.finishRemove();
  await removing;
  assert.equal(h.values.has('user-auth'), false);
});
