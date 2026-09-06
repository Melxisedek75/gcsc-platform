import ProtonWebSDK from '@proton/web-sdk'

export interface ConnectedWebAuthWallet {
  accountName: string
  permission: string
  publicKey?: string
  walletType: 'webauth'
}

export interface WebAuthSigningSession {
  auth: {
    actor: string
    permission: string
  }
  chainId?: string
  transact: (args: unknown, options?: unknown) => Promise<unknown>
}

export interface ConnectedWebAuthSession {
  wallet: ConnectedWebAuthWallet
  session: WebAuthSigningSession
}

export interface WebAuthConnectOptions {
  restoreSession?: boolean
  endpoints?: string[]
  chainId?: string
}

async function requestWebAuthSession(options: WebAuthConnectOptions = {}): Promise<ConnectedWebAuthSession | null> {
  if (typeof window === 'undefined') {
    throw new Error('WebAuth can only be connected in a browser')
  }

  const endpoints = options.endpoints?.length
    ? options.endpoints
    : [import.meta.env.VITE_XPR_RPC_URL || 'https://proton.greymass.com']

  const result = await ProtonWebSDK({
    linkOptions: {
      endpoints,
      chainId: options.chainId,
      restoreSession: Boolean(options.restoreSession),
    },
    transportOptions: {
      requestAccount: 'gcsc.store',
    },
    selectorOptions: {
      enabledWalletTypes: ['webauth'],
      walletType: 'webauth',
    },
    uiOptions: {
      theme: 'light',
      appInfo: {
        name: 'GCSC Smart Contractor',
        logo: `${window.location.origin}/gcsc-logo-round.png`,
        logoRounded: true,
      },
    },
  })

  if (result.error) {
    throw new Error(result.error.message || 'WebAuth connection was cancelled')
  }

  const session = result.session || result.loginResult?.session
  if (!session) return null
  const auth = session?.auth
  if (!auth?.actor) {
    throw new Error('WebAuth did not return an XPR account')
  }
  if (typeof session.transact !== 'function') {
    throw new Error('WebAuth did not return a signing session')
  }

  const wallet: ConnectedWebAuthWallet = {
    accountName: String(auth.actor),
    permission: String(auth.permission || 'active'),
    publicKey: String((session as { publicKey?: unknown }).publicKey || ''),
    walletType: 'webauth',
  }
  const signingSession: WebAuthSigningSession = {
    auth: {
      actor: wallet.accountName,
      permission: wallet.permission,
    },
    chainId: String((session as { chainId?: unknown }).chainId || ''),
    transact: (args, transactOptions) =>
      session.transact(
        args as Parameters<typeof session.transact>[0],
        transactOptions as Parameters<typeof session.transact>[1],
      ),
  }

  return {
    wallet,
    session: signingSession,
  }
}

export async function connectWebAuthSession(options: WebAuthConnectOptions = {}): Promise<ConnectedWebAuthSession | null> {
  return requestWebAuthSession({ ...options, restoreSession: false })
}

export async function connectWebAuthWallet(): Promise<ConnectedWebAuthWallet> {
  const connected = await connectWebAuthSession({ restoreSession: false })
  if (!connected) throw new Error('WebAuth connection was cancelled')
  return connected.wallet
}

export async function restoreWebAuthWallet(): Promise<ConnectedWebAuthWallet | null> {
  try {
    const connected = await requestWebAuthSession({ restoreSession: true })
    return connected?.wallet || null
  } catch {
    return null
  }
}
