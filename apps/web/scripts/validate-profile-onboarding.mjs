import fs from 'node:fs';
import path from 'node:path';
import { readDashboardSource } from './lib/dashboard-source.mjs';

const root = process.cwd();
const dashboard = readDashboardSource(root);
const api = fs.readFileSync(path.join(root, 'src/services/api.ts'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const checks = [
  {
    ok: api.includes('interface GcscProfileCompletion') && api.includes('profile_completion?: GcscProfileCompletion'),
    message: 'API client must type the backend profile completion payload.',
  },
  {
    ok: dashboard.includes('Profile completeness') && dashboard.includes('completion.percent'),
    message: 'Dashboard profile panel must show profile completion progress.',
  },
  {
    ok: dashboard.includes('Missing profile data') && dashboard.includes('profile_completion'),
    message: 'Dashboard must surface missing profile fields from the backend.',
  },
  {
    ok: dashboard.includes('Upload logo') && dashboard.includes('Logo file is too large'),
    message: 'Dashboard must keep the real logo upload workflow.',
  },
  {
    ok: pkg.scripts?.['check:profile-onboarding'] === 'node scripts/validate-profile-onboarding.mjs',
    message: 'package.json must expose check:profile-onboarding.',
  },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure.message}`);
  process.exit(1);
}

console.log('profile onboarding validation passed');
