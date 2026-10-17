import fs from 'node:fs';
import path from 'node:path';
import { readDashboardSource } from './lib/dashboard-source.mjs';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const checks = [
  {
    name: 'xpr settlement service exists',
    ok: exists('src/services/xprSettlement.ts'),
  },
  {
    name: 'package exposes xpr settlement validator',
    ok: read('package.json').includes('"check:xpr-settlement"'),
  },
];

const service = checks[0].ok ? read('src/services/xprSettlement.ts') : '';
const dashboard = readDashboardSource(root);
const webauth = read('src/services/webauth.ts');

checks.push(
  {
    name: 'WebAuth session can be reused for transaction signing',
    ok: webauth.includes('connectWebAuthSession') && webauth.includes('session.transact'),
  },
  {
    name: 'settlement service targets explicit XPR testnet config',
    ok:
      service.includes('XPR_TESTNET_CHAIN_ID') &&
      service.includes('VITE_XPR_TESTNET_RPC_URL') &&
      !service.includes('https://proton.greymass.com'),
  },
  {
    name: 'settlement service sends real gcscrow1111 milestone action names',
    ok:
      service.includes('gcscrow1111') &&
      service.includes('submitms') &&
      service.includes('approvems') &&
      service.includes('releasems') &&
      service.includes('disputems') &&
      service.includes('session.transact') &&
      !service.includes("'submitmilestone'") &&
      !service.includes("'approvemilestone'") &&
      !service.includes("'releasemilestone'") &&
      !service.includes("'disputemilestone'"),
  },
  {
    name: 'dashboard exposes testnet signing controls',
    ok:
      dashboard.includes('signEscrowMilestoneAction') &&
      dashboard.includes('Sign Testnet') &&
      dashboard.includes('Testnet signing only'),
  },
  {
    name: 'dashboard requires a current verified WebAuth wallet before escrow signing',
    ok:
      dashboard.includes('user.wallet?.accountName') &&
      dashboard.includes('current.wallet?.verified === true') && dashboard.includes('isSessionCurrent'),
  },
  {
    name: 'dashboard refuses to record missing WebAuth transaction ids',
    ok:
      dashboard.includes('if (!result.transactionId)') &&
      dashboard.includes('Escrow transaction outcome is unknown. Reconcile the chain before signing again.'),
  },
  {
    name: 'settlement rejects account, permission and chain mismatch before broadcast',
    ok:
      service.includes('session.auth?.actor !== expectedActor') &&
      service.includes('session.auth?.permission !== expectedPermission') &&
      service.includes('session.chainId !== XPR_TESTNET_CHAIN_ID') &&
      service.indexOf('session.auth?.actor !== expectedActor') < service.indexOf('await session.transact('),
  },
  {
    name: 'dashboard scopes settlement controls to accepted escrow details',
    ok:
      dashboard.includes('selectedEscrow &&') &&
      dashboard.includes('<MilestoneManager') &&
      dashboard.includes('Bid accepted. Escrow record created.'),
  },
);

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('xpr settlement validation failed');
  for (const check of failed) console.error(`- ${check.name}`);
  process.exit(1);
}

console.log('xpr settlement validation passed');
