import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
// Parse the actual page function, not a copied implementation. Only IO is replaced.
const source = fs.readFileSync(new URL('../apps/web/src/pages/Wallet.tsx', import.meta.url), 'utf8');
const file = ts.createSourceFile('Wallet.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let loader;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'loadWallet') loader = node.initializer;
  ts.forEachChild(node, visit);
}
visit(file);
assert.ok(loader && ts.isArrowFunction(loader));
const code = ts.transpileModule(`(${loader.getText(file)})()`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
for (const failure of ['profile', 'profile500', 'profile401', 'storageMismatch', 'clientChanged', 'restore', 'connect', 'connect401', 'anonymous', 'success', 'unmounted']) {
  test(`wallet restore: ${failure}`, async () => {
    let cleared = false;
    let status = '';
    let user = null;
    let wallet = null;
    let writes = 0;
    let clientToken = failure === 'anonymous' ? null : 'existing-token';
    const context = vm.createContext({
      ApiError,
      mounted: failure !== 'unmounted',
      localStorage: { getItem: () => failure === 'anonymous' ? null : failure === 'storageMismatch' ? 'new-token' : 'existing-token' },
      api: {
        getToken: () => clientToken,
        getProfile: async () => {
          if (failure === 'clientChanged') clientToken = 'new-token';
          if (failure === 'profile') throw new Error('offline');
          if (failure === 'profile500') throw new ApiError('unavailable', 500);
          if (['profile401', 'storageMismatch', 'clientChanged'].includes(failure)) throw new ApiError('unauthorized', 401);
          return { user: { id: 1 } };
        },
        connectWallet: async () => {
          if (failure === 'connect') throw new Error('ownership rejected');
          if (failure === 'connect401') throw new ApiError('wallet rejected', 401);
          return { user: { id: 1 }, wallet: { accountName: 'fixture' } };
        },
        clearToken: () => { cleared = true; },
      },
      restoreWebAuthWallet: async () => {
        if (['restore', 'anonymous'].includes(failure)) throw new Error('wallet unavailable');
        return { accountName: 'fixture' };
      },
      setUser: value => { user = value; writes++; },
      setWallet: value => { wallet = value; writes++; },
      setStatus: value => { status = value; writes++; },
    });
    await vm.runInContext(code, context);
    assert.equal(cleared, failure === 'profile401');
    if (failure === 'unmounted') { assert.equal(writes, 0); return; }
    assert.ok(status.length > 0, 'success or failure must be visible');
    if (['restore', 'connect', 'connect401'].includes(failure)) {
      assert.equal(user.id, 1, 'keep the authenticated profile');
      assert.equal(wallet, null, 'do not invent a verified wallet');
    }
    if (failure === 'success') assert.equal(wallet.accountName, 'fixture');
  });
}
