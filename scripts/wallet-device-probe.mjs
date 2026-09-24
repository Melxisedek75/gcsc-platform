import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { createOwnershipChallenge, verifyOwnershipProof } = require('../services/api/v3/wallet-ownership-proof.cjs');
const chainId = '71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd';
const audience = 'http://127.0.0.1:10001';
const contextFields = ['purpose', 'audience', 'chainId', 'accountName', 'permission', 'sessionBinding'];

// Disposable USB diagnostic listener, NOT an application API or authentication service.
export function createProbeServer({ now = Date.now, maxChallenges = 20, onEvent = () => {} } = {}) {
  const pending = new Map();
  let lastObservation = null;
  let lastResult = null;
  function event(value) { onEvent({ at: new Date(now()).toISOString(), ...value }); }
  function json(res, status, body) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', Connection: 'close' });
    res.end(JSON.stringify(body));
  }
  const server = http.createServer(async (req, res) => {
    try {
      if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
        || (req.headers.origin && req.headers.origin !== audience)) return json(res, 403, { code: 'probe_local_only' });
      if (req.method === 'GET' && req.url === '/probe/status') {
        return json(res, 200, { mode: 'diagnostic-only', chainId, authenticationGranted: false,
          broadcast: false, lastObservation, lastResult });
      }
      if (req.method !== 'POST' || !['/probe/challenge', '/probe/proof', '/probe/observation'].includes(req.url)) {
        return json(res, 404, { code: 'probe_route_not_found' });
      }
      if (req.headers['content-type']?.split(';')[0] !== 'application/json') return json(res, 415, { code: 'probe_json_required' });
      if (Number(req.headers['content-length']) > 24576) return json(res, 413, { code: 'probe_body_too_large' });
      let size = 0; const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 24576) return json(res, 413, { code: 'probe_body_too_large' });
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('probe_body_invalid');
      for (const [id, record] of pending) if (now() >= record.expiresAt) pending.delete(id);
      if (req.url === '/probe/challenge') {
        if (pending.size >= maxChallenges) return json(res, 429, { code: 'probe_challenge_limit' });
        const record = createOwnershipChallenge({ purpose: 'link', audience, chainId,
          accountName: body.accountName, permission: body.permission,
          sessionBinding: crypto.randomBytes(32).toString('hex') }, { now: now() });
        pending.set(record.challengeId, record);
        event({ stage: 'challenge_created', accountName: record.accountName, permission: record.permission });
        return json(res, 200, record);
      }
      if (req.url === '/probe/observation') {
        if (!['K1', 'R1', 'WA', 'unknown'].includes(body.signatureType)
          || !Number.isInteger(body.signatureCount) || body.signatureCount < 0 || body.signatureCount > 100
          || !Number.isInteger(body.serializedBytes) || body.serializedBytes < 0 || body.serializedBytes > 1000000
          || !['native-resolved', 'serialized', 'unknown'].includes(body.format)
          || typeof body.broadcastResult !== 'boolean') throw new Error('probe_observation_invalid');
        lastObservation = Object.fromEntries(['signatureType', 'signatureCount', 'serializedBytes', 'format', 'broadcastResult']
          .map(field => [field, body[field]]));
        event({ stage: 'wallet_response_shape', ...lastObservation });
        return json(res, 200, { recorded: true });
      }
      const record = pending.get(body.challengeId);
      if (!record) return json(res, 409, { code: 'wallet_proof_not_found' });
      pending.delete(body.challengeId);
      const context = Object.fromEntries(contextFields.map(field => [field, record[field]]));
      const identity = verifyOwnershipProof(record, body, { context, now: now() });
      lastResult = { exactBytes: true, recoveredPublicKey: identity.publicKey,
        signatureType: body.signatures[0].split('_')[1], authenticationGranted: false,
        authorityChecked: false, broadcast: false };
      event({ stage: 'proof_checked', ...lastResult });
      return json(res, 200, lastResult);
    } catch (error) {
      const code = /^(wallet_proof_|probe_)[a-z_]+$/.test(error.message) ? error.message : 'probe_request_failed';
      event({ stage: 'request_rejected', code });
      if (!res.headersSent) json(res, 400, { code });
    }
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  server.setTimeout(10000, socket => socket.destroy());
  return server;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const server = createProbeServer({ onEvent: value => process.stdout.write(`${JSON.stringify(value)}\n`) });
  server.on('error', error => { console.error(error.code ?? 'probe_start_failed'); process.exitCode = 1; });
  server.listen(10001, '127.0.0.1', () => console.log('GCSC USB sign-only probe: http://127.0.0.1:10001/probe/status'));
  const stop = () => { server.closeAllConnections(); server.close(); };
  const timer = setTimeout(stop, 30 * 60 * 1000);
  timer.unref();
  server.on('close', () => clearTimeout(timer));
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
