import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { validateLocalTestDatabase: validate } = createRequire(import.meta.url)('../scripts/local-test-database.cjs');

test('accepts explicit loopback disposable database URLs', () => {
  for (const url of ['postgres://127.0.0.1:5432/gcsc_test_receipts', 'postgresql://[::1]/gcsc_test_123']) {
    assert.equal(validate(url), url);
  }
});
test('rejects remote, ambiguous and non-test database targets before cleanup', () => {
  for (const url of [undefined, '', 'postgres://example.com/gcsc_test_x',
    'postgres://127.0.0.1/production', 'postgres://localhost/gcsc_test_x',
    'postgres://127.0.0.1/gcsc_test_x?host=example.com',
    'postgres://127.0.0.1/gcsc_test_x#fragment', 'http://127.0.0.1/gcsc_test_x',
    'postgres://127.0.0.1/gcsc_test_%2fproduction']) {
    assert.throws(() => validate(url));
  }
});
