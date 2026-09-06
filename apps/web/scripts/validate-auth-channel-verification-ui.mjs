import fs from 'node:fs';
import path from 'node:path';
import { readDashboardSource } from './lib/dashboard-source.mjs';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const dashboard = readDashboardSource(root);
const api = read('src/services/api.ts');

const checks = [
  {
    ok: api.includes('verificationMode') &&
      api.includes('checkVerification(') &&
      api.includes("'/auth/verification/check'"),
    message: 'API client must support verification-required registration and verification check.',
  },
  {
    ok: dashboard.includes('verificationPending') &&
      dashboard.includes('Verify your code') &&
      dashboard.includes('Send code again'),
    message: 'Dashboard registration must show an OTP verification step and resend control.',
  },
  {
    ok: dashboard.includes("role === 'homeowner' ? 'sms' : 'email'") &&
      dashboard.includes('Homeowners verify by SMS') &&
      dashboard.includes('Contractors verify by email'),
    message: 'Dashboard must route homeowners to SMS and contractors to email with clear copy.',
  },
];

const failed = checks.filter((check) => !check.ok);

if (failed.length) {
  for (const check of failed) {
    console.error(`FAIL: ${check.message}`);
  }
  process.exit(1);
}

console.log('auth channel verification UI validation passed');
