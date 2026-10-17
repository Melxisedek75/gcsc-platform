import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDashboardSource } from './lib/dashboard-source.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const packageJson = JSON.parse(read('package.json'));
const webauth = read('src/services/webauth.ts');
const walletPage = read('src/pages/Wallet.tsx');
const dashboard = readDashboardSource(root);
const binding = read('src/services/walletBinding.ts');

const checks = [
  {
    ok: Boolean(packageJson.dependencies?.['@proton/web-sdk']),
    message: '@proton/web-sdk must remain installed for WebAuth wallet integration.',
  },
  {
    ok: webauth.includes("import ProtonWebSDK from '@proton/web-sdk'"),
    message: 'WebAuth service must use the official Proton Web SDK.',
  },
  {
    ok: webauth.includes('restoreWebAuthWallet') && webauth.includes('restoreSession'),
    message: 'WebAuth service must support silent session restore.',
  },
  {
    ok: webauth.includes('session.publicKey') || webauth.includes('publicKey'),
    message: 'WebAuth service must capture the returned public key when available.',
  },
  {
    ok: walletPage.includes('restoreWebAuthWallet') && walletPage.includes('connectWebAuthWallet'),
    message: 'Wallet page must support connect and restore flows.',
  },
  {
    ok: dashboard.includes('bindWebAuthWallet') && binding.includes('api.walletOwnershipChallenge') && binding.includes('signWebAuthOwnershipChallenge') && binding.includes('api.walletOwnershipVerify') && !dashboard.includes('api.connectWallet('),
    message: 'Dashboard wallet panel must verify ownership through challenge/sign/verify before saving a linked wallet.',
  },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure.message}`);
  process.exit(1);
}

console.log('webauth integration validation passed');
