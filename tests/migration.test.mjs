import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { verifySourceSnapshot } from '../scripts/source-provenance.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const manifest = readJson('docs/migration/import-manifest.json');
const provenance = readJson('docs/migration/source-provenance.json');

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

test('manifest original paths and exclusions match cryptographically pinned source trees', () => {
  assert.equal(provenance.version, 1);
  assert.equal(provenance.snapshots.length, manifest.sources.length);
  assert.equal(new Set(provenance.snapshots.map(s => s.id)).size, manifest.sources.length);
  for (const source of manifest.sources) {
    const snapshot = provenance.snapshots.find(s => s.id === source.id);
    assert.ok(snapshot, `missing source evidence: ${source.id}`);
    const tree = verifySourceSnapshot(snapshot, source.commit);
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

test('three source repos and internal whitepaper retain distinct pinned identities', () => {
  assert.equal(manifest.sourceCount, 3);
  assert.deepEqual(manifest.sources.map(s => s.id).sort(), ['backend', 'store', 'website', 'whitepaper-v14']);
  for (const source of manifest.sources) {
    assert.equal(provenance.snapshots.find(s => s.id === source.id)?.commit, source.commit);
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
