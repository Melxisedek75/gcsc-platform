import fs from 'node:fs';
import path from 'node:path';
import { readDashboardSource } from './lib/dashboard-source.mjs';

const root = process.cwd();
const dashboard = readDashboardSource(root);
const api = fs.readFileSync(path.join(root, 'src/services/api.ts'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const adminDocuments = fs.readFileSync(path.join(root, 'scripts/validate-admin-document-review.mjs'), 'utf8');
const adminAudit = fs.readFileSync(path.join(root, 'scripts/validate-admin-audit-log.mjs'), 'utf8');
const contractorVerification = fs.readFileSync(path.join(root, 'scripts/validate-contractor-verification-visibility.mjs'), 'utf8');
const publicProfile = fs.readFileSync(path.join(root, 'scripts/validate-public-contractor-profile.mjs'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const checks = [
  {
    ok: dashboard.includes("adminOnly: true") && dashboard.includes("'admin-review'") && dashboard.includes("'admin-audit'"),
    message: 'Admin Review and Audit Log must be admin-only navigation items.',
  },
  {
    ok:
      dashboard.includes('reviewNotes') &&
      dashboard.includes('Manual note required when rejecting a document') &&
      dashboard.includes('reviewNote: manualNote'),
    message: 'Admin document rejection must require and send a manual review note.',
  },
  {
    ok:
      api.includes('reviewDocument(') &&
      api.includes('getAdminDocuments(') &&
      api.includes('getAdminAuditEvents(') &&
      api.includes('/admin/audit-events'),
    message: 'API client must expose document review and audit log endpoints.',
  },
  {
    ok:
      dashboard.includes('ContractorTrustBadge') &&
      dashboard.includes('Contractor must be verified before bid acceptance') &&
      dashboard.includes('Verification Required') &&
      dashboard.includes('api.acceptBid('),
    message: 'Bid acceptance must be blocked in the UI until contractor verification is complete.',
  },
  {
    ok:
      dashboard.includes('/contractors/${bid.contractor_id}') &&
      dashboard.includes('View profile') &&
      app.includes('/contractors/:id') &&
      api.includes('getPublicContractorProfile('),
    message: 'Homeowners must be able to open a public contractor profile before bid acceptance.',
  },
  {
    ok:
      dashboard.includes('profile.updated') &&
      dashboard.includes('document.reviewed') &&
      dashboard.includes('wallet.connected') &&
      dashboard.includes('bid.accepted'),
    message: 'Audit Log must expose trust-sensitive profile, document, wallet, and bid events.',
  },
  {
    ok:
      adminDocuments.includes('Manual note required when rejecting a document') &&
      adminAudit.includes('bid.accepted') &&
      contractorVerification.includes('Contractor must be verified before bid acceptance') &&
      publicProfile.includes('View profile'),
    message: 'Dedicated validators must continue covering admin, audit, verification, and public profile gates.',
  },
  {
    ok: pkg.scripts?.['check:trust-workflow'] === 'node scripts/validate-production-trust-workflow.mjs',
    message: 'package.json must expose check:trust-workflow.',
  },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure.message}`);
  process.exit(1);
}

console.log('production trust workflow validation passed');
