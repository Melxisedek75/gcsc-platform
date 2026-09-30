const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const samePath = (left, right) => path.relative(left, right) === '';
const layouts = { api: 'services/api/v3', web: 'apps/web' };

function localAbsolute(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || /^[\\/]{2}/.test(value)
    || (process.platform === 'win32' && !/^[a-z]:[\\/]/i.test(value))) {
    throw new Error('Source root must be an absolute local filesystem path, not UNC/device/URL');
  }
  return path.resolve(value);
}

function canonicalEntry(root, relative, type) {
  assert.ok(samePath(fs.realpathSync(root), root), 'Source root changed canonical location');
  const target = path.resolve(root, relative);
  const relativePath = path.relative(root, target);
  const parts = relativePath.split(path.sep);
  assert.ok(relativePath && !path.isAbsolute(relativePath) && parts.every(part => part && part !== '..'),
    'Source entry must stay inside its selected root');
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    assert.ok(!fs.lstatSync(current).isSymbolicLink(), `Source links are not allowed: ${current}`);
  }
  const canonical = fs.realpathSync(target);
  assert.ok(samePath(canonical, target), 'Source entry escaped canonical root');
  assert.ok(type === 'directory' ? fs.statSync(target).isDirectory() : fs.statSync(target).isFile());
  return canonical;
}

function resolveSourceRoot(candidate, kind, workspaceRoot, worktreeRoots) {
  assert.ok(Object.hasOwn(layouts, kind));
  const selected = localAbsolute(candidate);
  const boundary = localAbsolute(workspaceRoot);
  const layout = layouts[kind];
  const checkout = path.resolve(selected, ...layout.split('/').map(() => '..'));
  // Reject unknown/outside paths before following any candidate filesystem links.
  assert.ok(samePath(path.join(checkout, layout), selected)
    && samePath(path.dirname(checkout), boundary)
    && worktreeRoots.some(item => samePath(localAbsolute(item), checkout)),
  'Source must be the standard component directory of a registered sibling worktree');
  return canonicalEntry(fs.realpathSync(boundary), path.relative(boundary, selected), 'directory');
}

function captureProjectSources(options, workspaceRoot, worktreeRoots) {
  const apiRoot = resolveSourceRoot(options.apiRoot, 'api', workspaceRoot, worktreeRoots);
  const apiFiles = ['pure-server.js', 'wallet-ownership-proof.cjs', 'wallet-challenge-store.cjs'];
  if (fs.lstatSync(path.join(apiRoot, 'database'), { throwIfNoEntry: false })) {
    const directory = canonicalEntry(apiRoot, 'database', 'directory');
    for (const name of fs.readdirSync(directory).filter(name => name.endsWith('.cjs')).sort()) {
      assert.match(name, /^[a-zA-Z0-9_-]+\.cjs$/, 'Only flat canonical database modules are supported');
      apiFiles.push(`database/${name}`);
    }
  }
  const files = (directory, names) => Object.fromEntries(names.map(name =>
    [name, digest(fs.readFileSync(canonicalEntry(directory, name, 'file')))]));
  const result = { version: 1, api: { root: apiRoot, explicit: !!options.apiExplicit,
    files: files(apiRoot, apiFiles) } };
  if (options.webRoot) {
    const webRoot = resolveSourceRoot(options.webRoot, 'web', workspaceRoot, worktreeRoots);
    result.web = { root: webRoot, explicit: !!options.webExplicit, files: files(webRoot,
      ['src/pages/dashboard/ProjectsPanel.tsx', 'src/services/api.ts']) };
  }
  return result;
}

function readProjectManifest(runDirectory, env = process.env) {
  const bytes = fs.readFileSync(path.join(runDirectory, 'project-sources.json'));
  assert.equal(digest(bytes), env.GCSC_PROJECT_MANIFEST_SHA256, 'Runner source manifest changed');
  const selected = JSON.parse(bytes);
  assert.equal(selected.version, 1);
  assert.equal(selected.api.root, env.GCSC_API_ROOT);
  assert.equal(path.join(selected.api.root, 'pure-server.js'), env.GCSC_API_SOURCE);
  assert.equal(selected.api.files['pure-server.js'], env.GCSC_API_SOURCE_SHA256);
  if (selected.web) assert.equal(selected.web.root, env.GCSC_WEB_ROOT);
  return selected;
}

function readSelectedFile(selection, name) {
  const file = canonicalEntry(selection.root, name, 'file');
  const bytes = fs.readFileSync(file);
  assert.equal(digest(bytes), selection.files[name], `Selected source changed: ${name}`);
  return bytes;
}

function copyApiSnapshot(selected, runDirectory) {
  const directory = path.join(runDirectory, 'api');
  const files = Object.entries(selected.api.files).map(([name, sha256]) => {
    assert.ok(['pure-server.js', 'wallet-ownership-proof.cjs', 'wallet-challenge-store.cjs'].includes(name)
      || /^database\/[a-zA-Z0-9_-]+\.cjs$/.test(name), 'Unexpected API snapshot file');
    return { name: name === 'pure-server.js' ? 'pure-server.cjs' : name,
      bytes: readSelectedFile(selected.api, name), sha256 };
  });
  fs.mkdirSync(directory);
  const copied = {};
  for (const file of files) {
    const target = path.join(directory, file.name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.bytes, { flag: 'wx' });
    copied[file.name] = digest(fs.readFileSync(target));
    assert.equal(copied[file.name], file.sha256);
  }
  fs.writeFileSync(path.join(runDirectory, 'api-files.sha256.json'), JSON.stringify(copied, null, 2) + '\n', { flag: 'wx' });
  fs.writeFileSync(path.join(runDirectory, 'api-source.sha256'), copied['pure-server.cjs'] + '\n', { flag: 'wx' });
  return path.join(directory, 'pure-server.cjs');
}

module.exports = { localAbsolute, resolveSourceRoot, captureProjectSources,
  readProjectManifest, readSelectedFile, copyApiSnapshot };
