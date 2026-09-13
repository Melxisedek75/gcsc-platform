function validateLocalTestDatabase(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('A local test PostgreSQL URL is required'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['127.0.0.1', '[::1]'].includes(url.hostname) ||
      !/^\/gcsc_test_[a-z0-9_]+$/.test(url.pathname) ||
      url.search || url.hash) {
    throw new Error('Only a loopback PostgreSQL database named gcsc_test_* without URL options is allowed');
  }
  return value;
}
module.exports = { validateLocalTestDatabase };
