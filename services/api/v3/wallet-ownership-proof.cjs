'use strict';

const crypto = require('crypto');
const { Serialize, Key, Numeric, digestFromSerializedData } = require('@proton/js');

// Candidate only: no HTTP routes, JWT issuance, database writes, or broadcasts.
// Real wallet acceptance and a durable atomic store are required before activation.
const transactionType = Serialize.getTypesFromAbi(Serialize.createTransactionTypes()).get('transaction');
const namePattern = /^[a-z1-5](?:[a-z1-5.]{0,10}[a-z1-5])?$/;
const hex256 = /^[0-9a-f]{64}$/;
const contextFields = ['purpose', 'audience', 'chainId', 'accountName', 'permission', 'sessionBinding'];
const fail = code => { throw new Error(code); };

function validateContext(context) {
  if (!context || contextFields.some(field => typeof context[field] !== 'string')
    || !['link', 'login'].includes(context.purpose)
    || !hex256.test(context.chainId) || !hex256.test(context.sessionBinding)
    || !namePattern.test(context.accountName) || !namePattern.test(context.permission)
    || typeof context.audience !== 'string' || context.audience.length > 256) {
    fail('wallet_proof_config_invalid');
  }
  let url;
  try { url = new URL(context.audience); } catch { fail('wallet_proof_config_invalid'); }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.origin !== context.audience || url.username || url.password
    || !(url.protocol === 'https:' || (url.protocol === 'http:' && loopback))) {
    fail('wallet_proof_config_invalid');
  }
}

function serializeTransaction(transaction) {
  const buffer = new Serialize.SerialBuffer();
  transactionType.serialize(buffer, transaction);
  return Buffer.from(buffer.asUint8Array()).toString('hex');
}

function createOwnershipChallenge(context, options = {}) {
  validateContext(context);
  const instant = options.now ?? Date.now();
  const ttlMs = options.ttlMs ?? 120000;
  if (!Number.isSafeInteger(instant) || instant < 0 || !Number.isInteger(ttlMs)
    || ttlMs < 1000 || ttlMs > 300000 || instant + ttlMs > 4294967295000) {
    fail('wallet_proof_config_invalid');
  }
  const issuedAt = Math.floor(instant / 1000) * 1000;
  const expiresAt = Math.floor((instant + ttlMs) / 1000) * 1000;
  const nonce = Buffer.from((options.randomBytes ?? crypto.randomBytes)(32));
  if (nonce.length !== 32) fail('wallet_proof_config_invalid');
  const challengeId = nonce.toString('hex');
  const payload = { version: 1 };
  for (const field of contextFields) payload[field] = context[field];
  Object.assign(payload, { nonce: challengeId, issuedAt, expiresAt });
  const identity = new Serialize.SerialBuffer();
  identity.push(1); // ABI optional<permission_level> is present.
  identity.pushName(context.accountName);
  identity.pushName(context.permission);
  const transaction = {
    expiration: new Date(expiresAt).toISOString().slice(0, 19),
    ref_block_num: 0, ref_block_prefix: 0,
    max_net_usage_words: 0, max_cpu_usage_ms: 0, delay_sec: 0,
    // Raw data avoids inventing an ABI for the context-free nonce action.
    context_free_actions: [{
      account: 'eosio.null', name: 'nonce', authorization: [],
      data: Buffer.from(JSON.stringify(payload), 'utf8').toString('hex'),
    }],
    actions: [{
      // WebAuth recognizes the ESR identity pseudo-action and signs it without broadcasting.
      account: '', name: 'identity',
      authorization: [{ actor: context.accountName, permission: context.permission }],
      data: Buffer.from(identity.asUint8Array()).toString('hex'),
    }],
    transaction_extensions: [],
  };
  return {
    version: 1, ...Object.fromEntries(contextFields.map(field => [field, context[field]])),
    challengeId, issuedAt, expiresAt, transaction,
    serializedTransaction: serializeTransaction(transaction),
    signingOptions: { broadcast: false, noModify: true },
  };
}

