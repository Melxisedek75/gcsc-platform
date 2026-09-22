'use strict';

const hex256 = /^[0-9a-f]{64}$/;
const namePattern = /^[a-z1-5](?:[a-z1-5.]{0,10}[a-z1-5])?$/;
const contextFields = [
  'purpose', 'audience', 'chainId', 'accountName', 'permission', 'sessionBinding',
];

function invalid() {
  throw new Error('wallet_proof_store_invalid');
}

function validateContext(context) {
  if (!context || !['link', 'login'].includes(context.purpose)
    || typeof context.audience !== 'string' || context.audience.length > 256
    || !hex256.test(context.chainId) || !hex256.test(context.sessionBinding)
    || !namePattern.test(context.accountName) || !namePattern.test(context.permission)) {
    invalid();
  }
}

function validateRecord(record) {
  validateContext(record);
  if (!record || record.version !== 1 || !hex256.test(record.challengeId)
    || !Number.isSafeInteger(record.issuedAt) || !Number.isSafeInteger(record.expiresAt)
    || record.expiresAt <= record.issuedAt
    || typeof record.serializedTransaction !== 'string'
    || record.serializedTransaction.length === 0
    || record.serializedTransaction.length > 16384
    || !/^(?:[0-9a-f]{2})+$/.test(record.serializedTransaction)
    || !record.transaction || typeof record.transaction !== 'object'
    || !record.signingOptions || record.signingOptions.broadcast !== false
    || record.signingOptions.noModify !== true) {
    invalid();
  }
}

function matchesContext(record, context) {
  return contextFields.every(field => record[field] === context[field]);
}

function createJsonChallengeStore({ database, save }) {
  if (!database || typeof database !== 'object' || typeof save !== 'function') invalid();
  if (!Array.isArray(database.wallet_challenges)) database.wallet_challenges = [];

  return {
    async put(record) {
      validateRecord(record);
      const index = database.wallet_challenges.findIndex(row => row.challengeId === record.challengeId);
      const stored = JSON.parse(JSON.stringify(record));
      if (index === -1) database.wallet_challenges.push(stored);
      else database.wallet_challenges[index] = stored;
      save();
    },

    async take(challengeId, context) {
      if (!hex256.test(challengeId)) invalid();
      validateContext(context);
      const index = database.wallet_challenges.findIndex(row =>
        row.challengeId === challengeId && matchesContext(row, context));
      if (index === -1) return null;
      const [stored] = database.wallet_challenges.splice(index, 1);
      save();
      validateRecord(stored);
      return stored;
    },
  };
}

function createPostgresChallengeStore({ query }) {
  if (typeof query !== 'function') invalid();
  return {
    async put(record) {
      validateRecord(record);
      await query(
        `INSERT INTO wallet_challenges
          (challenge_id, purpose, audience, chain_id, account_name, permission,
           session_binding, issued_at, expires_at, challenge_record)
         VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8 / 1000.0),
           to_timestamp($9 / 1000.0), $10::jsonb)
         ON CONFLICT (challenge_id) DO NOTHING`,
        [record.challengeId, record.purpose, record.audience, record.chainId,
          record.accountName, record.permission, record.sessionBinding,
          record.issuedAt, record.expiresAt, JSON.stringify(record)],
      );
    },

    async take(challengeId, context) {
      if (!hex256.test(challengeId)) invalid();
      validateContext(context);
      const result = await query(
        `DELETE FROM wallet_challenges
         WHERE challenge_id = $1 AND purpose = $2 AND audience = $3
           AND chain_id = $4 AND account_name = $5 AND permission = $6
           AND session_binding = $7
         RETURNING challenge_record`,
        [challengeId, context.purpose, context.audience, context.chainId,
          context.accountName, context.permission, context.sessionBinding],
      );
      const value = result.rows?.[0]?.challenge_record;
      if (!value) return null;
      const stored = typeof value === 'string' ? JSON.parse(value) : value;
      validateRecord(stored);
      return stored;
    },
  };
}

module.exports = { createJsonChallengeStore, createPostgresChallengeStore };
