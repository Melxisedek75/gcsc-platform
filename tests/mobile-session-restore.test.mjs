import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { shouldClearAppSession } from '../packages/wallet-proof/session-restore.mjs';

test('only a confirmed profile authorization failure clears a saved app session', () => {
  for (const status of [401, 403, 404]) {
    assert.equal(shouldClearAppSession({ status }), true);
  }
  for (const error of [new Error('offline'), { status: 500 }, { status: 429 }, null]) {
    assert.equal(shouldClearAppSession(error), false);
  }
});

test('mobile hydration uses the authorization classifier before clearing storage', () => {
  const layout = fs.readFileSync(new URL('../apps/mobile/app/_layout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /if \(shouldClearAppSession\(error\)\) await clearSession\(\);\s*else retryNeeded = true;/);
  assert.match(layout, /setState\(retryNeeded \? 'retry' : 'ready'\)/);
  assert.match(layout, /setRetryKey\(value => value \+ 1\)/);
});
