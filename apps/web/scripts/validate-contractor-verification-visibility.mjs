import fs from 'node:fs';
import path from 'node:path';
import { readDashboardSource } from './lib/dashboard-source.mjs';

const root = process.cwd();
const dashboard = readDashboardSource(root);
const api = fs.readFileSync(path.join(root, 'src/services/api.ts'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const checks = [
  {
    ok: api.includes('interface GcscBidContractor') && api.includes('contractor_verification?: GcscCompliance | null'),
    message: 'API client must type contractor public profile and verification on bids.',
  },
  {
    ok: dashboard.includes('ContractorTrustBadge') && dashboard.includes('contractor_verification'),
    message: 'Dashboard must render contractor verification status from each bid.',
  },
  {
    ok: dashboard.includes('Verified Contractor') && dashboard.includes('Pending review') && dashboard.includes('Missing documents'),
    message: 'Dashboard must expose homeowner-friendly trust labels.',
  },
  {
    ok: dashboard.includes('Ready for escrow bidding') && dashboard.includes('Verification status'),
    message: 'Bid cards must explain whether the contractor is ready for escrow bidding.',
  },
  {
    ok: dashboard.includes('Contractor must be verified before bid acceptance') && dashboard.includes('Verification Required'),
    message: 'Dashboard must block bid acceptance until contractor verification is complete.',
  },
  {
    ok: pkg.scripts?.['check:contractor-verification'] === 'node scripts/validate-contractor-verification-visibility.mjs',
    message: 'package.json must expose check:contractor-verification.',
  },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure.message}`);
  process.exit(1);
}

console.log('contractor verification visibility validation passed');
