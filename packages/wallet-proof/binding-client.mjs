const fail = code => { throw new Error(code); };

export function createWalletBinding({ connect, issueChallenge, sign, verify }) {
  if ([connect, issueChallenge, sign, verify].some(value => typeof value !== 'function')) {
    fail('wallet_binding_config_invalid');
  }
  let pending = false;
  return async function bind({ signal } = {}) {
    if (pending) fail('wallet_binding_request_pending');
    if (signal?.aborted) fail('wallet_binding_cancelled');
    pending = true;
    try {
      const session = await connect();
      if (!session?.account || signal?.aborted) fail('wallet_binding_cancelled');
      const accountName = String(session.account);
      const permission = String(session.permission || 'active');
      const challenge = await issueChallenge({ accountName, permission });
      if (signal?.aborted) fail('wallet_binding_cancelled');
      const proof = await sign(challenge, signal);
      if (signal?.aborted) fail('wallet_binding_cancelled');
      const response = await verify({ accountName, permission, proof });
      if (signal?.aborted) fail('wallet_binding_cancelled');
      if (!response?.user?.wallet || response.user.wallet.verified !== true) {
        fail('wallet_binding_response_invalid');
      }
      return response.user;
    } finally {
      pending = false;
    }
  };
}
