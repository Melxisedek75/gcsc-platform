import fs from 'node:fs';
import path from 'node:path';
import { readDashboardSource } from './lib/dashboard-source.mjs';

const root = process.cwd();
const dashboard = readDashboardSource(root);
const api = fs.readFileSync(path.join(root, 'src/services/api.ts'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const checks = [
  {
    ok: api.includes("role: 'homeowner' | 'contractor' | 'admin'"),
    message: 'API client must type admin users.',
  },
  {
    ok: api.includes('getAdminDocuments(') && api.includes('/admin/documents'),
    message: 'API client must expose admin document review listing.',
  },
  {
    ok: dashboard.includes("'admin-review'") && dashboard.includes('AdminDocumentReviewPanel'),
    message: 'Dashboard must include an admin document review section.',
  },
  {
    ok: dashboard.includes('Admin Review') && dashboard.includes('Submitted Documents'),
    message: 'Admin review panel must show clear review labels.',
  },
  {
    ok: dashboard.includes('Approve') && dashboard.includes('Reject'),
    message: 'Admin review panel must expose approve and reject actions.',
  },
  {
    ok:
      dashboard.includes('reviewNotes') &&
      dashboard.includes('setReviewNotes') &&
      dashboard.includes('Admin review note') &&
      dashboard.includes('Manual note required when rejecting a document') &&
      dashboard.includes('reviewNote: manualNote'),
    message: 'Admin review panel must require an editable review note before rejection and send the manual note to the backend.',
  },
  {
    ok: dashboard.includes('api.getAdminDocuments') && dashboard.includes('api.reviewDocument'),
    message: 'Admin review panel must use live admin document APIs.',
  },
  {
    ok: pkg.scripts?.['check:admin-documents'] === 'node scripts/validate-admin-document-review.mjs',
    message: 'package.json must expose check:admin-documents.',
  },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure.message}`);
  process.exit(1);
}

console.log('admin document review validation passed');
