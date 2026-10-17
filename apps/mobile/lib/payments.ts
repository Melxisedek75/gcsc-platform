// A payment attempt is journaled before invoking a broadcasting wallet API.
// An unknown outcome must be reconciled; retrying it must never send more funds.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signTransfer as webauthSignTransfer } from './webauth';
import { getToken, getCurrentUser } from './api';
import { getApiUrl } from './api-config';

export class SessionExpiredError extends Error {
  constructor() { super('Your session has expired. Please sign in again.'); this.name = 'SessionExpiredError'; }
}
export type PaymentMode = 'charge' | 'session';
export interface PaymentRequest {
  mode: PaymentMode; amount: string; recipient: string; memo?: string;
  endpoint?: string; meta?: Record<string, unknown>;
}
export interface PaymentReceipt {
  ok: boolean; txHash?: string; amount: string; recipient: string;
  timestamp: number; error?: string; pending?: boolean;
}
export type PaymentStage = 'idle' | 'requesting' | 'awaiting_signature' |
  'broadcasting' | 'verifying' | 'confirmed' | 'pending' | 'failed';
export interface PaymentProgress { stage: PaymentStage; detail: string; }
interface Attempt { version: 1; context: string; txHash?: string; }
const ATTEMPT_KEY = '@gcsc/payment-attempt/v1';
const HASH = /^[a-f0-9]{64}$/;
let busy = false;
let storageUncertain = false;

async function durable<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Payment storage timed out')), 5000);
    })]);
  } catch (error) {
    // A timed-out native write may still complete. Never race it with a new payment.
    storageUncertain = true;
    throw error;
  } finally { if (timer) clearTimeout(timer); }
}
async function boundedRequest<T>(operation: Promise<T>, abort?: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => { abort?.(); reject(new Error('Payment verification request timed out')); }, 15000);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}
async function post(endpoint: string, token: string, meta: PaymentRequest['meta'], txHash?: string) {
  const controller = new AbortController();
  const response = await boundedRequest(fetch(endpoint, {
    signal: controller.signal,
    method: 'POST', headers: {
      Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
      ...(txHash ? { 'X-Payment-Tx': txHash } : {}),
    }, body: meta ? JSON.stringify(meta) : undefined,
  }), () => controller.abort());
  return response;
}

