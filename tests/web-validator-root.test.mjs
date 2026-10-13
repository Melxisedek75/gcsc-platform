import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const appRoot = fileURLToPath(new URL('../apps/web/', import.meta.url));
const script = fileURLToPath(new URL('../apps/web/scripts/validate-webauth-integration.mjs', import.meta.url));

test('WebAuth static validator resolves the same sources from repository and app roots', () => {
  for (const cwd of [root, appRoot]) {
    const result = spawnSync(process.execPath, [script], {
      cwd, encoding: 'utf8', windowsHide: true, timeout: 10000,
    });
    assert.equal(result.status, 0, `${cwd}: ${result.error?.message || result.stderr}`);
    assert.match(result.stdout, /webauth integration validation passed/);
  }
});
