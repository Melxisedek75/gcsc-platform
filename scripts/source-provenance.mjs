import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sourceOrigins } from './source-origins.mjs';

export function gitHash(type, bytes) {
  return createHash('sha1').update(Buffer.from(`${type} ${bytes.length}\0`)).update(bytes).digest('hex');
}

export function verifySourceSnapshot(snapshot, expectedCommit) {
  const origin = sourceOrigins[snapshot.id];
  assert.ok(origin, 'unknown source identity');
  for (const [field, value] of Object.entries(origin)) assert.equal(snapshot[field], value, `source ${field}`);
  assert.equal(snapshot.commit, expectedCommit);
  assert.equal(gitHash('commit', Buffer.from(snapshot.commitObject, 'utf8')), expectedCommit);
  const tree = /^tree ([a-f0-9]{40})\n/.exec(snapshot.commitObject)?.[1];
  assert.ok(tree, 'source commit must declare its tree');
  const root = new Map();
  const files = new Map();
  for (const entry of snapshot.entries) {
    assert.match(entry.oid, /^[a-f0-9]{40}$/);
    assert.ok(['100644', '100755', '120000', '160000'].includes(entry.mode));
    assert.equal(entry.type, entry.mode === '160000' ? 'commit' : 'blob');
    assert.equal(typeof entry.path, 'string');
    const parts = entry.path.split('/');
    assert.ok(parts.every(p => p && p !== '.' && p !== '..' && !p.includes('\0')));
    assert.ok(!files.has(entry.path), `duplicate source path: ${entry.path}`);
    files.set(entry.path, entry.oid);
    let dir = root;
    for (const part of parts.slice(0, -1)) {
      if (!dir.has(part)) dir.set(part, { mode: '40000', children: new Map() });
      const node = dir.get(part);
      assert.ok(node.children, `source file/directory collision: ${entry.path}`);
      dir = node.children;
    }
    const name = parts.at(-1);
    assert.ok(!dir.has(name), `source path collision: ${entry.path}`);
    dir.set(name, { mode: entry.mode, oid: entry.oid });
  }
  // Git sorts directory names with a trailing slash and stores raw 20-byte OIDs.
  function hashTree(dir) {
    const entries = [...dir].sort(([a, x], [b, y]) => Buffer.compare(
      Buffer.from(a + (x.children ? '/' : '')), Buffer.from(b + (y.children ? '/' : ''))));
    const bytes = Buffer.concat(entries.flatMap(([name, node]) => [
      Buffer.from(`${node.mode} ${name}\0`),
      Buffer.from(node.children ? hashTree(node.children) : node.oid, 'hex'),
    ]));
    return gitHash('tree', bytes);
  }
  assert.equal(hashTree(root), tree, 'source inventory does not match the pinned commit tree');
  return files;
}
