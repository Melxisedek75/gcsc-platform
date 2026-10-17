import { connectWebAuthSession, type ConnectedWebAuthWallet } from './webauth'

export const XPR_TESTNET_CHAIN_ID =
  import.meta.env.VITE_XPR_TESTNET_CHAIN_ID ||
  '71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd'

export const GCSC_ESCROW_CONTRACT = import.meta.env.VITE_GCSC_ESCROW_CONTRACT || 'gcscrow1111'

const DEFAULT_TESTNET_ENDPOINTS = [
  'https://test.proton.eosusa.io',
  'https://testnet-api.alvosec.com',
  'https://proton-testnet.cryptolions.io',
  'https://testnet.brotonbp.com',
  'https://testnet.rockerone.io',
]

export type EscrowMilestoneChainAction =
  | 'submitms'
  | 'approvems'
  | 'releasems'
  | 'disputems'

interface SignEscrowMilestoneParams {
  action: EscrowMilestoneChainAction
  expectedUserId: number
  expectedActor: string
  expectedPermission: string
  isSessionCurrent: () => boolean
  escrowId: number
  milestoneId: number
  evidenceHash?: string
}

export interface XprSettlementResult {
  transactionId?: string
  action: EscrowMilestoneChainAction
  chainId: string
  contractAccount: string
  wallet: ConnectedWebAuthWallet
  raw: unknown
}

function getTestnetEndpoints(): string[] {
  const configured = import.meta.env.VITE_XPR_TESTNET_RPC_URL
  if (!configured) return DEFAULT_TESTNET_ENDPOINTS
  return configured
    .split(',')
    .map((endpoint: string) => endpoint.trim())
    .filter(Boolean)
}

function getTransactionId(result: unknown): string | undefined {
  if (!result || typeof result !== 'object') return undefined

  const value = result as {
    transaction_id?: unknown
    processed?: { id?: unknown; transaction_id?: unknown }
    response?: { transaction_id?: unknown }
    resolved?: { transaction?: { id?: unknown } }
  }

  const candidate =
    value.transaction_id ||
    value.processed?.id ||
    value.processed?.transaction_id ||
    value.response?.transaction_id ||
    value.resolved?.transaction?.id

  return typeof candidate === 'string' && candidate.length > 0 ? candidate : undefined
}

function buildMilestoneData(params: SignEscrowMilestoneParams): Record<string, number | string> {
  const base = {
    escrow_id: params.escrowId,
    milestone_id: params.milestoneId,
  }

  if (params.action === 'disputems') return { actor: params.expectedActor, ...base }
  if (params.action !== 'submitms') return base

  return {
    ...base,
    evidence_hash: params.evidenceHash || 'dashboard-submit',
  }
}

let signingInProgress = false

function attemptKey(params: SignEscrowMilestoneParams): string {
  return 'gcsc:escrow-attempt:v1:' + JSON.stringify([
    XPR_TESTNET_CHAIN_ID, GCSC_ESCROW_CONTRACT, params.expectedUserId, params.expectedActor,
    params.expectedPermission, params.escrowId, params.milestoneId, params.action,
  ])
}

export async function signEscrowMilestoneAction(params: SignEscrowMilestoneParams): Promise<XprSettlementResult> {
  if (typeof navigator === 'undefined' || !navigator.locks?.request) {
    throw new Error('This browser cannot safely coordinate escrow signing across tabs. Use a browser with Web Locks support.')
  }
  return navigator.locks.request(attemptKey(params), { mode: 'exclusive', ifAvailable: true }, async (lock) => {
    if (!lock) throw new Error('An escrow signing request is already in progress in another tab')
    return signLockedEscrowMilestoneAction(params)
  })
}

