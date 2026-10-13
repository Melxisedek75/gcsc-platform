import type { OwnershipChallenge, OwnershipProof } from './request-proof.mjs';

export interface WalletBindingSession {
  account: string;
  permission?: string;
}

export function createWalletBinding<TUser extends { wallet?: { verified?: boolean } | null }>(dependencies: {
  connect: () => Promise<WalletBindingSession | null>;
  issueChallenge: (body: { accountName: string; permission: string }) => Promise<OwnershipChallenge>;
  sign: (challenge: OwnershipChallenge, signal?: AbortSignal) => Promise<OwnershipProof>;
  verify: (body: {
    accountName: string;
    permission: string;
    proof: OwnershipProof;
  }) => Promise<{ user: TUser }>;
}): (options?: { signal?: AbortSignal }) => Promise<TUser>;
