import fs from 'node:fs';
import path from 'node:path';
import { readDashboardSource } from './lib/dashboard-source.mjs';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const dashboard = readDashboardSource(root);
const api = read('src/services/api.ts');

const checks = [
  {
    ok: api.includes("'/auth/register'"),
    message: 'Frontend registration must use the production auth register endpoint.',
  },
  {
    ok: dashboard.includes('gcsc_registration_notice') &&
      dashboard.includes('GCSC account created') &&
      dashboard.includes('Check the verification status panel before using sensitive owner, contractor, claim, or finance workflows'),
    message: 'Dashboard must show a clear post-registration notice explaining account status and missing email/SMS verification.',
  },
  {
    ok: dashboard.includes('Contractors verify by email and homeowners verify by SMS') &&
      dashboard.includes('pending provider setup'),
    message: 'Registration form must disclose the role-based verification flow before account creation.',
  },
];

const failed = checks.filter((check) => !check.ok);

if (failed.length) {
  for (const check of failed) {
    console.error(`FAIL: ${check.message}`);
  }
  process.exit(1);
}

console.log('auth registration feedback validation passed');
