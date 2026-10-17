const fs = require('fs');
const http = require('http');
const https = require('https');
const net = require('net');
const originalEnv = { ...process.env };
const originalFetch = global.fetch;
const stale = { executed: false, actions: [], lib: 1000, last_indexed_block: 1 };
const found = { executed: true, actions: [{ act: { account: 'gcscrow1111', name: 'submitms' } }] };
const absent = { executed: false, actions: [], lib: 1000, last_indexed_block: 1000 };
function row(status = 'broadcast', id = 1) {
  return { id, tx_id: String(id).padStart(64, '0'), status,
    milestone_id: 1, escrow_id: 1, action: 'submitms', contract_account: 'gcscrow1111',
    created_at: new Date(id * 1000).toISOString() };
}

// Actual module/SQL boundary; no DB. Apply the SELECT's status predicate so the
// fixture cannot silently supply pending rows that the production query omitted.
function postgresFixture(rows) {
  return jest.fn(async (sql, params) => {
    if (sql.startsWith('SELECT * FROM milestone_chain_txs WHERE status ')) {
      const [, predicate, ordering] = sql.match(/WHERE status (.+) ORDER BY (.+) LIMIT \$1$/) || [];
      if (!['created_at ASC', 'COALESCE(verified_at, created_at) ASC, created_at ASC, id ASC'].includes(ordering)) {
        throw new Error(`Unexpected queue ordering: ${sql}`);
      }
      const statuses = [...(predicate || '').matchAll(/'([^']+)'/g)].map(match => match[1]);
      if (!predicate || !/^(= '[^']+'|IN \('[^']+'(?:, '[^']+')*\))$/.test(predicate)) {
        throw new Error(`Unexpected queue predicate: ${sql}`);
      }
      return { rows: rows.filter(tx => statuses.includes(tx.status))
        .sort((a, b) => (ordering === 'created_at ASC'
          ? new Date(a.created_at) - new Date(b.created_at)
          : new Date(a.verified_at || a.created_at) - new Date(b.verified_at || b.created_at)
            || new Date(a.created_at) - new Date(b.created_at) || a.id - b.id)).slice(0, params[0])
        .map(tx => ({ ...tx })) };
    }
    if (sql.startsWith('UPDATE milestone_chain_txs SET status = $1')) {
      expect(sql).toContain('verified_at = NOW()');
      const tx = rows.find(item => item.tx_id === params[2]);
      Object.assign(tx, { status: params[0], verification_error: params[1], verified_at: new Date().toISOString() });
      return { rows: [{ ...tx }] };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });
}

beforeEach(() => {
  jest.resetModules();
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'confirmation-retry-fixture-secret-at-least-32';
  process.env.XPR_TESTNET_HYPERION_URLS = 'https://hyperion.fixture.invalid';
  delete process.env.DATABASE_URL;
  jest.spyOn(fs, 'writeFileSync').mockImplementation(() => { throw new Error('File writes forbidden'); });
  for (const target of [http, https]) {
    for (const method of ['request', 'get']) {
      jest.spyOn(target, method).mockImplementation(() => { throw new Error('Network IO forbidden'); });
    }
  }
  jest.spyOn(net.Socket.prototype, 'connect').mockImplementation(() => { throw new Error('Socket IO forbidden'); });
});
afterEach(() => {
  try {
    // Inspect even the intentionally failing/stale fetch calls: every request
    // must remain a transaction lookup, never an RPC broadcast or payment call.
    for (const [url, options] of global.fetch.mock.calls) {
      expect(url).toMatch(/^https:\/\/hyperion\.fixture\.invalid\/v2\/history\/get_transaction\?id=[0-9]{64}$/);
      expect(Object.keys(options)).toEqual(['signal']);
    }
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(net.Socket.prototype.connect).not.toHaveBeenCalled();
    for (const target of [http, https]) {
      expect(target.request).not.toHaveBeenCalled();
      expect(target.get).not.toHaveBeenCalled();
    }
  } finally {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  }
});
function setup(storage, rows) {
  const query = postgresFixture(rows);
  jest.doMock('pg', () => ({ Pool: jest.fn(() => ({ query })) }));
  if (storage === 'postgres') process.env.DATABASE_URL = 'postgres://fixture.invalid/never-connect';
  const server = require('../pure-server');
  if (storage === 'json') server.db.milestone_chain_txs.push(...rows);
  global.fetch = jest.fn(async (url, options) => {
    expect(url).toMatch(/^https:\/\/hyperion\.fixture\.invalid\/v2\/history\/get_transaction\?id=/);
    expect(Object.keys(options)).toEqual(['signal']); // lookup only, no broadcast body/method
    return { ok: true, status: 200, json: async () => found };
  });
  return { server, query };
}
describe.each(['json', 'postgres'])('%s chain confirmation queue', storage => {
  test.each(['stale', 'unreachable'])('retries %s observation next sweep and leaves confirmed terminal', async failure => {
    const rows = [row(), row('confirmed', 2), row('failed', 3)];
    const { server, query } = setup(storage, rows);
    global.fetch.mockImplementationOnce(async () => {
      if (failure === 'unreachable') throw new Error('fixture unreachable');
      return { ok: true, status: 200, json: async () => stale };
    });
    await server.verifyBroadcastChainTxs();
    expect(rows[0].status).toBe('pending');
    expect(rows[0].verification_error).toBe(failure === 'stale' ? 'node_stale' : 'fixture unreachable');
    await server.verifyBroadcastChainTxs();
    expect(rows[0].status).toBe('confirmed');
    expect(rows[0].verification_error).toBeNull();
    const snapshot = JSON.stringify(rows);
    await server.verifyBroadcastChainTxs();
    await server.verifyBroadcastChainTxs();
    expect(JSON.stringify(rows)).toBe(snapshot);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    if (storage === 'postgres') {
      const selects = query.mock.calls.filter(([sql]) => sql.startsWith('SELECT'));
      expect(selects).toHaveLength(4);
      for (const [sql, params] of selects) {
        expect(sql).toBe("SELECT * FROM milestone_chain_txs WHERE status IN ('broadcast', 'pending') ORDER BY COALESCE(verified_at, created_at) ASC, created_at ASC, id ASC LIMIT $1");
        expect(params).toEqual([10]);
      }
      expect(query.mock.calls.filter(([sql]) => sql.startsWith('UPDATE'))).toHaveLength(2);
    }
  });
  test.each(['missing action', 'authoritative absence'])('%s becomes failed and stays terminal', async failure => {
    const rows = [row('pending')];
    const { server } = setup(storage, rows);
    global.fetch.mockImplementationOnce(async () => ({ ok: true, status: 200, json: async () =>
      failure === 'authoritative absence' ? absent : { actions: [{ act: { account: 'other', name: 'submitms' } }] } }));
    await server.verifyBroadcastChainTxs();
    expect(rows[0].status).toBe('failed');
    const snapshot = JSON.stringify(rows);
    await server.verifyBroadcastChainTxs();
    await server.verifyBroadcastChainTxs();
    expect(JSON.stringify(rows)).toBe(snapshot);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  test('rotates ten stale pending rows so sweep two reaches row eleven after restart', async () => {
    let rows = Array.from({ length: 11 }, (_, i) => row(i < 10 ? 'pending' : 'broadcast', i + 1));
    let { server } = setup(storage, rows);
    const observe = async url => ({ ok: true, status: 200, json: async () =>
      url.endsWith(rows[10].tx_id) ? found : stale });
    global.fetch.mockImplementation(observe);
    await server.verifyBroadcastChainTxs();
    expect(global.fetch).toHaveBeenCalledTimes(10);
    expect(rows.slice(0, 10).every(tx => tx.status === 'pending' && tx.verified_at)).toBe(true);
    expect(rows[10].status).toBe('broadcast');
    // Recreate the module from serialized storage: rotation must survive process
    // memory loss, using the attempt timestamps stored by the actual updater.
    rows = JSON.parse(JSON.stringify(rows));
    jest.resetModules();
    ({ server } = setup(storage, rows));
    global.fetch.mockImplementation(observe);
    await server.verifyBroadcastChainTxs();
    expect(global.fetch.mock.calls[0][0]).toContain(rows[10].tx_id);
    expect(global.fetch).toHaveBeenCalledTimes(10);
    expect(rows[10].status).toBe('confirmed');
    expect(rows.slice(0, 10).every(tx => tx.status === 'pending')).toBe(true);
  });

  test('preserves oldest-first ten-row bound and excludes terminal rows', async () => {
    const rows = [row('confirmed', 20), row('failed', 21),
      ...Array.from({ length: 12 }, (_, i) => row(i % 2 ? 'pending' : 'broadcast', i + 1)).reverse()];
    const { server } = setup(storage, rows);
    await server.verifyBroadcastChainTxs();
    expect(global.fetch.mock.calls.map(([url]) => url.split('id=')[1])).toEqual(
      Array.from({ length: 10 }, (_, i) => row('broadcast', i + 1).tx_id));
    expect(rows.find(tx => tx.id === 11).status).toBe('broadcast');
    expect(rows.find(tx => tx.id === 12).status).toBe('pending');
  });
});
