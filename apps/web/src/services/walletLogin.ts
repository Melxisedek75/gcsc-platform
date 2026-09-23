import { createWalletFirstLogin } from '../../../../packages/wallet-proof/login-client.mjs'
import { api, type GcscUser } from './api'
import {
  connectWebAuthSession,
  signWebAuthOwnershipChallenge,
  type WebAuthSigningSession,
} from './webauth'

let signingSession: WebAuthSigningSession | null = null

const walletFirstLogin = createWalletFirstLogin<GcscUser>({
  connect: async () => {
    const connected = await connectWebAuthSession({ restoreSession: false })
    if (!connected) return null
    signingSession = connected.session
    return {
      account: connected.wallet.accountName,
      permission: connected.wallet.permission,
    }
  },
  issueChallenge: body => api.walletLoginChallenge(body),
  sign: (challenge, signal) => {
    if (!signingSession) throw new Error('wallet_login_session_missing')
    return signWebAuthOwnershipChallenge(signingSession, challenge, signal)
  },
  verify: body => api.walletLoginVerify(body),
  save: async token => { api.setToken(token) },
})

export function loginWithWebAuth(signal?: AbortSignal): Promise<GcscUser> {
  return walletFirstLogin({ signal })
}
