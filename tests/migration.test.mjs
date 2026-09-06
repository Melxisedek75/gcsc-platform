import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const manifest = readJson('docs/migration/import-manifest.json');

test('application API package selects the declared canonical runtime', () => {
  const pkg = readJson('services/api/v3/package.json');
  assert.equal(pkg.main, 'pure-server.js');
  assert.equal(pkg.scripts.start, 'node pure-server.js');
  assert.equal(pkg.scripts.dev, 'nodemon pure-server.js');
});

test('competing application servers are not active build inputs', () => {
  for (const p of ['services/api/v3/server.js', 'services/api/v3/routes', 'apps/web/api', 'construction-ai/server.js', 'xprclaw']) {
    assert.equal(fs.existsSync(path.join(root, p)), false, p);
  }
});

test('every imported file equals its source blob or an explicitly recorded adaptation', () => {
  const adaptationPath = path.join(root, 'docs/migration/adaptations.json');
  const adaptations = fs.existsSync(adaptationPath) ? readJson('docs/migration/adaptations.json') : [];
  const overrides = new Map(adaptations.map(x => [x.path, x]));
  assert.equal(overrides.size, adaptations.length);
  const paths = new Set();
  for (const f of manifest.files) {
    assert(!path.isAbsolute(f.path) && !f.path.split('/').includes('..'));
    assert(!paths.has(f.path), `collision: ${f.path}`);
    paths.add(f.path);
    const bytes = fs.readFileSync(path.join(root, f.path));
    const hash = createHash('sha256').update(bytes).digest('hex');
    const adaptation = overrides.get(f.path);
    if (adaptation) {
      assert.equal(adaptation.sourceBlob, f.blob);
      assert(adaptation.reason && adaptation.test);
    } else {
      const blob = createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
      assert.equal(blob, f.blob, `Git object mismatch: ${f.path}`);
    }
    assert.equal(hash, adaptation?.sha256 ?? f.sha256, f.path);
  }
  for (const key of overrides.keys()) assert(paths.has(key), `orphan adaptation: ${key}`);
});

test('manifest original paths and exclusions match preserved Git trees', () => {
  for (const source of manifest.sources) {
    const r = spawnSync('git', ['ls-tree', '-rz', '--full-tree', source.commit], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    assert.equal(r.status, 0, r.stderr);
    const tree = new Map(r.stdout.split('\0').filter(Boolean).map(line => {
      const tab = line.indexOf('\t');
      return [line.slice(tab + 1), line.slice(0, tab).split(' ')[2]];
    }));
    const accounted = new Set();
    const imported = manifest.files.filter(f => f.source === source.id);
    for (const f of imported) {
      assert.equal(f.commit, source.commit);
      assert.equal(tree.get(f.originalPath), f.blob, f.originalPath);
      assert(!accounted.has(f.originalPath));
      accounted.add(f.originalPath);
    }
    assert.equal(imported.length, source.files);
    for (const f of manifest.excluded.filter(f => f.source === source.id)) {
      assert.equal(tree.get(f.path), f.blob, f.path);
      assert(!accounted.has(f.path));
      assert(f.reason);
      accounted.add(f.path);
    }
    if (source.id !== 'whitepaper-v14') assert.equal(accounted.size, tree.size, `${source.id}: unaccounted source files`);
  }
});

test('three source repos and internal whitepaper history remain reachable', () => {
  assert.equal(manifest.sourceCount, 3);
  const required = {
    website: 'archive/website/main', backend: 'archive/backend/main',
    store: 'archive/store/api-backend', 'whitepaper-v14': 'archive/website/internal-whitepaper-v14',
  };
  for (const source of manifest.sources) {
    let r = spawnSync('git', ['rev-parse', '--verify', required[source.id]], { cwd: root, encoding: 'utf8', windowsHide: true });
    if (r.status !== 0) r = spawnSync('git', ['rev-parse', '--verify', `origin/${required[source.id]}`], { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), source.commit);
  }
});

test('public whitepaper and internal v1.4 have distinct provenance', () => {
  assert(manifest.files.some(x => x.path === 'apps/marketing/whitepaper.html' && x.source === 'website'));
  assert(manifest.files.some(x => x.path === 'docs/whitepaper/whitepaper-v1-4-renovation-financing-draft.md' && x.source === 'whitepaper-v14'));
});

test('imported local domain modules resolve without a competing application server', async () => {
  const domain = await import('../packages/domain-simulation/src/index.mjs');
  assert.equal(typeof domain.applyEscrowMilestoneTransition, 'function');
  assert.equal(typeof domain.calculateDraftRepaymentWaterfall, 'function');
});
