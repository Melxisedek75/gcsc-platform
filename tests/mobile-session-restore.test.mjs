import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
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
  assert.match(layout, /finally \{\s*clearTimeout\(failsafe\);\s*if \(!cancelled\) setState\(retryNeeded \? 'retry' : 'ready'\)/);
  assert.match(layout, /setRetryKey\(value => value \+ 1\)/);
});

for (const wallet of [{ account: 'fixture' }, null]) test(`profile restoration keeps email access with wallet ${wallet ? 'bound' : 'skipped'}`, async () => {
  const source = fs.readFileSync(new URL('../apps/mobile/app/_layout.tsx', import.meta.url), 'utf8');
  const file = ts.createSourceFile('_layout.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect') effect = node.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(effect && ts.isArrowFunction(effect));

  const timers = [];
  const states = [];
  const routes = [];
  const context = vm.createContext({
    process: { env: { EXPO_PUBLIC_WALLET_PROBE: '0' } },
    Linking: { getInitialURL: async () => null },
    isWalletProbeLink: () => false,
    initI18n: async () => undefined,
    loadSession: async () => ({ token: 'fixture-token' }),
    fetchProfile: async () => ({ role: 'contractor', wallet }),
    loadWebauthSession: async () => wallet ? { account: 'fixture' } : null,
    hasCompletedOnboarding: async () => true,
    primeSessionFromBackend: async () => undefined,
    clearSession: async () => { throw new Error('must keep app session'); },
    shouldClearAppSession,
    router: { replace: route => routes.push(route) },
    setState: state => states.push(state),
    setTimeout: callback => {
      const timer = { callback, active: true };
      timers.push(timer);
      return timer;
    },
    clearTimeout: timer => { timer.active = false; },
  });
  const code = ts.transpileModule(`(${effect.getText(file)})()`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const cleanup = vm.runInContext(code, context);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(routes, ['/(contractor)/jobs']);
  assert.equal(states.at(-1), 'ready');
  assert.equal(timers[0].active, false);
  cleanup();
});
