import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createWalletBinding } from '../packages/wallet-proof/binding-client.mjs';

function load(file, stubs) {
  const source = fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8').replaceAll('import.meta.env.VITE_XPR_TESTNET_RPC_URL', 'undefined');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    if (!(name in stubs)) throw new Error('Unexpected dependency ' + name);
    return stubs[name];
  }, Error });
  return exports;
}
for (const platform of ['web', 'mobile']) {
  for (const stage of ['connect', 'challenge', 'sign', 'verify', 'none']) {
    test(`${platform} binding ${stage === 'none' ? 'completes canonical proof' : 'rejects session change at ' + stage}`, async () => {
      let token = 'original';
      let verifies = 0;
      const user = { id: 12, wallet: { verified: true } };
      const hit = name => { if (name === stage) token = 'different'; };
      const connect = async () => { hit('connect'); return { account: 'alice', permission: 'active' }; };
      const sign = async () => { hit('sign'); return {}; };
      const challenge = async () => { hit('challenge'); return {}; };
      const verify = async () => { verifies++; hit('verify'); return { user }; };
      let run;
      if (platform === 'mobile') {
        const api = { getToken: () => token, getCurrentUser: () => user, normalizeUser: x => x,
          apiRequest: path => path.endsWith('/challenge') ? challenge() : verify() };
        const module = load('apps/mobile/lib/auth.ts', { './api': api,
          './webauth': { connectWallet: connect, signWalletOwnershipChallenge: sign },
          '../../../packages/wallet-proof/login-client.mjs': { createWalletFirstLogin: () => () => {} },
          '../../../packages/wallet-proof/binding-client.mjs': { createWalletBinding } });
        run = () => module.bindWallet();
      } else {
        const api = { getToken: () => token, getProfile: async () => ({ user }),
          walletOwnershipChallenge: challenge, walletOwnershipVerify: verify };
        const module = load('apps/web/src/services/walletBinding.ts', { './api': { api },
          './webauth': { connectWebAuthSession: async () => {
            const identity = await connect();
            return { wallet: { accountName: identity.account, permission: identity.permission },
              session: { chainId: '71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd' } };
          }, signWebAuthOwnershipChallenge: sign },
          '../../../../packages/wallet-proof/binding-client.mjs': { createWalletBinding } });
        run = () => module.bindWebAuthWallet(12);
      }
      if (stage === 'none') { assert.equal((await run()).id, 12); assert.equal(verifies, 1); }
      else { await assert.rejects(run(), /wallet_binding_session_changed/); assert.equal(verifies, stage === 'verify' ? 1 : 0); }
    });
  }
}

test('mobile logout clears wallet pairing before the application session', async () => {
  const cleared = [];
  const module = load('apps/mobile/lib/auth.ts', {
    './api': { clearSession: async () => { cleared.push('app'); } },
    './webauth': { clearSession: async () => { cleared.push('wallet'); } },
    '../../../packages/wallet-proof/login-client.mjs': { createWalletFirstLogin: () => () => {} },
    '../../../packages/wallet-proof/binding-client.mjs': { createWalletBinding },
  });
  await module.logout();
  assert.deepEqual(cleared, ['wallet', 'app']);
});

test('mobile logout clears the application session when wallet cleanup never settles', async () => {
  let appCleared = false;
  const module = load('apps/mobile/lib/auth.ts', {
    './api': { clearSession: async () => { appCleared = true; } },
    './webauth': { clearSession: async () => new Promise(() => {}) },
    '../../../packages/wallet-proof/login-client.mjs': { createWalletFirstLogin: () => () => {} },
    '../../../packages/wallet-proof/binding-client.mjs': { createWalletBinding },
  });
  await Promise.race([
    module.logout(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('logout_waited_for_wallet')), 50)),
  ]);
  assert.equal(appCleared, true);
});
