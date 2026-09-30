import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const pages = ['index.html', 'whitepaper.html'];

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  for (const [, target] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    if (/^[a-z][a-z\d+.-]*:/i.test(target)) continue;
    const [relativeFile, fragment] = target.split('#');
    const resolved = path.resolve(root, relativeFile || page);
    const withinRoot = path.relative(root, resolved);
    assert(!withinRoot.startsWith('..') && !path.isAbsolute(withinRoot), `${page}: link escapes site root: ${target}`);
    assert(fs.existsSync(resolved), `${page}: missing local target: ${target}`);
    if (fragment) {
      const content = relativeFile ? fs.readFileSync(resolved, 'utf8') : html;
      const ids = new Set([...content.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
      assert(ids.has(fragment), `${page}: missing anchor: ${target}`);
    }
  }
}

const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appUrls = [...home.matchAll(/href="(https:\/\/gcsc\.store\/#\/dashboard(?:\?role=(homeowner|contractor))?)"/g)];
assert(appUrls.some(([, , role]) => !role), 'Missing general account-access CTA');
assert.deepEqual(
  new Set(appUrls.map(([, , role]) => role).filter(Boolean)),
  new Set(['homeowner', 'contractor']),
  'Missing owner or contractor account-access CTA',
);
for (const [, rawUrl, role] of appUrls) {
  const url = new URL(rawUrl);
  assert.equal(url.hash, `#/dashboard${role ? `?role=${role}` : ''}`);
}

const draft = fs.readFileSync(path.join(root, 'whitepaper.html'), 'utf8');
const robots = draft.match(/<meta name="robots" content="([^"]+)"/i);
assert(robots, 'Historical draft must have a robots meta tag');
assert(robots[1].split(',').map((value) => value.trim()).includes('noindex'), 'Historical draft must be noindex');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]), ['https://xprnet.org/']);

console.log(`Marketing static checks PASS: ${pages.length} pages, ${appUrls.length} account CTAs`);
