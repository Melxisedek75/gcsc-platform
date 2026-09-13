import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifySourceSnapshot } from './source-provenance.mjs';
import { sourceOrigins } from './source-origins.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(fs.readFileSync(new URL('../docs/migration/import-manifest.json', import.meta.url)));
const snapshots = manifest.sources.map(source => {
  const options = { cwd: root, windowsHide: true, maxBuffer: 16 * 1024 * 1024 };
  const origin = sourceOrigins[source.id];
  const resolved = execFileSync('git', ['rev-parse', '--verify', origin.archiveRef], options).toString('utf8').trim();
  if (resolved !== source.commit) throw new Error(`Archive ref mismatch for ${source.id}`);
  const rawCommit = execFileSync('git', ['cat-file', 'commit', source.commit], options);
  const commitObject = rawCommit.toString('utf8');
  const rawTree = execFileSync('git', ['ls-tree', '-rz', '--full-tree', source.commit], options);
  const entries = rawTree.toString('utf8').split('\0').filter(Boolean).map(line => {
      const tab = line.indexOf('\t');
      const [mode, type, oid] = line.slice(0, tab).split(' ');
      return { mode, type, path: line.slice(tab + 1), oid };
    });
  const roundTrip = Buffer.from(entries.map(e => `${e.mode} ${e.type} ${e.oid}\t${e.path}\0`).join(''));
  if (!roundTrip.equals(rawTree) || !Buffer.from(commitObject).equals(rawCommit)) {
    throw new Error('Non-UTF8 Git bytes require a binary evidence format; refusing lossy conversion');
  }
  const snapshot = { id: source.id, ...origin, commit: source.commit, commitObject, entries };
  verifySourceSnapshot(snapshot, source.commit);
  return snapshot;
});
fs.writeFileSync(new URL('../docs/migration/source-provenance.json', import.meta.url), JSON.stringify({ version: 1, snapshots }, null, 2) + '\n');
console.log(`Captured and verified ${snapshots.length} source trees; no source file contents or parent history exported.`);
