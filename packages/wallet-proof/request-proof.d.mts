export interface OwnershipChallenge {
  version: 1;
  purpose: 'link' | 'login';
  audience: string;
  chainId: string;
  accountName: string;
  permission: string;
  sessionBinding: string;
  challengeId: string;
  issuedAt: number;
  expiresAt: number;
  transaction: Record<string, unknown>;
  serializedTransaction: string;
}
export interface OwnershipProof {
  challengeId: string;
  signatures: string[];
  serializedTransaction: string;
}
export function createOwnershipProofRequester(options: {
  transact: (args: unknown, options: { broadcast: false; noModify: true }) => Promise<unknown>;
  getIdentity: () => { actor: unknown; permission: unknown; chainId: unknown } | null;
  now?: () => number;
  timeoutMs?: number;
}): (challenge: OwnershipChallenge, options?: { signal?: AbortSignal }) => Promise<OwnershipProof>;