export async function requestPayment(
  request: PaymentRequest, onProgress: (p: PaymentProgress) => void,
): Promise<PaymentReceipt> {
  const base = { amount: request.amount, recipient: request.recipient, timestamp: Date.now() };
  // A detached/unmounted UI callback cannot interrupt transaction bookkeeping.
  const emit = (stage: PaymentStage, detail: string) => { try { onProgress({ stage, detail }); } catch {} };
  if (busy) return { ...base, ok: false, pending: true, error: 'Another payment is in progress' };
  busy = true;
  let txHash: string | undefined;
  let outstanding = false;
  try {
    if (storageUncertain) throw new Error('Payment storage is uncertain; reconcile before paying again');
    const req: PaymentRequest = { ...request, meta: request.meta == null ? undefined : JSON.parse(JSON.stringify(request.meta)) };
    if (!req.endpoint) throw new Error('Payment endpoint is required');
    const token = getToken();
    const user = getCurrentUser();
    const account = user?.wallet?.account || user?.wallet?.accountName;
    const permission = user?.wallet?.permission;
    if (!token || !user || user.wallet?.verified !== true || !account || !permission) {
      throw new Error('A verified wallet and application session are required');
    }
    const assertCurrent = () => {
      const current = getCurrentUser();
      if (getToken() !== token || current?.id !== user.id || current?.wallet?.verified !== true ||
          (current.wallet.account || current.wallet.accountName) !== account || current.wallet.permission !== permission) {
        throw new Error('Application session changed; payment requires reconciliation');
      }
    };
    const endpoint = getApiUrl(req.endpoint);
    // No JWT or other session secret is written to the journal.
    const context = JSON.stringify([endpoint, user.id, account, permission, req.amount, req.recipient, req.memo ?? '', req.meta]);
    const raw = await durable(AsyncStorage.getItem(ATTEMPT_KEY));
    let attempt: Attempt | null = raw === null ? null : JSON.parse(raw);
    if (attempt) {
      outstanding = true;
      if (attempt.version !== 1 || typeof attempt.context !== 'string' ||
          (attempt.txHash !== undefined && !HASH.test(attempt.txHash))) throw new Error('Invalid payment journal; reconciliation required');
      if (attempt.context !== context) throw new Error('Reconcile the previous payment before starting another');
      txHash = attempt.txHash;
      if (!txHash) throw new Error('Payment outcome is unknown; do not pay again until reconciled');
    } else {
      if (raw !== null) throw new Error('Invalid payment journal; reconciliation required');
      assertCurrent();
      emit('requesting', 'Contacting payment endpoint…');
      const first = await post(endpoint, token, req.meta);
      assertCurrent();
      if (first.status === 401) throw new SessionExpiredError();
      if (first.status !== 402) throw new Error(`Payment unavailable: ${first.status}`);
      const expected = `Payment recipient="${req.recipient}" amount="${req.amount}" memo="${req.memo ?? ''}"`;
      if (first.headers.get('WWW-Authenticate') !== expected) throw new Error('Payment challenge does not match approved terms');
      attempt = { version: 1, context };
      await durable(AsyncStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt)));
      outstanding = true;
      // Identity may change while native storage or wallet UI is waiting.
      try { assertCurrent(); } catch (error) {
        await durable(AsyncStorage.removeItem(ATTEMPT_KEY)); outstanding = false; throw error;
      }
      emit('awaiting_signature', 'Approve in WebAuth wallet');
      const result = await webauthSignTransfer({ recipient: req.recipient, amount: req.amount,
        memo: req.memo ?? '', fromAccount: account, fromPermission: permission,
        isSessionCurrent: () => { try { assertCurrent(); return true; } catch { return false; } } });
      if (result.txHash && HASH.test(result.txHash)) {
        txHash = result.txHash;
        attempt.txHash = txHash;
        await durable(AsyncStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt)));
      }
      if (!result.ok || !txHash) {
        if (result.broadcastAttempted === false && !txHash) {
          await durable(AsyncStorage.removeItem(ATTEMPT_KEY)); outstanding = false;
        }
        throw new Error(result.error || 'Payment outcome is unknown; reconcile before paying again');
      }
    }
    assertCurrent();
    emit('verifying', 'Checking the existing transaction; no new transfer');
    const second = await post(endpoint, token, req.meta, txHash);
    assertCurrent();
    const body = await boundedRequest(second.json());
    assertCurrent();
    if (!second.ok || body?.pending !== false || body?.lead_status !== 'active' || body?.tx_hash !== txHash) {
      throw new Error('Payment recorded or outcome unknown; check confirmation without paying again');
    }
    await durable(AsyncStorage.removeItem(ATTEMPT_KEY));
    outstanding = false;
    emit('confirmed', `Confirmed · ${txHash}`);
    return { ...base, ok: true, txHash };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment failed';
    emit(outstanding ? 'pending' : 'failed', message);
    return { ...base, ok: false, txHash, pending: outstanding, error: message };
  } finally { busy = false; }
}

export const PAYMENT_CONFIG = {
  LEAD_TOKEN_RECIPIENT: 'gcsctoken111',
  LEAD_TOKEN_AMOUNT: '50.0000 XPR',
  LEAD_TOKEN_MEMO: 'gcsc:lead-token',
  JOB_POSTING_RECIPIENT: 'gcsctoken111',
  JOB_POSTING_AMOUNT: '25.0000 XPR',
  JOB_POSTING_MEMO: 'gcsc:job-posting',
  ESCROW_RECIPIENT: 'gcsctoken111',
  LEAD_TOKEN_ENDPOINT: '/api/payment/lead-token',
  JOB_POSTING_ENDPOINT: '/api/payment/job-posting',
} as const;
