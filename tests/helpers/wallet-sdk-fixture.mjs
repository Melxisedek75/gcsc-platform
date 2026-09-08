import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import dgram from 'node:dgram';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

export const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
export const sha = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');

export function blockNetwork(mock) {
  const deny = () => { throw new Error('Network forbidden in wallet SDK characterization'); };
  mock.method(globalThis, 'fetch', deny);
  mock.method(net.Socket.prototype, 'connect', deny);
  mock.method(dgram, 'createSocket', deny);
}

export async function loadPinnedCodecs(root) {
  const sdkRoot = path.resolve(process.env.GCSC_WALLET_SDK_ROOT || root);
  const codecs = new Map();
  for (const app of ['web', 'mobile']) {
    const appRoot = path.join(sdkRoot, 'apps', app);
    const lockPath = path.join(appRoot, 'package-lock.json');
    assert.equal(sha(lockPath), sha(path.join(root, 'apps', app, 'package-lock.json')),
      `${app}: dependency source must match this checkout's lockfile`);
    const lock = readJson(lockPath);
    const linkPath = path.join(appRoot, 'node_modules/@proton/link/package.json');
    const requireFromLink = createRequire(linkPath);
    const codecPath = requireFromLink.resolve('@proton/signing-request/package.json');
    const pkg = readJson(codecPath);
    const relativePackage = path.relative(appRoot, path.dirname(codecPath)).replaceAll('\\', '/');
    assert.equal(pkg.version, lock.packages[relativePackage]?.version,
      `${app}: installed codec version must match lockfile`);
    const modulePath = path.join(path.dirname(codecPath), pkg.module);
    codecs.set(app, {
      sdk: await import(pathToFileURL(modulePath).href),
      pkg, modulePath, appRoot, lock, requireFromLink,
    });
  }
  return codecs;
}
