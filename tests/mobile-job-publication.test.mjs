import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function loadJobs(apiRequest) {
  const source = fs.readFileSync(new URL('../apps/mobile/lib/jobs.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
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

test('job creation stores the entered budget and publishes the server project without payment', async () => {
  const calls = [];
  const jobs = loadJobs(async (path, options) => {
    calls.push({ path, options });
    return path === '/api/projects'
      ? { project: { id: 41 } }
      : { project: { id: 41, published: true } };
  });
  const budget = jobs.parseBudgetRange('$3,000 - $6,000');
  assert.deepEqual({ ...budget }, { budget_min: 3000, budget_max: 6000 });
  const id = await jobs.createBackendProject({
    title: 'Test renovation', description: 'Synthetic job', category: 'Renovation',
    location: '98103', ...budget,
  });
  assert.equal(id, 41);
  assert.equal(calls[0].path, '/api/projects');
  assert.equal(calls[0].options.body.budget_min, 3000);
  assert.equal(calls[0].options.body.budget_max, 6000);
  const published = await jobs.publishBackendProject(id);
  assert.equal(published.published, true);
  assert.equal(calls[1].path, '/api/projects/41/publish');
  assert.equal(calls[1].options.method, 'POST');
});

test('invalid budget cannot silently publish an incorrect amount', () => {
  const jobs = loadJobs(async () => ({}));
  assert.equal(typeof jobs.parseBudgetRange, 'function');
  for (const value of ['', '$5k - $10k', '$0 - $10', '$900 - $100', 'not a number']) {
    assert.throws(() => jobs.parseBudgetRange(value), /budget/i);
  }
});

test('public contractor project age uses the published timestamp and omits invalid dates', () => {
  const jobs = loadJobs(async () => ({}));
  const preview = { published_at: new Date(Date.now() - 125_000).toISOString() };
  assert.equal(jobs.publicProjectAge(preview), '2m ago');
  assert.equal(jobs.publicProjectAge({ published_at: null }), null);
  assert.equal(jobs.publicProjectAge({ published_at: 'invalid' }), null);

  for (const screen of [
    '../apps/mobile/app/(contractor)/jobs.tsx',
    '../apps/mobile/app/(contractor)/bid-submit/[jobId].tsx',
  ]) {
    const source = fs.readFileSync(new URL(screen, import.meta.url), 'utf8');
    assert.match(source, /publicProjectAge\(/);
    assert.doesNotMatch(source, /timeAgoIso\([^)]*\.created_at\)/);
  }
});

test('homeowner publication and job views use server persistence without the disabled fee', () => {
  const post = fs.readFileSync(new URL('../apps/mobile/app/(homeowner)/post-job.tsx', import.meta.url), 'utf8');
  const list = fs.readFileSync(new URL('../apps/mobile/app/(homeowner)/jobs.tsx', import.meta.url), 'utf8');
  const detail = fs.readFileSync(new URL('../apps/mobile/app/(homeowner)/job/[id].tsx', import.meta.url), 'utf8');
  assert.match(post, /publishBackendProject/);
  assert.doesNotMatch(post, /PaymentSheet|PAYMENT_CONFIG|addJob\(/);
  assert.match(list, /listMyBackendProjects/);
  assert.doesNotMatch(list, /listJobs\(/);
  assert.match(detail, /getBackendProject/);
  assert.match(detail, /publishBackendProject/);
  assert.doesNotMatch(detail, /getJob\(|DEFAULT_MILESTONES/);
});
