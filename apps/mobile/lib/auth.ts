// Auth helpers — login/register against Railway /api/auth/*.
// Saves JWT + user to AsyncStorage on success via api.saveSession.

import { apiRequest, AuthUser, clearSession, getCurrentUser, getToken, normalizeUser, saveSession, UserRole } from './api';
import { connectWallet, signWalletOwnershipChallenge, clearSession as clearWalletSession } from './webauth';
import { createWalletFirstLogin } from '../../../packages/wallet-proof/login-client.mjs';
import { createWalletBinding } from '../../../packages/wallet-proof/binding-client.mjs';
import type { OwnershipChallenge } from '../../../packages/wallet-proof/request-proof.mjs';

interface AuthResponse {
  message?: string;
  token: string;
  user: AuthUser;
}

interface RegisterPendingResponse {
  message?: string;
  verification_required: true;
  verification_channel: 'email' | 'sms';
  email: string;
  phone?: string;
  expires_in_seconds: number;
}

interface RegisterImmediateResponse extends AuthResponse {
  verification_required: false;
  verification_channel?: 'email' | 'sms';
}

export type RegisterResponse = RegisterPendingResponse | RegisterImmediateResponse;

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: { email: email.trim().toLowerCase(), password },
  });
  await saveSession(res.token, res.user);
  return normalizeUser(res.user);
}

const walletFirstLogin = createWalletFirstLogin<AuthUser>({
  connect: connectWallet,
  issueChallenge: body => apiRequest('/api/auth/wallet/challenge', {
    method: 'POST',
    auth: false,
    body,
  }),
  sign: signWalletOwnershipChallenge,
  verify: body => apiRequest<AuthResponse>('/api/auth/wallet/verify', {
    method: 'POST',
    auth: false,
    body,
  }),
  save: saveSession,
});

export async function loginWithWallet(signal?: AbortSignal): Promise<AuthUser> {
  return normalizeUser(await walletFirstLogin({ signal }));
}

let bindingPending = false;

export async function bindWallet(signal?: AbortSignal): Promise<AuthUser> {
  if (bindingPending) throw new Error('wallet_binding_request_pending');
  const token = getToken();
  const userId = getCurrentUser()?.id;
  if (!token || !userId) throw new Error('wallet_binding_sign_in_required');
  const assertSession = () => {
    if (signal?.aborted || getToken() !== token || getCurrentUser()?.id !== userId) {
      throw new Error('wallet_binding_session_changed');
    }
  };
  bindingPending = true;
  try {
    const walletBinding = createWalletBinding<AuthUser>({
      connect: async () => { assertSession(); const result = await connectWallet(); assertSession(); return result; },
      issueChallenge: async body => {
        assertSession();
        const result = await apiRequest<OwnershipChallenge>('/api/wallet/ownership/challenge', { method: 'POST', body });
        assertSession();
        return result;
      },
      sign: async (challenge, cancellation) => {
        assertSession();
        const result = await signWalletOwnershipChallenge(challenge, cancellation);
        assertSession();
        return result;
      },
      verify: async body => {
        assertSession();
        const result = await apiRequest<{ user: AuthUser }>('/api/wallet/ownership/verify', { method: 'POST', body });
        assertSession();
        if (result.user.id !== userId) throw new Error('wallet_binding_session_changed');
        return result;
      },
    });
    const result = await walletBinding({ signal });
    assertSession();
    return normalizeUser(result);
  } finally { bindingPending = false; }
}

interface RegisterArgs {
  email: string;
  password: string;
  role: UserRole;
  fullName?: string;
  phone?: string;
}

export async function register(args: RegisterArgs): Promise<RegisterResponse> {
  const res = await apiRequest<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    auth: false,
    body: {
      email: args.email.trim().toLowerCase(),
      password: args.password,
      role: args.role,
      fullName: args.fullName,
      phone: args.phone,
      verificationMode: 'optional',
    },
  });
  if (!res.verification_required) {
    await saveSession(res.token, res.user);
  }
  return res;
}

export async function fetchProfile(): Promise<AuthUser> {
  const res = await apiRequest<{ user: AuthUser }>('/api/auth/profile');
  return normalizeUser(res.user);
}

interface ProfilePatch {
  wallet?: { account: string; permission: string } | null;
  fullName?: string;
  phone?: string;
}

export async function updateProfile(patch: ProfilePatch): Promise<AuthUser> {
  const res = await apiRequest<{ user: AuthUser }>('/api/auth/profile', {
    method: 'PUT',
    body: patch,
  });
  return normalizeUser(res.user);
}

export async function logout(): Promise<void> {
  try {
    await clearWalletSession();
  } finally {
    await clearSession();
  }
}

interface VerifyResponse {
  message?: string;
  token?: string;
  user?: AuthUser;
}

export async function verifyCode(email: string, otp: string): Promise<AuthUser | null> {
  const res = await apiRequest<VerifyResponse>('/api/verify', {
    method: 'POST',
    auth: false,
    body: { email: email.trim().toLowerCase(), otp: otp.trim() },
  });
  if (res.token && res.user) {
    await saveSession(res.token, res.user);
    return res.user;
  }
  return null;
}
