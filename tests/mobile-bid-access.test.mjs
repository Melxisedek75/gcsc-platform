import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

function loadJobs(apiRequest) {
  const code = ts.transpileModule(source('../apps/mobile/lib/jobs.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => name === './api'
      ? { apiRequest }
      : { default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } },
  });
  return exports;
}

test('bid access probe distinguishes a paid project from a public preview', async () => {
  const calls = [];
  const jobs = loadJobs(async path => {
    calls.push(path);
    return { project: { id: 41 } };
  });
  assert.equal(await jobs.hasBackendProjectAccess(41), true);
  assert.deepEqual(calls, ['/api/projects/41/details']);

  const unpaid = loadJobs(async () => { throw { status: 404 }; });
  assert.equal(await unpaid.hasBackendProjectAccess(41), false);

  for (const status of [0, 401, 500]) {
    const broken = loadJobs(async () => { throw { status }; });
    await assert.rejects(broken.hasBackendProjectAccess(41), error => error.status === status);
  }
});

test('bid form checks project access before entry and handles a late access revocation', () => {
  const screen = source('../apps/mobile/app/(contractor)/bid-submit/[jobId].tsx');
  assert.match(screen, /hasBackendProjectAccess\(/);
  assert.match(screen, /accessGranted === false/);
  assert.match(screen, /project_access_required/);
  assert.match(screen, /Project-specific checkout is not available/);
  assert.match(screen, /placeBackendBid\(/);
});

test('generic XPR lead purchase cannot imply project-specific bid access', () => {
  const bids = source('../apps/mobile/app/(contractor)/bid.tsx');
  assert.doesNotMatch(bids, /PaymentSheet|PAYMENT_CONFIG|Buy lead|addLead\(/);
  assert.match(bids, /listLeads\(/);
  assert.match(bids, /not unlock a specific job/i);
});
