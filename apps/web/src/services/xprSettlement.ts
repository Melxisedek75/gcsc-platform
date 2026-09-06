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

  if (params.action !== 'submitms') return base

  return {
    ...base,
    evidence_hash: params.evidenceHash || 'dashboard-submit',
  }
}

export async function signEscrowMilestoneAction(params: SignEscrowMilestoneParams): Promise<XprSettlementResult> {
  const connected = await connectWebAuthSession({
    chainId: XPR_TESTNET_CHAIN_ID,
    endpoints: getTestnetEndpoints(),
  })

  if (!connected) {
    throw new Error('Connect WebAuth before signing a testnet escrow action')
  }

  const raw = await connected.session.transact(
    {
      actions: [
        {
          account: GCSC_ESCROW_CONTRACT,
          name: params.action,
          authorization: [
            {
              actor: connected.wallet.accountName,
              permission: connected.wallet.permission,
            },
          ],
          data: buildMilestoneData(params),
        },
      ],
    },
    { broadcast: true },
  )

  return {
    transactionId: getTransactionId(raw),
    action: params.action,
    chainId: XPR_TESTNET_CHAIN_ID,
    contractAccount: GCSC_ESCROW_CONTRACT,
    wallet: connected.wallet,
    raw,
  }
}
