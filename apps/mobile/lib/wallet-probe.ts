import ProtonRNSDK, { type LinkSession } from '@proton/react-native-sdk';
import { createOwnershipProofRequester, type OwnershipChallenge, type OwnershipProof } from '../../../packages/wallet-proof/request-proof.mjs';
import { inspectProofResponse } from '../../../packages/wallet-proof/probe-support.mjs';

export const WALLET_PROBE_ENABLED = process.env.EXPO_PUBLIC_WALLET_PROBE === '1';
export const WALLET_PROBE_ORIGIN = 'http://127.0.0.1:10001';
const CHAIN_ID = '71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd';
let pairingPending = false;
let signingPending = false;
const memory = new Map<string, string>();

export async function probeApi<T>(path: string, body?: unknown): Promise<T> {
  if (!WALLET_PROBE_ENABLED || !['status', 'challenge', 'proof', 'observation'].includes(path)) {
    throw new Error('probe_disabled');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${WALLET_PROBE_ORIGIN}/probe/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal,
    });
    const value = await response.json();
    if (!response.ok) throw new Error(typeof value.code === 'string' ? value.code : 'probe_api_failed');
    return value as T;
  } finally { clearTimeout(timer); }
}

export interface ProbeSession {
  accountName: string;
  permission: string;
  sign: (challenge: OwnershipChallenge, signal: AbortSignal) => Promise<OwnershipProof>;
}

export async function connectProbeWallet(onObservation: (summary: ReturnType<typeof inspectProofResponse>) => void): Promise<ProbeSession> {
  if (!WALLET_PROBE_ENABLED) throw new Error('probe_disabled');
  if (pairingPending || signingPending) throw new Error('wallet_proof_request_pending');
  pairingPending = true;
  let session: LinkSession;
  try {
    // Isolated, process-only SDK storage: never replace the user's application or payment session.
    const result = await ProtonRNSDK({
      linkOptions: { chainId: CHAIN_ID,
        endpoints: ['https://api-xprnetwork-test.saltant.io', 'https://testnet-api.alvosec.com'],
        restoreSession: false, storagePrefix: '@gcsc/probe/',
        storage: { read: async key => memory.get(key) ?? null,
          write: async (key, value) => { memory.set(key, value); },
          remove: async key => { memory.delete(key); } },
      },
      transportOptions: { requestAccount: 'gcsctoken111', getReturnUrl: () => 'smartcontractor://wallet-probe' },
    });
    if (!result.session || String(result.session.chainId) !== CHAIN_ID) throw new Error('probe_wrong_network');
    session = result.session;
  } finally { pairingPending = false; }
  const request = createOwnershipProofRequester({
    getIdentity: () => ({ ...session.auth, chainId: session.chainId }),
    transact: async (args, options) => {
      if (signingPending) throw new Error('wallet_proof_request_pending');
      signingPending = true;
      try {
        const result = await session.transact(args as Parameters<typeof session.transact>[0], options);
        const summary = inspectProofResponse(result);
        onObservation(summary);
        await probeApi('observation', summary).catch(() => undefined);
        return result;
      } finally { signingPending = false; }
    },
  });
  return { accountName: String(session.auth.actor), permission: String(session.auth.permission),
    sign: (challenge, signal) => request(challenge, { signal }) };
}

export function probeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message === 'probe_wrong_network') return 'Select XPR Network Testnet in WebAuth.';
  if (message.includes('request_pending')) return 'A wallet request is still pending. Close it in WebAuth first.';
  if (message.includes('transaction_mismatch')) return 'WebAuth changed the transaction. Proof rejected.';
  if (message.includes('signature_missing')) return 'Unsupported signature format. No authentication granted.';
  if (message.includes('bytes_missing')) return 'WebAuth did not return signed transaction bytes.';
  if (message.includes('expired')) return 'The challenge expired.';
  if (/cancel|reject|closed/i.test(message)) return 'Wallet request cancelled.';
  if (/timeout|abort/i.test(message)) return 'Wallet request timed out.';
  if (/endpoint/i.test(message)) return 'WebAuth endpoint unavailable.';
  return 'Probe could not complete. Check USB and the wallet request.';
}
