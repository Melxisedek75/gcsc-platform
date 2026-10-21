// A payment attempt is journaled before invoking a broadcasting wallet API.
// An unknown outcome must be reconciled; retrying it must never send more funds.
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
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
  confirmation?: { kind: 'project-access'; projectId: number };
}
export interface PaymentReceipt {
  ok: boolean; txHash?: string; amount: string; recipient: string;
  timestamp: number; error?: string; pending?: boolean;
}
export type PaymentStage = 'idle' | 'requesting' | 'awaiting_signature' |
  'broadcasting' | 'verifying' | 'confirmed' | 'pending' | 'failed';
export interface PaymentProgress { stage: PaymentStage; detail: string; }
interface Attempt { version: 1; context: string; txHash?: string;
  attemptKey?: string; phase?: 'quote' | 'signing'; }
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
async function post(endpoint: string, token: string, meta: PaymentRequest['meta'],
  txHash?: string, attemptKey?: string) {
  const controller = new AbortController();
  const response = await boundedRequest(fetch(endpoint, {
    signal: controller.signal,
    method: 'POST', headers: {
      Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
      ...(txHash ? { 'X-Payment-Tx': txHash } : {}),
      ...(attemptKey ? { 'X-Payment-Attempt': attemptKey } : {}),
    }, body: meta ? JSON.stringify(meta) : undefined,
  }), () => controller.abort());
  return response;
}

function newAttemptKey(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
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
  let attempt: Attempt | null = null;
  try {
    if (storageUncertain) throw new Error('Payment storage is uncertain; reconcile before paying again');
    const req: PaymentRequest = { ...request, meta: request.meta == null ? undefined : JSON.parse(JSON.stringify(request.meta)) };
    if (!req.endpoint) throw new Error('Payment endpoint is required');
    if (req.confirmation?.kind === 'project-access') {
      const projectId = req.confirmation.projectId;
      if (!Number.isSafeInteger(projectId) || projectId <= 0 ||
          req.endpoint !== `/api/payment/project-access/${projectId}` ||
          req.memo !== `gcsc:project:${projectId}` ||
          req.amount !== PAYMENT_CONFIG.LEAD_TOKEN_AMOUNT ||
          req.recipient !== PAYMENT_CONFIG.LEAD_TOKEN_RECIPIENT) {
        throw new Error('Project payment terms are invalid');
      }
    }
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
    const projectPayment = req.confirmation?.kind === 'project-access';
    // No JWT or other session secret is written to the journal.
    const context = JSON.stringify([endpoint, user.id, account, permission, req.amount, req.recipient, req.memo ?? '', req.meta,
      req.confirmation?.kind === 'project-access' ? req.confirmation.projectId : null]);
    const raw = await durable(AsyncStorage.getItem(ATTEMPT_KEY));
    attempt = raw === null ? null : JSON.parse(raw);
    if (attempt) {
      outstanding = true;
      if (attempt.version !== 1 || typeof attempt.context !== 'string' ||
          (attempt.txHash !== undefined && !HASH.test(attempt.txHash))) throw new Error('Invalid payment journal; reconciliation required');
      if (attempt.context !== context) throw new Error('Reconcile the previous payment before starting another');
      if (projectPayment && (!attempt.attemptKey || !/^[a-f0-9]{32}$/.test(attempt.attemptKey))) {
        throw new Error('Invalid project payment journal; reconciliation required');
      }
      txHash = attempt.txHash;
      if (!txHash && (!projectPayment || attempt.phase !== 'quote')) {
        throw new Error('Payment outcome is unknown; do not pay again until reconciled');
      }
    } else {
      if (raw !== null) throw new Error('Invalid payment journal; reconciliation required');
    }
    if (!txHash && projectPayment && !attempt) {
      attempt = { version: 1, context, attemptKey: newAttemptKey(), phase: 'quote' };
      await durable(AsyncStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt)));
      outstanding = true;
    }
    if (!txHash) {
      assertCurrent();
      emit('requesting', 'Contacting payment endpoint…');
      const first = await post(endpoint, token, req.meta, undefined, attempt?.attemptKey);
      assertCurrent();
      if (first.status === 401) throw new SessionExpiredError();
      if (first.status !== 402) {
        const failure = await boundedRequest(first.json().catch(() => ({})));
        if (failure?.code === 'project_payment_reserved') {
          throw new Error('Another attempt is reserved for this job. Do not pay again; contact support to reconcile it.');
        }
        if (failure?.code === 'project_access_exists' || failure?.code === 'project_payment_unresolved') {
          throw new Error('This job has an existing payment or access record. Do not pay again; contact support.');
        }
        if (failure?.code === 'self_payment_not_allowed') {
          throw new Error('The payer wallet is also the recipient. Connect a different Testnet account.');
        }
        throw new Error(`Payment unavailable: ${first.status}`);
      }
      const expected = `Payment recipient="${req.recipient}" amount="${req.amount}" memo="${req.memo ?? ''}"`;
      if (first.headers.get('WWW-Authenticate') !== expected) throw new Error('Payment challenge does not match approved terms');
      if (!attempt) attempt = { version: 1, context };
      if (projectPayment) attempt.phase = 'signing';
      await durable(AsyncStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt)));
      outstanding = true;
      // Identity may change while native storage or wallet UI is waiting.
      try { assertCurrent(); } catch (error) {
        if (projectPayment) {
          attempt.phase = 'quote';
          await durable(AsyncStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt)));
        } else {
          await durable(AsyncStorage.removeItem(ATTEMPT_KEY));
        }
        outstanding = false;
        throw error;
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
          if (projectPayment) {
            attempt.phase = 'quote';
            await durable(AsyncStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt)));
          } else {
            await durable(AsyncStorage.removeItem(ATTEMPT_KEY));
          }
          outstanding = false;
        }
        throw new Error(result.error || 'Payment outcome is unknown; reconcile before paying again');
      }
    }
    assertCurrent();
    emit('verifying', 'Checking the existing transaction; no new transfer');
    const second = await post(endpoint, token, req.meta, txHash, attempt?.attemptKey);
    assertCurrent();
    const body = await boundedRequest(second.json());
    assertCurrent();
    const confirmed = req.confirmation?.kind === 'project-access'
      ? body?.access_status === 'paid' && body?.project_id === req.confirmation.projectId
      : body?.lead_status === 'active';
    if (body?.access_status === 'review_required') {
      throw new Error('Transfer recorded for manual review. Do not pay again; keep the transaction hash.');
    }
    if (!second.ok || body?.pending !== false || !confirmed || body?.tx_hash !== txHash) {
      throw new Error('Payment recorded or outcome unknown; check confirmation without paying again');
    }
    await durable(AsyncStorage.removeItem(ATTEMPT_KEY));
    outstanding = false;
    emit('confirmed', `Confirmed · ${txHash}`);
    return { ...base, ok: true, txHash };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment failed';
    const pending = outstanding && !(request.confirmation?.kind === 'project-access'
      && attempt?.phase === 'quote' && !txHash);
    emit(pending ? 'pending' : 'failed', message);
    return { ...base, ok: false, txHash, pending, error: message };
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
