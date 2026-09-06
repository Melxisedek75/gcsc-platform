import fs from 'node:fs';
import path from 'node:path';
import { readDashboardSource } from './lib/dashboard-source.mjs';

const root = process.cwd();
const dashboard = readDashboardSource(root);
const api = fs.readFileSync(path.join(root, 'src/services/api.ts'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const checks = [
  {
    ok: api.includes('interface GcscUserDocument') && api.includes('interface GcscCompliance'),
    message: 'API client must type user documents and compliance summary.',
  },
  {
    ok: api.includes('getCompliance(') && api.includes("'/auth/compliance'"),
    message: 'API client must load compliance from the backend.',
  },
  {
    ok: api.includes('submitDocument(') && api.includes("'/auth/documents'"),
    message: 'API client must submit verification documents to the backend.',
  },
  {
    ok: dashboard.includes("'compliance'") && dashboard.includes('CompliancePanel'),
    message: 'Dashboard must expose a Compliance section.',
  },
  {
    ok: dashboard.includes('Contractor Verification') && dashboard.includes('Required Documents'),
    message: 'Compliance panel must show contractor verification and required documents.',
  },
  {
    ok: dashboard.includes('api.getCompliance') && dashboard.includes('api.submitDocument'),
    message: 'Compliance panel must use live backend APIs.',
  },
  {
    ok: pkg.scripts?.['check:compliance-documents'] === 'node scripts/validate-compliance-documents.mjs',
    message: 'package.json must expose check:compliance-documents.',
  },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure.message}`);
  process.exit(1);
}

console.log('compliance documents validation passed');