function validateProofEnvelope(proof) {
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)
    || Object.keys(proof).some(field => !['challengeId', 'serializedTransaction', 'signatures'].includes(field))
    || !hex256.test(proof.challengeId)
    || typeof proof.serializedTransaction !== 'string'
    || proof.serializedTransaction.length > 16384
    || !/^(?:[0-9a-fA-F]{2})+$/.test(proof.serializedTransaction)
    || !Array.isArray(proof.signatures) || proof.signatures.length !== 1
    || typeof proof.signatures[0] !== 'string' || proof.signatures[0].length > 256
    || !/^SIG_(K1|R1)_/.test(proof.signatures[0])) {
    fail('wallet_proof_invalid');
  }
}

function verifyOwnershipProof(record, proof, { context, now = Date.now() }) {
  validateContext(context);
  validateProofEnvelope(proof);
  if (!record || record.version !== 1 || record.challengeId !== proof.challengeId) {
    fail('wallet_proof_not_found');
  }
  if (contextFields.some(field => record[field] !== context[field])) fail('wallet_proof_context_mismatch');
  if (!Number.isSafeInteger(now) || now < record.issuedAt || now >= record.expiresAt) {
    fail('wallet_proof_expired');
  }
  // Reconstruct only our allowed actions. A stored arbitrary transaction is not an auth challenge.
  const expected = createOwnershipChallenge(context, {
    now: record.issuedAt, ttlMs: record.expiresAt - record.issuedAt,
    randomBytes: () => Buffer.from(record.challengeId, 'hex'),
  });
  if (record.serializedTransaction !== expected.serializedTransaction
    || proof.serializedTransaction.toLowerCase() !== expected.serializedTransaction) {
    fail('wallet_proof_transaction_mismatch');
  }
  let signature;
  let publicKey;
  try {
    signature = Key.Signature.fromString(proof.signatures[0]);
    if (![Numeric.KeyType.k1, Numeric.KeyType.r1].includes(signature.getType())) fail('unsupported');
    const digest = digestFromSerializedData(context.chainId, Buffer.from(expected.serializedTransaction, 'hex'));
    publicKey = signature.recover(digest, false);
    if (!signature.verify(digest, publicKey, false)) fail('invalid');
  } catch { fail('wallet_proof_signature_invalid'); }
  return { chainId: context.chainId, accountName: context.accountName,
    permission: context.permission, publicKey: publicKey.toString() };
}

async function bounded(work, timeoutMs, code) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => work(controller.signal)),
      new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error(code)); }, timeoutMs);
      }),
    ]);
  } finally { clearTimeout(timer); }
}

function createOwnershipVerifier({ store, verifyAuthority, now = Date.now,
  authorityTimeoutMs = 8000, storeTimeoutMs = 3000 } = {}) {
  if (typeof store?.take !== 'function' || typeof verifyAuthority !== 'function'
    || typeof now !== 'function' || !Number.isInteger(authorityTimeoutMs)
    || authorityTimeoutMs < 1 || authorityTimeoutMs > 10000
    || !Number.isInteger(storeTimeoutMs) || storeTimeoutMs < 1 || storeTimeoutMs > 5000) {
    fail('wallet_proof_config_invalid');
  }
  return async function redeem(proof, context) {
    validateContext(context);
    validateProofEnvelope(proof);
    // Store must atomically DELETE ... RETURNING by ID + complete server context.
    // Missing/wrong-session requests must not delete another session's challenge.
    const record = await bounded(signal => store.take(proof.challengeId, context, signal),
      storeTimeoutMs, 'wallet_proof_store_timeout');
    if (!record) fail('wallet_proof_not_found');
    const identity = verifyOwnershipProof(record, proof, { context, now: now() });
    // Adapter must verify current authority on this exact chain, not a cached profile/public key.
    const authorized = await bounded(signal => verifyAuthority(identity, signal),
      authorityTimeoutMs, 'wallet_proof_authority_timeout');
    if (authorized !== true) fail('wallet_proof_unauthorized');
    const completedAt = now();
    if (!Number.isSafeInteger(completedAt) || completedAt < record.issuedAt || completedAt >= record.expiresAt) {
      fail('wallet_proof_expired');
    }
    return identity;
  };
}

module.exports = { createOwnershipChallenge, verifyOwnershipProof, createOwnershipVerifier };
