const fail = code => { throw new Error(code); };

export function createWalletFirstLogin({ connect, issueChallenge, sign, verify, save }) {
  if (![connect, issueChallenge, sign, verify, save].every(value => typeof value === 'function')) {
    fail('wallet_login_config_invalid');
  }

  return async function walletFirstLogin({ signal } = {}) {
    if (signal?.aborted) fail('wallet_login_cancelled');
    const session = await connect();
    if (!session?.account) fail('wallet_login_cancelled');

    const accountName = String(session.account);
    const permission = String(session.permission || 'active');
    const challenge = await issueChallenge({ accountName, permission });
    if (signal?.aborted) fail('wallet_login_cancelled');
    const proof = await sign(challenge, signal);
    const response = await verify({
      accountName,
      permission,
      sessionBinding: challenge?.sessionBinding,
      proof,
    });

    if (!response?.token || !response?.user) fail('wallet_login_response_invalid');
    await save(response.token, response.user);
    return response.user;
  };
}
