import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createWalletBinding } from '../packages/wallet-proof/binding-client.mjs';

function load(file, stubs) {
  const code = ts.transpileModule(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, AbortController, Error, require: name => {
    if (!(name in stubs)) throw new Error('Unexpected dependency ' + name);
    return stubs[name];
  } });
  return exports;
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const result = find(child, predicate);
    if (result) return result;
  }
  return null;
}
for (const leave of ['skip', 'unmount']) for (const stage of ['connect', 'challenge', 'sign', 'verify']) {
  test(`mobile screen ${leave} during ${stage} cancels subsequent work and session save`, async () => {
    let release, reached;
    const entered = new Promise(resolve => { reached = resolve; });
    const gate = new Promise(resolve => { release = resolve; });
    const calls = [];
    const user = { id: 12, role: 'contractor', wallet: { verified: true } };
    const step = async (name, result) => { calls.push(name); if (name === stage) { reached(); await gate; } return result; };
    const api = { getToken: () => 'original', getCurrentUser: () => user, normalizeUser: x => x,
      saveSession: async () => { calls.push('save'); }, apiRequest: path => path.endsWith('/challenge')
        ? step('challenge', {}) : step('verify', { user }) };
    const auth = load('apps/mobile/lib/auth.ts', { './api': api,
      './webauth': { connectWallet: () => step('connect', { account: 'alice', permission: 'active' }),
        signWalletOwnershipChallenge: () => step('sign', {}) },
      '../../../packages/wallet-proof/login-client.mjs': { createWalletFirstLogin: () => () => {} },
      '../../../packages/wallet-proof/binding-client.mjs': { createWalletBinding } });
    const cleanups = [];
    const jsx = (type, props) => ({ type, props });
    const screen = load('apps/mobile/app/(auth)/connect-wallet.tsx', {
      'expo-router': { useRouter: () => ({ replace: target => calls.push('route:' + target) }) },
      react: { useState: value => [value, () => {}], useRef: value => ({ current: value }),
        useEffect: effect => { cleanups.push(effect()); } },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      'react-native': { StyleSheet: { create: x => x }, Text: 'Text', View: 'View' },
      '../../components/Button': { Button: 'Button' }, '../../components/Header': { Header: 'Header' },
      '../../components/Screen': { Screen: 'Screen' }, '../../lib/api': api, '../../lib/auth': auth,
      '../../lib/tokens': { colors: {}, spacing: {}, typography: {} },
    }).default();
    const operation = find(screen, node => node.type === 'Button').props.onPress();
    await entered;
    if (leave === 'skip') find(screen, node => node.type === 'Text' && node.props.onPress).props.onPress();
    else for (const cleanup of cleanups) cleanup?.();
    release();
    await operation;
    assert.equal(calls.includes('save'), false);
    const stages = ['connect', 'challenge', 'sign', 'verify'];
    assert.deepEqual(calls.filter(x => stages.includes(x)), stages.slice(0, stages.indexOf(stage) + 1));
    assert.equal(calls.filter(x => x.startsWith('route:')).length, leave === 'skip' ? 1 : 0);
  });
}
