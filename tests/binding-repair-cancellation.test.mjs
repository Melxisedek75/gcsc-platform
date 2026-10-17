import test from 'node:test';
import assert from 'node:assert/strict';
import { createWalletBinding } from '../packages/wallet-proof/binding-client.mjs';

test('binding discards verified response when cancelled while verification was in flight', async () => {
  const controller = new AbortController();
  const bind = createWalletBinding({
    connect: async () => ({ account: 'alice', permission: 'active' }),
    issueChallenge: async () => ({}),
    sign: async () => ({}),
    verify: async () => { controller.abort(); return { user: { wallet: { verified: true } } }; },
  });
  await assert.rejects(bind({ signal: controller.signal }), /wallet_binding_cancelled/);
});
