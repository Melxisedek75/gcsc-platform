import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const evidence = JSON.parse(fs.readFileSync(new URL('../docs/migration/source-provenance.json', import.meta.url)));
const refs = {
  website: 'archive/website/main', backend: 'archive/backend/main',
  store: 'archive/store/api-backend', 'whitepaper-v14': 'archive/website/internal-whitepaper-v14',
};
for (const snapshot of evidence.snapshots) {
  test(`local full-history preservation: ${snapshot.id}`, () => {
    const options = { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 };
    assert.equal(execFileSync('git', ['rev-parse', '--verify', refs[snapshot.id]], options).trim(), snapshot.commit);
    assert.equal(execFileSync('git', ['cat-file', 'commit', snapshot.commit], options), snapshot.commitObject);
    const expected = snapshot.entries.map(e => `${e.mode} ${e.mode === '160000' ? 'commit' : 'blob'} ${e.oid}\t${e.path}\0`).join('');
    assert.equal(execFileSync('git', ['ls-tree', '-rz', '--full-tree', snapshot.commit], options), expected);
  });
}
