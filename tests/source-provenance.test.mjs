import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { verifySourceSnapshot } from '../scripts/source-provenance.mjs';

const { snapshots } = JSON.parse(fs.readFileSync(new URL('../docs/migration/source-provenance.json', import.meta.url)));
for (const source of snapshots) {
  test(`source inventory verifies without Git history: ${source.id}`, () => {
    assert.equal(verifySourceSnapshot(source, source.commit).size, source.entries.length);
  });
}
for (const kind of ['blob', 'mode', 'path', 'commit', 'duplicate', 'missing', 'traversal', 'repository', 'ref', 'archiveRef', 'selection']) {
  test(`source inventory rejects tampering: ${kind}`, () => {
    const source = structuredClone(snapshots[0]);
    if (kind === 'blob') source.entries[0].oid = '0'.repeat(40);
    if (kind === 'mode') source.entries[0].mode = source.entries[0].mode === '100644' ? '100755' : '100644';
    if (kind === 'path') source.entries[0].path += '.tampered';
    if (kind === 'commit') source.commitObject += '\n';
    if (kind === 'duplicate') source.entries.push(source.entries[0]);
    if (kind === 'missing') source.entries.pop();
    if (kind === 'traversal') source.entries[0].path = '../outside';
    if (['repository', 'ref', 'archiveRef', 'selection'].includes(kind)) source[kind] = 'tampered';
    assert.throws(() => verifySourceSnapshot(source, snapshots[0].commit));
  });
}
