import fs from 'node:fs';
import path from 'node:path';
import { readDashboardSource } from './lib/dashboard-source.mjs';

const root = process.cwd();
const dashboard = readDashboardSource(root);
const api = fs.readFileSync(path.join(root, 'src/services/api.ts'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const requiredAuditActions = [
  'profile.updated',
  'document.submitted',
  'document.reviewed',
  'wallet.connected',
  'project.created',
  'bid.submitted',
  'bid.accepted',
  'escrow.milestone.created',
  'escrow.milestone.submitted',
  'escrow.milestone.approved',
  'escrow.milestone.released',
  'escrow.milestone.disputed',
  'escrow.chain_tx.recorded',
  'escrow.chain_tx.confirmed',
  'escrow.chain_tx.failed',
  'financing.precheck.created',
  'payment.intent.created',
];

const requiredFilterLabels = [
  'Projects',
  'Submitted Bids',
  'Accepted Bids',
  'Milestone Created',
  'Milestone Submitted',
  'Milestone Approved',
  'Milestone Released',
  'Milestone Disputed',
  'Chain Tx Recorded',
  'Chain Tx Confirmed',
  'Chain Tx Failed',
  'Payments',
];

const checks = [
  {
    ok: api.includes('interface GcscAuditEvent') && api.includes('getAdminAuditEvents('),
    message: 'API client must type and load admin audit events.',
  },
  {
    ok: api.includes('/admin/audit-events'),
    message: 'API client must call /admin/audit-events.',
  },
  {
    ok: dashboard.includes("'admin-audit'") && dashboard.includes('AdminAuditLogPanel'),
    message: 'Dashboard must include an admin audit log section.',
  },
  {
    ok: dashboard.includes('Audit Log') && dashboard.includes('Trust Events'),
    message: 'Audit panel must show clear admin audit labels.',
  },
  {
    ok: requiredAuditActions.every((action) => dashboard.includes(action)),
    message: 'Audit panel must expose all production trust event action labels.',
  },
  {
    ok: requiredFilterLabels.every((label) => dashboard.includes(label)),
    message: 'Audit panel must expose filters for project, bid, milestone, chain, and payment events.',
  },
  {
    ok: dashboard.includes('api.getAdminAuditEvents') && dashboard.includes('event.metadata'),
    message: 'Audit panel must render live API events and metadata.',
  },
  {
    ok: pkg.scripts?.['check:admin-audit-log'] === 'node scripts/validate-admin-audit-log.mjs',
    message: 'package.json must expose check:admin-audit-log.',
  },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure.message}`);
  process.exit(1);
}

console.log('admin audit log validation passed');
