import { createWalletFirstLogin } from '../../../../packages/wallet-proof/login-client.mjs'
import { api, type GcscUser } from './api'
import {
  connectWebAuthSession,
  signWebAuthOwnershipChallenge,
  type WebAuthSigningSession,
} from './webauth'

let signingSession: WebAuthSigningSession | null = null

const XPR_TESTNET_CHAIN_ID =
  '71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd'
const XPR_TESTNET_ENDPOINTS = [
  import.meta.env.VITE_XPR_TESTNET_RPC_URL || 'https://testnet-api.alvosec.com',
]

const walletFirstLogin = createWalletFirstLogin<GcscUser>({
  connect: async () => {
    const connected = await connectWebAuthSession({
      restoreSession: false,
      chainId: XPR_TESTNET_CHAIN_ID,
      endpoints: XPR_TESTNET_ENDPOINTS,
    })
    if (!connected) return null
    if (connected.session.chainId !== XPR_TESTNET_CHAIN_ID) {
      throw new Error('wallet_login_wrong_network')
    }
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
