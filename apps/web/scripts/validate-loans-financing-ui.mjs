import fs from 'node:fs';
import path from 'node:path';
import { readDashboardSource } from './lib/dashboard-source.mjs';

const root = process.cwd();
const dashboard = readDashboardSource(root);
const api = fs.readFileSync(path.join(root, 'src/services/api.ts'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const checks = [
  {
    ok: dashboard.includes("'loans'") && dashboard.includes('LoansFinancingPanel') && dashboard.includes('SmartContractor Financing'),
    message: 'Dashboard must expose a Loans / Financing section.',
  },
  {
    ok:
      dashboard.includes('Escrow-Backed Contractor Advance') &&
      dashboard.includes('Token-Collateral Equipment Credit') &&
      dashboard.includes('ClaimBridge Emergency Advance') &&
      dashboard.includes('Contract-Backed Working Capital'),
    message: 'Loans panel must include all four future financing products.',
  },
  {
    ok:
      dashboard.includes('Demo/MVP gate only') &&
      dashboard.includes('No live funds are issued yet') &&
      dashboard.includes('No token lock, liquidation, or live lending yet') &&
      dashboard.includes('No assignment of benefits, insurer integration, or claim payout routing yet') &&
      dashboard.includes('No live loan issuance or repayment routing yet'),
    message: 'Loans panel must clearly avoid live lending promises.',
  },
  {
    ok:
      dashboard.includes('Availability and terms may depend on your state') &&
      dashboard.includes('Your selected state:') &&
      dashboard.includes('Add your property or business state to check future eligibility'),
    message: 'Loans panel must include state-aware eligibility copy.',
  },
  {
    ok:
      dashboard.includes('These financing workflows are in demo/MVP readiness') &&
      dashboard.includes('Real-money activation requires identity verification'),
    message: 'Loans panel must include safety/legal readiness copy.',
  },
  {
    ok:
      dashboard.includes('Readiness checklist') &&
      dashboard.includes('Profile and role saved') &&
      dashboard.includes('State selected') &&
      dashboard.includes('Contract, escrow, claim, or collateral context added') &&
      dashboard.includes('Admin review required') &&
      dashboard.includes('Not live lending'),
    message: 'Loans panel must include a simple readiness checklist.',
  },
  {
    ok: pkg.scripts?.['check:loans-financing'] === 'node scripts/validate-loans-financing-ui.mjs',
    message: 'package.json must expose check:loans-financing.',
  },
  {
    ok:
      api.includes('GcscFinancingPrecheck') &&
      api.includes('createFinancingPrecheck') &&
      api.includes('/financing/prechecks') &&
      api.includes('getAdminFinancingPrechecks') &&
      api.includes('/admin/financing-prechecks'),
    message: 'API client must expose demo financing precheck endpoints.',
  },
  {
    ok:
      dashboard.includes('Financing Review') &&
      dashboard.includes('AdminFinancingPrechecksPanel') &&
      dashboard.includes('financing.precheck.created') &&
      dashboard.includes('Save demo precheck'),
    message: 'Dashboard must include user precheck submission and admin review view.',
  },
  {
    ok:
      dashboard.includes('min-[2200px]:grid-cols-[minmax(0,1fr)_420px]') &&
      dashboard.includes('xl:grid-cols-2 gap-5') &&
      dashboard.includes('min-[2200px]:sticky') &&
      !dashboard.includes('lg:grid-cols-[minmax(0,1fr)_380px]') &&
      !dashboard.includes('md:grid-cols-2 gap-5'),
    message: 'Loans panel must not squeeze product cards into narrow columns before ultra-wide screens.',
  },
];

const failed = checks.filter((check) => !check.ok);

if (failed.length) {
  for (const check of failed) {
    console.error(`FAIL: ${check.message}`);
  }
  process.exit(1);
}

console.log('loans financing UI validation passed');
