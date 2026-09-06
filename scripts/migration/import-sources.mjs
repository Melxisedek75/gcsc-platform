import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const target = 'C:/gcsc-platform';
const backup = 'C:/gcsc-migration-20260906-final';
function git(cwd, args, input) {
  const r = spawnSync('git', args, { cwd, input, maxBuffer: 256 * 1024 * 1024, windowsHide: true });
  if (r.status !== 0) throw new Error(`git ${args[0]} failed: ${r.stderr.toString().slice(-1500)}`);
  return r.stdout;
}
const wpPaths = new Set([
  'docs/whitepaper-v1-4-renovation-financing-draft.md',
  'docs/whitepaper-v1-4-renovation-financing-changelog.md',
  'docs/superpowers/plans/2026-09-05-whitepaper-v14-renovation-financing.md',
  'docs/superpowers/specs/2026-09-05-renovation-financing-v14-design.md',
]);
const sources = [
  { id: 'website', cwd: `${backup}/website/upstream.git`, commit: 'b55217ec9c177a732a726ba3c193956036c39aa1' },
  { id: 'backend', cwd: `${backup}/backend/upstream.git`, commit: 'f793bfb0cd19562c908a31ec4e1469ea56d849b7' },
  { id: 'store', cwd: `${backup}/store/upstream.git`, commit: '2f023068cb7b5a08a481f7fb0a503d3a5f0f6248' },
  { id: 'whitepaper-v14', cwd: 'C:/gcsc', commit: '1300761b26576a8513c5808af119b2e138e04b97' },
];
function mapFile(id, p) {
  if (/(^|\/)(node_modules|dist|build|\.expo|\.gradle)(\/|$)|\.(apk|aab|keystore|jks|pem|p12)$/.test(p)) return null;
  if (/(^|\/)\.env/.test(p) && !/\.(example|template)$/.test(p)) return null;
  if (id === 'whitepaper-v14') return wpPaths.has(p) ? `docs/whitepaper/${path.posix.basename(p)}` : null;
  if (id === 'website') {
    if (p.startsWith('mobile/smartcontractor/')) return p.replace('mobile/smartcontractor/', 'apps/mobile/');
    if (p.startsWith('contracts/') && !p.includes('/graphify-out/')) return p;
    if (['index.html', 'whitepaper.html', 'whitepaper.css', 'CNAME'].includes(p)) return `apps/marketing/${p}`;
    if (p.startsWith('construction-ai/src/smart-contracts/')) return p.replace('construction-ai/src/smart-contracts/', 'packages/domain-simulation/src/');
    if (p === 'LICENSE') return 'docs/licenses/gcsc-website-LICENSE';
    return null;
  }
  if (id === 'store') {
    if (p.startsWith('mcp-server/')) return p.replace('mcp-server/', 'tools/mcp-server/');
    if (/^(src|public|scripts)\//.test(p) || /^(package(-lock)?\.json|index\.html|vite\.config\.ts|tsconfig.*\.json|eslint\.config\.js|postcss\.config\.js|tailwind\.config\.js|components\.json|\.gitignore|README\.md)$/.test(p)) return `apps/web/${p}`;
    if (['railway.json', 'render.yaml'].includes(p)) return `docs/migration/source-configs/store/${p}`;
    return null;
  }
  if (id === 'backend') {
    if (/^v3\/(routes|middleware|public)\//.test(p) || ['v3/server.js', 'v3/database/db.js', 'v3/Dockerfile', 'v3/render.yaml', 'v3/services/settlement.js', 'v3/websocket.js', 'v3/email-templates.js', 'v3/stripe-config.js'].includes(p)) return null;
    if (p.startsWith('v3/')) return `services/api/${p}`;
    if (/^[^/]+\.md$/.test(p) && !/^(AGENTS|CLAUDE|GEMINI)\.md$/.test(p)) return `services/api/${p}`;
    if (p.startsWith('docs/') || p.startsWith('evidence/') || p.startsWith('.github/workflows/')) return `services/api/${p}`;
    if (['Dockerfile', 'railway.json', 'render.yaml'].includes(p)) return `docs/migration/source-configs/backend/${p}`;
  }
  return null;
}
const manifest = { version: 1, importedAt: new Date().toISOString(), sourceCount: 3, mode: 'LOCAL_CANDIDATE_NOT_RELEASED', sources: [], files: [], excluded: [] };
const seen = new Set();
for (const source of sources) {
  const actual = git(source.cwd, ['rev-parse', source.commit]).toString().trim();
  if (actual !== source.commit) throw new Error('Source commit mismatch');
  if (source.id !== 'whitepaper-v14') {
    git(target, ['fetch', '--no-tags', source.cwd, `refs/heads/*:refs/heads/archive/${source.id}/*`, `refs/tags/*:refs/tags/archive/${source.id}/*`]);
  } else {
    git(target, ['fetch', '--no-tags', source.cwd, `${source.commit}:refs/heads/archive/website/internal-whitepaper-v14`]);
  }
  const entries = git(source.cwd, ['ls-tree', '-rz', '--full-tree', source.commit]).toString().split('\0').filter(Boolean).map(line => {
    const tab = line.indexOf('\t');
    const [mode, type, blob] = line.slice(0, tab).split(' ');
    return { mode, type, blob, path: line.slice(tab + 1) };
  });
  const selected = [];
  for (const entry of entries) {
    const to = mapFile(source.id, entry.path);
    if (!to || !['100644', '100755'].includes(entry.mode)) {
      if (source.id !== 'whitepaper-v14') manifest.excluded.push({ source: source.id, path: entry.path, blob: entry.blob, reason: !to ? 'outside selected active component; retained in source history' : 'non-regular file requires review' });
      continue;
    }
    if (seen.has(to) || path.isAbsolute(to) || to.split('/').includes('..') || to.includes('\\')) throw new Error(`Invalid/colliding mapping ${to}`);
    seen.add(to);
    selected.push({ ...entry, to });
  }
  const packed = git(source.cwd, ['cat-file', '--batch'], selected.map(e => e.blob).join('\n') + '\n');
  let offset = 0;
  for (const entry of selected) {
    const nl = packed.indexOf(10, offset);
    const [blob, type, sizeText] = packed.subarray(offset, nl).toString().split(' ');
    const size = Number(sizeText);
    if (blob !== entry.blob || type !== 'blob' || !Number.isSafeInteger(size)) throw new Error('Malformed git batch output');
    const bytes = packed.subarray(nl + 1, nl + 1 + size);
    const check = createHash('sha1').update(Buffer.from(`blob ${size}\0`)).update(bytes).digest('hex');
    if (check !== blob) throw new Error(`Blob integrity failed: ${entry.path}`);
    const file = path.join(target, entry.to);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes, { flag: 'wx' });
    manifest.files.push({ source: source.id, commit: source.commit, originalPath: entry.path, path: entry.to, blob, mode: entry.mode, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: size });
    offset = nl + 1 + size + 1;
  }
  manifest.sources.push({ id: source.id, commit: source.commit, files: selected.length });
  console.log(`${source.id}: ${selected.length} source files imported and hash-verified`);
}
const candidate = 'C:/gcsc/.tmp/codex/mobile-lead-payment-backend-contract';
const candidateHead = git(candidate, ['rev-parse', 'HEAD']).toString().trim();
git(candidate, ['bundle', 'create', `${backup}/backend/wallet-candidate-all-refs.bundle`, '--all']);
git(candidate, ['bundle', 'verify', `${backup}/backend/wallet-candidate-all-refs.bundle`]);
git(target, ['fetch', '--no-tags', candidate, `${candidateHead}:refs/heads/archive/candidates/backend-wallet`]);
git(target, ['fetch', '--no-tags', 'C:/gcsc', '3bd60239997fb7b3daf32395974d7d8af932813e:refs/heads/archive/candidates/mobile-wallet']);
fs.writeFileSync(path.join(target, 'docs/migration/import-manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
console.log(`IMPORT_COMPLETE ${manifest.files.length} files; ${manifest.excluded.length} historical exclusions; unreviewed wallet candidates retained as refs only`);
