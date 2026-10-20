const fail = code => { throw new Error(code); };
const hex256 = /^[a-f0-9]{64}$/;
const nameAlphabet = '.12345abcdefghijklmnopqrstuvwxyz';

function encodeName(name) {
  if (typeof name !== 'string' || name.length > 12) fail('wallet_proof_challenge_invalid');
  let value = 0n;
  for (let index = 0; index <= 12; index += 1) {
    const symbol = index < name.length ? nameAlphabet.indexOf(name[index]) : 0;
    if (symbol < 0 || (index === 12 && symbol > 15)) fail('wallet_proof_challenge_invalid');
    value |= BigInt(index === 12 ? symbol & 0x0f : symbol & 0x1f)
      << BigInt(index === 12 ? 0 : 64 - (5 * (index + 1)));
  }
  const bytes = [];
  for (let index = 0; index < 8; index += 1) {
    bytes.push(Number((value >> BigInt(index * 8)) & 0xffn).toString(16).padStart(2, '0'));
  }
  return bytes.join('');
}

function bytesHex(value) {
  if (typeof value === 'string' && value.length <= 16384 && /^(?:[a-fA-F0-9]{2})+$/.test(value)) {
    return value.toLowerCase();
  }
  if (value instanceof Uint8Array && value.length > 0 && value.length <= 8192) {
    return Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  fail('wallet_proof_bytes_missing');
}

function identityMatches(identity, challenge) {
  return identity && String(identity.actor) === challenge.accountName
    && String(identity.permission) === challenge.permission
    && String(identity.chainId) === challenge.chainId;
}

function validateChallenge(challenge, now) {
  const tx = challenge?.transaction;
  const action = tx?.actions?.[0];
  const nonce = tx?.context_free_actions?.[0];
  if (challenge?.version !== 1 || !hex256.test(challenge.challengeId)
    || !hex256.test(challenge.chainId) || !hex256.test(challenge.sessionBinding)
    || !['link', 'login'].includes(challenge.purpose)
    || typeof challenge.audience !== 'string' || challenge.audience.length > 256
    || !Number.isSafeInteger(challenge.issuedAt) || !Number.isSafeInteger(challenge.expiresAt)
    || challenge.expiresAt - challenge.issuedAt < 1000 || challenge.expiresAt - challenge.issuedAt > 300000
    || !Array.isArray(tx?.actions) || tx.actions.length !== 1
    || action?.account !== '' || action.name !== 'identity'
    || !Array.isArray(action.authorization) || action.authorization.length !== 1
    || action.authorization[0].actor !== challenge.accountName
    || action.authorization[0].permission !== challenge.permission
    || action.data !== `01${encodeName(challenge.accountName)}${encodeName(challenge.permission)}`
    || !Array.isArray(tx.context_free_actions) || tx.context_free_actions.length !== 1
    || nonce?.account !== 'eosio.null' || nonce.name !== 'nonce'
    || !Array.isArray(nonce.authorization) || nonce.authorization.length !== 0
    || typeof nonce.data !== 'string' || nonce.data.length > 4096 || !/^(?:[a-f0-9]{2})+$/.test(nonce.data)
    || tx.ref_block_num !== 0 || tx.ref_block_prefix !== 0
    || tx.max_net_usage_words !== 0 || tx.max_cpu_usage_ms !== 0 || tx.delay_sec !== 0
    || !Array.isArray(tx.transaction_extensions) || tx.transaction_extensions.length !== 0
    || tx.expiration !== new Date(challenge.expiresAt).toISOString().slice(0, 19)) {
    fail('wallet_proof_challenge_invalid');
  }
  bytesHex(challenge.serializedTransaction);
  if (!Number.isSafeInteger(now) || now < challenge.issuedAt || now >= challenge.expiresAt) {
    fail('wallet_proof_expired');
  }
}

function normalizeResult(result, challenge) {
  if (!result || typeof result !== 'object') fail('wallet_proof_result_unsupported');
  if (result.processed != null || result.transaction_id != null) fail('wallet_proof_broadcast');
  if (result.serializedContextFreeData != null || result.serialized_context_free_data != null) {
    fail('wallet_proof_result_unsupported');
  }
  const serializedTransaction = bytesHex(result.resolved?.serializedTransaction ?? result.serializedTransaction);
  if (serializedTransaction !== challenge.serializedTransaction.toLowerCase()) fail('wallet_proof_transaction_mismatch');
  if (!Array.isArray(result.signatures) || result.signatures.length !== 1) fail('wallet_proof_signature_missing');
  const signature = String(result.signatures[0]);
  if (signature.length > 256 || !/^SIG_(K1|R1)_[1-9A-HJ-NP-Za-km-z]+$/.test(signature)) fail('wallet_proof_signature_missing');
  if (result.signer && (String(result.signer.actor) !== challenge.accountName
    || String(result.signer.permission) !== challenge.permission)) fail('wallet_proof_session_changed');
  return { challengeId: challenge.challengeId, signatures: [signature], serializedTransaction };
}

// One requester per signing session. Pairing metadata is never a proof or an application login.
export function createOwnershipProofRequester({ transact, getIdentity, requestAccount, now = Date.now, timeoutMs = 90000 }) {
  if (typeof transact !== 'function' || typeof getIdentity !== 'function' || typeof now !== 'function'
    || (requestAccount !== undefined && !/^[a-z1-5](?:[a-z1-5.]{0,10}[a-z1-5])?$/.test(requestAccount))
    || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) fail('wallet_proof_config_invalid');
  let pending = false;
  return async function request(input, { signal } = {}) {
    if (pending) fail('wallet_proof_request_pending');
    if (signal?.aborted) fail('wallet_proof_cancelled');
    // Snapshot before handing control to another app; callers cannot change the expected payload in flight.
    let challenge;
    try {
      const json = JSON.stringify(input);
      if (json.length > 24576) fail('too_large');
      challenge = JSON.parse(json);
    } catch { fail('wallet_proof_challenge_invalid'); }
    validateChallenge(challenge, now());
    if (!identityMatches(getIdentity(), challenge)) fail('wallet_proof_session_changed');
    pending = true;
    let operation;
    try {
      // Some wallet SDKs normalize the transaction object in place. Hand them a
      // disposable copy so the validated challenge snapshot remains immutable.
      const transactionForWallet = JSON.parse(JSON.stringify(challenge.transaction));
      const args = { transaction: transactionForWallet,
        ...(requestAccount ? { info: { req_account: requestAccount } } : {}) };
      operation = Promise.resolve(transact(args, { broadcast: false, noModify: true }))
        .then(value => { pending = false; return value; }, error => { pending = false; throw error; });
    } catch (error) { pending = false; throw error; }
    let timer;
    let abort;
    try {
      const interrupted = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('wallet_proof_timeout')), timeoutMs);
        abort = () => reject(new Error('wallet_proof_cancelled'));
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) abort();
      });
      const result = await Promise.race([operation, interrupted]);
      if (signal?.aborted) fail('wallet_proof_cancelled');
      validateChallenge(challenge, now());
      if (!identityMatches(getIdentity(), challenge)) fail('wallet_proof_session_changed');
      return normalizeResult(result, challenge);
    } finally {
      clearTimeout(timer);
      if (abort) signal?.removeEventListener('abort', abort);
      // SDKs may not support cancellation. Do not unlock/retry an unresolved signing request.
    }
  };
}
