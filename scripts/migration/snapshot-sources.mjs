import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = 'C:/gcsc-migration-20260906-final';
const sources = [
  { id: 'website', repo: 'gcsc-website', local: 'C:/gcsc' },
  { id: 'backend', repo: 'gcsc-smart-contractor', local: 'C:/gcsc-smart-contractor' },
  { id: 'store', repo: 'gcsc-store', local: 'C:/gcsc-store' },
];
function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'buffer', maxBuffer: 128 * 1024 * 1024, windowsHide: true });
  if (r.status !== 0) throw new Error(`git ${args[0]}: ${r.stderr?.toString().slice(-1500)}`);
  return r.stdout;
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function writeNew(file, bytes) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes, { flag: 'wx' });
}
if (fs.existsSync(root)) throw new Error('Snapshot target already exists; refusing to overwrite');
fs.mkdirSync(root);
const report = { createdAt: new Date().toISOString(), sources: [], limitations: [] };
for (const source of sources) {
  const dest = path.join(root, source.id);
  fs.mkdirSync(dest);
  const head = git(source.local, ['rev-parse', 'HEAD']).toString().trim();
  const status = git(source.local, ['status', '--porcelain=v1', '-z', '--untracked-files=normal']);
  const refs = git(source.local, ['for-each-ref', '--format=%(objectname) %(refname)']);
  writeNew(path.join(dest, 'status-before.nul'), status);
  writeNew(path.join(dest, 'refs-local.txt'), refs);
  writeNew(path.join(dest, 'tracked-worktree.patch'), git(source.local, ['diff', '--binary', '--no-ext-diff']));
  writeNew(path.join(dest, 'tracked-index.patch'), git(source.local, ['diff', '--cached', '--binary', '--no-ext-diff']));
  const dirty = [...new Set([
    ...git(source.local, ['diff', '--name-only', '-z', 'HEAD']).toString().split('\0'),
    ...git(source.local, ['ls-files', '--others', '--exclude-standard', '-z', '--', '.', ':(exclude)_collected', ':(exclude)_local_backup_before_github_sync*', ':(exclude).tools', ':(exclude)**/node_modules/**']).toString().split('\0'),
  ].filter(Boolean))];
  const entries = [];
  for (const rel of dirty) {
    const from = path.resolve(source.local, rel);
    if (!from.startsWith(path.resolve(source.local) + path.sep)) throw new Error('Unsafe dirty path');
    if (!fs.existsSync(from)) { entries.push({ path: rel, deleted: true }); continue; }
    const stat = fs.lstatSync(from);
    if (!stat.isFile()) { entries.push({ path: rel, skipped: 'not regular file' }); continue; }
    // Unrelated collected projects and generated output stay in the untouched source.
    const excluded = /(^|\/)(node_modules|\.git|_collected|_local_backup_before_github_sync[^/]*|\.tools)(\/|$)/.test(rel);
    const secret = /(^|\/)(\.env($|\.(?!example$|template$))|credentials[^/]*|token\.json)|\.(pem|p12|keystore|jks)$/i.test(rel);
    if (excluded || secret || stat.size > 25 * 1024 * 1024) {
      entries.push({ path: rel, size: stat.size, skipped: secret ? 'secret-like path; untouched' : 'unrelated/tooling/large; untouched' });
      continue;
    }
    const bytes = fs.readFileSync(from);
    writeNew(path.join(dest, 'dirty-files', rel), bytes);
    entries.push({ path: rel, size: bytes.length, sha256: sha(bytes) });
  }
  writeNew(path.join(dest, 'dirty-manifest.json'), JSON.stringify(entries, null, 2));
  git(source.local, ['bundle', 'create', path.join(dest, 'local-all-refs.bundle'), '--all']);
  git(source.local, ['bundle', 'verify', path.join(dest, 'local-all-refs.bundle')]);
  const remote = path.join(dest, 'upstream.git');
  git(root, ['clone', '--mirror', `https://github.com/Melxisedek75/${source.repo}.git`, remote]);
  const upstreamRefs = git(remote, ['for-each-ref', '--format=%(objectname) %(refname)']).toString();
  writeNew(path.join(dest, 'refs-upstream.txt'), upstreamRefs);
  report.sources.push({ ...source, localHead: head, statusSha256: sha(status), remote, upstreamRefs: upstreamRefs.trim().split('\n'), dirtyCopied: entries.filter(x => x.sha256).length, dirtySkipped: entries.filter(x => x.skipped).length });
  console.log(`${source.id}: bundle verified; upstream mirror saved; ${entries.filter(x => x.sha256).length} dirty files preserved`);
}
report.limitations.push('Ignored files and secrets are not copied. Sources remain untouched.', 'Bundles/mirrors contain historical data and are LOCAL ONLY pending secret/license review.', 'Collected projects, old backups, .tools, node_modules are excluded from enumeration; no claim of a full disk backup.', 'Other skipped dirty paths are listed individually.');
writeNew(path.join(root, 'snapshot.json'), JSON.stringify(report, null, 2));
console.log('SNAPSHOT_COMPLETE ' + root);
