import fs from 'node:fs';
import path from 'node:path';
import { readDashboardSource } from './lib/dashboard-source.mjs';

const root = process.cwd();
const dashboard = readDashboardSource(root);
const api = fs.readFileSync(path.join(root, 'src/services/api.ts'), 'utf8');

const checks = [
  {
    ok: !dashboard.includes('const projects: Project[] = ['),
    message: 'Dashboard must not use the static projects mock array.',
  },
  {
    ok: !dashboard.includes('const bids: Bid[] = ['),
    message: 'Dashboard must not use the static bids mock array.',
  },
  {
    ok: api.includes('createProject(') && dashboard.includes('api.createProject('),
    message: 'Dashboard must create homeowner projects through the backend API.',
  },
  {
    ok: api.includes('getMyProjects(') && dashboard.includes('api.getMyProjects('),
    message: 'Dashboard must load account projects through the backend API.',
  },
  {
    ok: api.includes('getMyBids(') && dashboard.includes('api.getMyBids('),
    message: 'Dashboard must load contractor bids through the backend API.',
  },
  {
    ok: api.includes('acceptBid(') && dashboard.includes('api.acceptBid('),
    message: 'Dashboard must let homeowners accept bids through the backend API.',
  },
  {
    ok: dashboard.includes('ProjectRequestForm') && dashboard.includes('BidComposer'),
    message: 'Dashboard must expose project creation and bid composition UI.',
  },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure.message}`);
  process.exit(1);
}

console.log('dashboard live workflow validation passed');
