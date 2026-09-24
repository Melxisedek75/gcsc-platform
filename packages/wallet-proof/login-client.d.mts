import type { OwnershipChallenge, OwnershipProof } from './request-proof.mjs';

export interface WalletLoginSession {
  account: string;
  permission?: string;
}

export interface WalletLoginResponse<TUser> {
  token: string;
  user: TUser;
}

export function createWalletFirstLogin<TUser>(dependencies: {
  connect: () => Promise<WalletLoginSession | null>;
  issueChallenge: (body: { accountName: string; permission: string }) => Promise<OwnershipChallenge>;
  sign: (challenge: OwnershipChallenge, signal?: AbortSignal) => Promise<OwnershipProof>;
  verify: (body: {
    accountName: string;
    permission: string;
    sessionBinding: string;
    proof: OwnershipProof;
  }) => Promise<WalletLoginResponse<TUser>>;
  save: (token: string, user: TUser) => Promise<void>;
}): (options?: { signal?: AbortSignal }) => Promise<TUser>;
