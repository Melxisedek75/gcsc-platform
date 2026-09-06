import fs from 'node:fs';
import path from 'node:path';
import { readDashboardSource } from './lib/dashboard-source.mjs';

const root = process.cwd();
const dashboard = readDashboardSource(root);
const api = fs.readFileSync(path.join(root, 'src/services/api.ts'), 'utf8');

const checks = [
  {
    ok: api.includes('interface GcscMilestone'),
    message: 'API client must expose GcscMilestone type.',
  },
  {
    ok: api.includes('createMilestone(') && dashboard.includes('api.createMilestone('),
    message: 'Dashboard must create milestones through the backend API.',
  },
  {
    ok: api.includes('submitMilestone(') && dashboard.includes('api.submitMilestone('),
    message: 'Dashboard must let contractors submit milestones through the backend API.',
  },
  {
    ok: api.includes('approveMilestone(') && dashboard.includes('api.approveMilestone('),
    message: 'Dashboard must let homeowners approve milestones through the backend API.',
  },
  {
    ok: api.includes('releaseMilestone(') && dashboard.includes('api.releaseMilestone('),
    message: 'Dashboard must let homeowners mark approved milestones as released through the backend API.',
  },
  {
    ok: api.includes('disputeMilestone(') && dashboard.includes('api.disputeMilestone('),
    message: 'Dashboard must let escrow participants dispute milestones through the backend API.',
  },
  {
    ok: dashboard.includes('MilestoneManager') && dashboard.includes('MilestoneComposer'),
    message: 'Dashboard must expose milestone management UI.',
  },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure.message}`);
  process.exit(1);
}

console.log('milestones workflow validation passed');
