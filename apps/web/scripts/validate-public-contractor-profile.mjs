import fs from 'node:fs';
import path from 'node:path';
import { readDashboardSource } from './lib/dashboard-source.mjs';

const root = process.cwd();
const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const dashboard = readDashboardSource(root);
const api = fs.readFileSync(path.join(root, 'src/services/api.ts'), 'utf8');
const pagePath = path.join(root, 'src/pages/ContractorProfile.tsx');
const page = fs.existsSync(pagePath) ? fs.readFileSync(pagePath, 'utf8') : '';
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const checks = [
  {
    ok: api.includes('getPublicContractorProfile(') && api.includes('/contractors/'),
    message: 'API client must load public contractor profiles.',
  },
  {
    ok: app.includes('ContractorProfile') && app.includes('/contractors/:id'),
    message: 'App routes must expose /contractors/:id.',
  },
  {
    ok: page.includes('Public Contractor Profile') && page.includes('Verification Status'),
    message: 'Contractor profile page must show public profile and verification status.',
  },
  {
    ok: dashboard.includes('/contractors/${bid.contractor_id}') && dashboard.includes('View profile'),
    message: 'Bid cards must link to the public contractor profile.',
  },
  {
    ok: pkg.scripts?.['check:public-contractor-profile'] === 'node scripts/validate-public-contractor-profile.mjs',
    message: 'package.json must expose check:public-contractor-profile.',
  },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure.message}`);
  process.exit(1);
}

console.log('public contractor profile validation passed');
