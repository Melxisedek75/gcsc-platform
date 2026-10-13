const fs = require('fs');
const path = require('path');
const exists = fs.existsSync;
jest.spyOn(fs, 'existsSync').mockImplementation(file =>
  path.basename(String(file)) === 'gcsc.db' ? false : exists(file));
const server = require('../pure-server');
let base;

beforeAll(done => {
  server.db.users.push({ id: 901, role: 'homeowner', is_active: true, profile: {} });
  server.listen(0, '127.0.0.1', () => {
    base = `http://127.0.0.1:${server.address().port}`;
    done();
  });
});
afterAll(done => { server.close(() => { jest.restoreAllMocks(); done(); }); });

test.each([
  ['GET', '/api/chat/threads'], ['POST', '/api/chat/threads'],
  ['GET', '/api/chat/threads/1/messages'], ['POST', '/api/chat/threads/1/messages'],
])('JSON/demo mode fails closed for %s %s instead of claiming delivery', async (method, route) => {
  const result = await fetch(base + route, { method, headers: {
    Authorization: `Bearer ${server.jwtSign({ userId: 901, role: 'homeowner' })}`,
  }, signal: AbortSignal.timeout(5000) });
  expect(result.status).toBe(503);
  expect(result.headers.get('cache-control')).toBe('no-store');
  expect(await result.json()).toEqual({ error: 'Chat requires PostgreSQL storage' });
});
