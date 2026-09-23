import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('web API exposes unauthenticated wallet-first challenge and verify routes', () => {
  const api = read('apps/web/src/services/api.ts');
  assert.match(api, /walletLoginChallenge[\s\S]*\/auth\/wallet\/challenge[\s\S]*false\)/);
  assert.match(api, /walletLoginVerify[\s\S]*\/auth\/wallet\/verify[\s\S]*false\)/);
});

test('web wallet login uses the shared sign-only orchestration and persists only the returned token', () => {
  const service = read('apps/web/src/services/walletLogin.ts');
  assert.match(service, /createWalletFirstLogin/);
  assert.match(service, /connectWebAuthSession/);
  assert.match(service, /signWebAuthOwnershipChallenge/);
  assert.match(service, /api\.walletLoginChallenge/);
  assert.match(service, /api\.walletLoginVerify/);
  assert.match(service, /api\.setToken\(token\)/);
  assert.match(service, /71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd/);
  assert.match(service, /https:\/\/testnet-api\.alvosec\.com/);
  assert.match(service, /connected\.session\.chainId !== XPR_TESTNET_CHAIN_ID/);
  assert.match(service, /wallet_login_wrong_network/);
  assert.doesNotMatch(service, /broadcast\s*:\s*true|connectWallet\(/);
});

test('dashboard login exposes an active WebAuth command', () => {
  const access = read('apps/web/src/pages/dashboard/AccountAccess.tsx');
  assert.match(access, /onClick=\{loginWithWallet\}/);
  assert.match(access, /Continue with WebAuth wallet/);
});
