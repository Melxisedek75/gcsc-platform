import fs from 'node:fs';
import path from 'node:path';
import { readDashboardSource } from './lib/dashboard-source.mjs';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const api = read('src/services/api.ts');
const dashboard = readDashboardSource(root);
const settlement = read('src/services/xprSettlement.ts');
const pkg = read('package.json');

const checks = [
  {
    name: 'package exposes chain audit validator',
    ok: pkg.includes('"check:chain-audit"'),
  },
  {
    name: 'api client has chain tx type and recorder',
    ok:
      api.includes('interface GcscChainTx') &&
      api.includes('chain_txs?: GcscChainTx[]') &&
      api.includes('recordMilestoneChainTx') &&
      api.includes('verifyMilestoneChainTx') &&
      api.includes('/chain-txs'),
  },
  {
    name: 'settlement result includes chain metadata needed for audit',
    ok:
      settlement.includes('chainId: XPR_TESTNET_CHAIN_ID') &&
      settlement.includes('contractAccount: GCSC_ESCROW_CONTRACT') &&
      settlement.includes('action: params.action'),
  },
  {
    name: 'dashboard records tx hash after successful WebAuth signature',
    ok:
      dashboard.includes('api.recordMilestoneChainTx') &&
      dashboard.includes('result.transactionId') &&
      dashboard.includes('chain_id: result.chainId') &&
      dashboard.includes('contract_account: result.contractAccount'),
  },
  {
    name: 'dashboard renders testnet explorer audit links',
    ok:
      dashboard.includes('chain_txs') &&
      dashboard.includes('testnet.explorer.xprnetwork.org') &&
      dashboard.includes('On-chain audit trail') &&
      dashboard.includes('Verify Tx') &&
      dashboard.includes('tx.status'),
  },
];

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('chain tx audit validation failed');
  for (const check of failed) console.error(`- ${check.name}`);
  process.exit(1);
}

console.log('chain tx audit validation passed');