async function signLockedEscrowMilestoneAction(params: SignEscrowMilestoneParams): Promise<XprSettlementResult> {
  if (signingInProgress) throw new Error('An escrow signing request is already in progress')
  const { expectedUserId, expectedActor, expectedPermission, isSessionCurrent } = params
  if (!Number.isSafeInteger(expectedUserId) || expectedUserId <= 0 || !expectedActor?.trim() || !expectedPermission?.trim() || typeof isSessionCurrent !== 'function' || !isSessionCurrent()) {
    throw new Error('A current verified wallet session is required before signing')
  }
  signingInProgress = true
  try {
    // This journal survives reloads. It intentionally never clears an attempted action:
    // a lost SDK response cannot prove that the chain did not accept the transaction.
    const journalKey = attemptKey(params)
    const saved = localStorage.getItem(journalKey)
    if (saved !== null) {
      let entry: { state?: string; transactionId?: string }
      try { entry = JSON.parse(saved) } catch { throw new Error('Escrow attempt journal is unreadable. Reconcile the chain before signing again.') }
      if (entry.state !== 'broadcast' || typeof entry.transactionId !== 'string' || !entry.transactionId) {
        throw new Error('Previous escrow transaction outcome is unknown. Reconcile the chain before signing again.')
      }
      return {
        transactionId: entry.transactionId, action: params.action, chainId: XPR_TESTNET_CHAIN_ID,
        contractAccount: GCSC_ESCROW_CONTRACT,
        wallet: { accountName: expectedActor, permission: expectedPermission, walletType: 'webauth' }, raw: null,
      }
    }
    const connected = await connectWebAuthSession({
      chainId: XPR_TESTNET_CHAIN_ID,
      endpoints: getTestnetEndpoints(),
    })

    if (!connected) {
      throw new Error('Connect WebAuth before signing a testnet escrow action')
    }

    const { session, wallet } = connected
    if (!isSessionCurrent()) throw new Error('Application session changed before signing')
    if (session.auth?.actor !== expectedActor || session.auth?.permission !== expectedPermission ||
        wallet.accountName !== expectedActor || wallet.permission !== expectedPermission ||
        session.chainId !== XPR_TESTNET_CHAIN_ID) {
      throw new Error('Connected WebAuth account, permission and chain must match the verified wallet and testnet')
    }

    // Re-read immediately before the durable write: another completed connection may
    // have recorded this action while the wallet dialog was open.
    if (localStorage.getItem(journalKey) !== null) {
      throw new Error('An escrow attempt already exists. Reconcile it before signing again.')
    }
    const attempt = JSON.stringify({ state: 'unknown' })
    localStorage.setItem(journalKey, attempt)
    if (localStorage.getItem(journalKey) !== attempt) throw new Error('Could not save escrow attempt. Signing was blocked.')
    let raw: unknown
    try {
      raw = await session.transact(
        {
          actions: [
            {
              account: GCSC_ESCROW_CONTRACT,
              name: params.action,
              authorization: [
                {
                  actor: expectedActor,
                  permission: expectedPermission,
                },
              ],
              data: buildMilestoneData(params),
            },
          ],
        },
        { broadcast: true },
      )

    } catch {
      throw new Error('Escrow transaction outcome is unknown. It may have been broadcast. Reconcile the chain before signing again.')
    }
    const transactionId = getTransactionId(raw)
    if (!transactionId) throw new Error('Escrow transaction outcome is unknown: wallet returned no transaction id. Reconcile the chain before signing again.')
    try {
      const known = JSON.stringify({ state: 'broadcast', transactionId })
      localStorage.setItem(journalKey, known)
      if (localStorage.getItem(journalKey) !== known) throw new Error('journal readback failed')
    } catch {
      throw new Error(`Transaction ${transactionId} was broadcast but could not be saved locally. Reconcile this transaction; do not sign again.`)
    }
    return {
      transactionId,
      action: params.action,
      chainId: XPR_TESTNET_CHAIN_ID,
      contractAccount: GCSC_ESCROW_CONTRACT,
      wallet: connected.wallet,
      raw,
    }
  } finally {
    signingInProgress = false
  }
}
