import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../archive/legacy-local-20260913/', import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

test('local recovery preserves all staged/untracked candidates from both sources', () => {
  assert.equal(manifest.version, 1);
  assert.equal(manifest.activation, 'archived-only');
  assert.deepEqual(manifest.sources.map(source => source.repo).sort(), ['gcsc-smart-contractor', 'gcsc-store']);
  assert.deepEqual(manifest.sources.map(source => source.files.length), [11, 1]);
  for (const source of manifest.sources) {
    assert.match(source.head, /^[a-f0-9]{40}$/);
    assert.match(source.statusSha256, /^[a-f0-9]{64}$/);
  }
});

test('every archived candidate matches its original byte count and SHA-256', () => {
  const seen = new Set();
  for (const source of manifest.sources) {
    for (const entry of source.files) {
      assert.ok(entry.path.startsWith(`${source.repo}/`));
      assert.ok(!entry.path.split(/[\\/]/).includes('..'));
      assert.ok(!path.isAbsolute(entry.path));
      assert.ok(!seen.has(entry.path));
      seen.add(entry.path);
      const file = path.join(root, entry.path);
      assert.ok(fs.lstatSync(file).isFile());
      const bytes = fs.readFileSync(file);
      assert.equal(bytes.length, entry.bytes, entry.path);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.path);
    }
  }
});
