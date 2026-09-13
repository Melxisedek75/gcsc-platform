const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const v3Root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(v3Root, 'package.json'), 'utf8'));
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'backend-production-checks.yml');
const packetPath = path.join(repoRoot, 'FOUNDER-ACTION-PACKET.md');

assert.strictEqual(
  pkg.scripts['test:founder-action-packet'],
  'node tests/founder-action-packet.test.js',
  'package.json must expose test:founder-action-packet'
);

assert.ok(fs.existsSync(packetPath), 'FOUNDER-ACTION-PACKET.md must exist');
assert.ok(fs.existsSync(workflowPath), 'backend production checks workflow must exist');

const packet = fs.readFileSync(packetPath, 'utf8');
const workflow = fs.readFileSync(workflowPath, 'utf8');

for (const required of [
  '# Founder Action Packet',
  'Priority 0 - Resolve GitHub Actions Account Lock',
  'Priority 1 - Create First Admin Account',
  'Priority 2 - Redeploy Railway Frontend Preview',
  'Priority 3 - Run Role-By-Role Non-Money Pilot',
  'Priority 4 - Configure Monitoring Alerts',
  'Priority 5 - PostgreSQL Backup And Restore Drill',
  'Priority 6 - Stripe Test-Mode Payment Setup',
  'Priority 7 - XPR Testnet Signed Escrow Transaction',
  'Priority 8 - Smart Contract Deployment And Permissions Verification',
  'Priority 9 - Legal And External Security Review',
  'npm --prefix v3 run ops:status',
  'npm --prefix v3 run ops:gates',
  'npm --prefix v3 run ops:evidence:scan',
  'STRICT_RAILWAY_FRONTEND',
  'admin:bootstrap:check',
  'PILOT-RUNBOOK.md',
  'MONITORING-RUNBOOK.md',
  'POSTGRES-RESTORE-DRILL.md',
  'PAYMENT-READINESS.md',
  'XPR-ESCROW-SETTLEMENT-SPEC.md',
  'SECURITY-PRODUCTION-CHECKLIST.md',
  'Do not send the admin password in chat',
  'No mainnet token or fund movement',
  'Codex must stop or mark blocked',
]) {
  assert.ok(packet.includes(required), `founder action packet must include ${required}`);
}

assert.ok(
  workflow.includes('Founder action packet validation'),
  'workflow must include founder action packet validation step'
);
assert.ok(
  workflow.includes('npm --prefix v3 run test:founder-action-packet'),
  'workflow must run test:founder-action-packet'
);

assert.doesNotMatch(packet, /ghp_[A-Za-z0-9]+/, 'founder packet must not include GitHub tokens');
assert.doesNotMatch(packet, /sk_live_[A-Za-z0-9]+/, 'founder packet must not include live Stripe keys');
assert.doesNotMatch(packet, /whsec_[A-Za-z0-9]+/, 'founder packet must not include webhook secrets');
assert.doesNotMatch(packet, /postgres(?:ql)?:\/\/[^\s)]+/i, 'founder packet must not include database URLs');
assert.doesNotMatch(packet, /Bearer\s+[A-Za-z0-9._-]+/, 'founder packet must not include bearer tokens');

console.log('founder action packet validation passed');
