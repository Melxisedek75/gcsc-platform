import { createWalletBinding } from '../../../../packages/wallet-proof/binding-client.mjs'
import { api, type GcscUser } from './api'
import { connectWebAuthSession, signWebAuthOwnershipChallenge, type WebAuthSigningSession } from './webauth'

const CHAIN_ID = '71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd'
let pending = false

// Bind only on an explicit user action. A restored SDK session is not ownership proof.
export async function bindWebAuthWallet(userId: GcscUser['id'], signal?: AbortSignal): Promise<GcscUser> {
  if (pending) throw new Error('wallet_binding_request_pending')
  const token = api.getToken()
  if (!token) throw new Error('wallet_binding_sign_in_required')
  const assertSession = () => {
    if (signal?.aborted || api.getToken() !== token) throw new Error('wallet_binding_session_changed')
  }
  let session: WebAuthSigningSession | null = null
  pending = true
  try {
    const bind = createWalletBinding<GcscUser>({
      connect: async () => {
        assertSession()
        const profile = await api.getProfile()
        assertSession()
        if (profile.user.id !== userId) throw new Error('wallet_binding_session_changed')
        const connected = await connectWebAuthSession({ restoreSession: false, chainId: CHAIN_ID,
          endpoints: [import.meta.env.VITE_XPR_TESTNET_RPC_URL || 'https://testnet-api.alvosec.com'] })
        assertSession()
        if (!connected) return null
        if (connected.session.chainId !== CHAIN_ID) throw new Error('wallet_binding_wrong_network')
        session = connected.session
        return { account: connected.wallet.accountName, permission: connected.wallet.permission }
      },
      issueChallenge: async body => { assertSession(); const result = await api.walletOwnershipChallenge(body); assertSession(); return result },
      sign: async (challenge, cancellation) => {
        assertSession()
        if (!session) throw new Error('wallet_binding_session_missing')
        const result = await signWebAuthOwnershipChallenge(session, challenge, cancellation)
        assertSession()
        return result
      },
      verify: async body => {
        assertSession()
        const result = await api.walletOwnershipVerify(body)
        assertSession()
        if (result.user.id !== userId) throw new Error('wallet_binding_session_changed')
        return result
      },
    })
    const result = await bind({ signal })
    assertSession()
    return result
  } finally { pending = false }
}
