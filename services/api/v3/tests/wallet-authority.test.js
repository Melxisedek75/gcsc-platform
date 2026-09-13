const fs = require('fs');
const path = require('path');
const { Numeric } = require('@proton/js');

// No database access or external RPC: exercise the real checker with RPC fixtures.
const exists = fs.existsSync;
const write = fs.writeFileSync;
jest.spyOn(fs, 'existsSync').mockImplementation(file =>
  path.basename(String(file)) === 'gcsc.db' ? false : exists(file));
jest.spyOn(fs, 'writeFileSync').mockImplementation((file, ...args) => {
  if (path.basename(String(file)) !== 'gcsc.db') return write(file, ...args);
});
const fetchMock = jest.spyOn(global, 'fetch')
  .mockRejectedValue(new Error('Unexpected fixture RPC request'));
const { _hooks } = require('../pure-server');
const originalUrls = process.env.XPR_TESTNET_HYPERION_URLS;
process.env.XPR_TESTNET_HYPERION_URLS = 'http://127.0.0.1:9';

// Public documentation fixtures only; no private keys or signing operations.
const legacyKey = 'EOS6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeABhJRin';
const publicKey = Numeric.publicKeyToString(Numeric.stringToPublicKey(legacyKey));
const otherKey = 'EOS6LPN8xGye86wme4PwqN8TSxAfGTQvqBcN5jGnURJPHyqnXqNAR';
const identity = { accountName: 'fixture11111', permission: 'active', publicKey };

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockRejectedValue(new Error('Unexpected fixture RPC request'));
});
afterAll(() => {
  if (originalUrls === undefined) delete process.env.XPR_TESTNET_HYPERION_URLS;
  else process.env.XPR_TESTNET_HYPERION_URLS = originalUrls;
  jest.restoreAllMocks();
});

function authority(threshold = 1, weight = 1) {
  return { threshold, keys: [{ key: publicKey, weight }], accounts: [], waits: [] };
}

function lookup(requiredAuth, extraPermissions = []) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({
    account_name: identity.accountName,
    permissions: [
      { perm_name: identity.permission, required_auth: requiredAuth },
      ...extraPermissions,
    ],
  }) });
  return _hooks.verifyAccountKey(identity);
}

test.each([[1, 1], [2, 2], [2, 3], [65535, 65535]])(
  'accepts direct key meeting threshold %i with weight %i', async (threshold, weight) => {
    expect(await lookup(authority(threshold, weight))).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:9/v1/chain/get_account',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ account_name: identity.accountName }) }));
  });

test('rejects one key of a two-key threshold authority', async () => {
  const auth = authority(2, 1);
  auth.keys.push({ key: otherKey, weight: 1 });
  expect(await lookup(auth)).toEqual({ ok: false, error: 'account_key_unauthorized' });
});

test.each(['accounts', 'waits'])('does not credit unproven %s weight', async factor => {
  const auth = authority(2, 1);
  auth[factor] = factor === 'accounts'
    ? [{ permission: { actor: 'another11111', permission: 'active' }, weight: 1 }]
    : [{ wait_sec: 1, weight: 1 }];
  expect(await lookup(auth)).toEqual({ ok: false, error: 'account_key_unauthorized' });
});

test('does not sum duplicate representations of the same signed key', async () => {
  const auth = authority(2, 1);
  auth.keys.push({ key: legacyKey, weight: 1 });
  expect(await lookup(auth)).toEqual({ ok: false, error: 'account_key_unauthorized' });
});

test.each([undefined, null, 0, -1, 1.5, '1', true, NaN, Infinity, 4294967296])(
  'rejects invalid authority threshold %p', async threshold => {
    const auth = authority();
    auth.threshold = threshold;
    expect(await lookup(auth)).toEqual({ ok: false, error: 'account_key_unauthorized' });
  });

test.each([undefined, null, 0, -1, 1.5, '1', true, NaN, Infinity, 65536])(
  'rejects invalid key weight %p', async weight => {
    const auth = authority();
    auth.keys[0].weight = weight;
    expect(await lookup(auth)).toEqual({ ok: false, error: 'account_key_unauthorized' });
  });

test('accepts a legacy EOS key matching the recovered PUB_K1 key', async () => {
  const auth = authority();
  auth.keys[0].key = legacyKey;
  expect(await lookup(auth)).toEqual({ ok: true });
});

test.each([otherKey, 'malformed-public-key'])('rejects unrelated or invalid key %s', async key => {
  const auth = authority();
  auth.keys[0].key = key;
  expect(await lookup(auth)).toEqual({ ok: false, error: 'account_key_unauthorized' });
});

test('does not substitute owner authority for the requested direct-key check', async () => {
  const owner = { perm_name: 'owner', required_auth: authority() };
  expect(await lookup(authority(2, 1), [owner]))
    .toEqual({ ok: false, error: 'account_key_unauthorized' });
});

test.each([undefined, null, {}, { threshold: 1 }, { threshold: 1, keys: [] }])(
  'rejects missing direct-key authority %p', async auth => {
    expect(await lookup(auth)).toEqual({ ok: false, error: 'account_key_unauthorized' });
  });

test('failed lookup never grants authority', async () => {
  expect(await _hooks.verifyAccountKey(identity)).toMatchObject({ ok: false, error: 'account_lookup_failed' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
