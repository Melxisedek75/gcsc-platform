const fs = require('fs');
const path = require('path');

const exists = fs.existsSync;
const write = fs.writeFileSync;
jest.spyOn(fs, 'existsSync').mockImplementation(file => {
  if (path.basename(String(file)) === 'gcsc.db') throw new Error('Test mode must not read gcsc.db');
  return exists(file);
});
jest.spyOn(fs, 'writeFileSync').mockImplementation((file, ...args) => {
  if (path.basename(String(file)) === 'gcsc.db') throw new Error('Test mode must not write gcsc.db');
  return write(file, ...args);
});

const server = require('../pure-server');

afterAll(() => jest.restoreAllMocks());

test('test mode uses only in-memory JSON storage', async () => {
  const { db, _hooks, reconcilePendingPayments } = server;
  const originalVerifier = _hooks.verifyHyperionTransfer;
  db.payment_receipts.push({
    id: 1, tx_hash: 'f'.repeat(64), kind: 'lead-token', user_id: 1,
    from_account: 'fixture11111', amount: '50.0000 XPR',
    verification_status: 'pending', created_at: new Date().toISOString(),
  });
  _hooks.verifyHyperionTransfer = async () => ({ ok: false, error: 'bad_amount' });
  try {
    await reconcilePendingPayments();
    expect(db.payment_receipts[0].verification_status).toBe('rejected');
  } finally {
    _hooks.verifyHyperionTransfer = originalVerifier;
  }
});
