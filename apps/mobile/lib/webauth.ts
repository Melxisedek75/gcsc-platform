// WebAuth wallet integration for SmartContractor mobile.
//
// The React Native Proton Link SDK carries XPR WebAuth pairing and signatures.
// Wallet storage is kept separate from the app-session fallback: a timed-out
// native write must not be mistaken for a safely persisted wallet identity.

import * as Linking from 'expo-linking';
import { AppState } from 'react-native';
import { walletStorage as AsyncStorage } from './walletStorage';
import { SigningRequest } from '@proton/signing-request';
import ProtonRNSDK, {
  type LinkSession,
  type ProtonLink,
} from '@proton/react-native-sdk';
import {
  type LinkStorage,
} from '@proton/link';
import {
  createOwnershipProofRequester,
  type OwnershipChallenge,
} from '../../../packages/wallet-proof/request-proof.mjs';

const WEBAUTH_SESSION_KEY = '@gcsc/webauth/session';
const PROTON_LINK_STORAGE_PREFIX = '@gcsc/proton-link/';

// XPR (Proton) testnet chain ID — must match backend v3/pure-server.js
// XPR_TESTNET_CHAIN_ID and the official XPR docs. A mismatch routes the
// signing request to the wrong chain or gets rejected by the wallet.
const CHAIN_ID =
  '71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd'; // Proton testnet
// IMPORTANT: these must be real XPR testnet CHAIN API nodes, not the website.
// History of bad nodes (each produced "JSON Parse error: Unexpected character: <"
// because an HTML error page was parsed as JSON):
//  - testnet.xprnetwork.org → explorer site, 404 HTML on /v1/chain/*
//  - tn1.protonnz.com → get_info OK but get_abi → 502 HTML (verified 2026-07-11),
//    which is why wallet LOGIN worked (no chain calls) while TRANSFER failed
//    (needs get_abi + push_transaction).
// Both nodes below verified 2026-07-11: get_abi → 200 JSON, chain_id 71ee83bc….
// Override the primary via EXPO_PUBLIC_XPR_CHAIN_API.
const CHAIN_ENDPOINTS: string[] = [
  ...((typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_XPR_CHAIN_API)
    ? [process.env.EXPO_PUBLIC_XPR_CHAIN_API]
    : []),
  'https://testnet-api.alvosec.com',
  'https://api-xprnetwork-test.saltant.io',
];
const CHAIN_API = CHAIN_ENDPOINTS[0];
const CALLBACK_PATH = 'webauth-callback';
const REQUEST_ACCOUNT = 'gcsctoken111';

export interface WebAuthSession {
  account: string;
  permission: string;
  publicKey?: string;
  connectedAt: number;
}

export interface TransferArgs {
  recipient: string;
  amount: string;
  memo?: string;
  fromAccount?: string;
  fromPermission?: string;
  onDebug?: (message: string) => void;
  // Caller checks its application login/account snapshot; this does not cancel an opened wallet request.
  isSessionCurrent?: () => boolean;
}

export interface SignResult {
  ok: boolean;
  txHash?: string;
  error?: string;
  // True once the SDK broadcast call starts, even if its outcome is unknown.
  broadcastAttempted?: boolean;
}

let sessionRevision = 0;
let transferInFlight = false;
let cleanupPending = 0;
let walletStorageSafe = true;
let cleanupInFlight: Promise<void> = Promise.resolve();
let storageMutationsInFlight: Promise<void> = Promise.resolve();
let currentSession: WebAuthSession | null = null;
let protonLink: ProtonLink | null = null;
let protonSession: LinkSession | null = null;
let protonStorageAccess: { allowCleanup: boolean; revision: number } | null = null;
const ownershipRequests = new WeakMap<LinkSession, ReturnType<typeof createOwnershipProofRequester>>();
const callbackHandlers = new Set<(url: string) => boolean>();
const pendingCallbackUrls: string[] = [];

export function getSession(): WebAuthSession | null {
  return currentSession;
}

// Sign-only adapter. API binding/login stays disabled until the candidate protocol is accepted.
export async function signWalletOwnershipChallenge(challenge: OwnershipChallenge, signal?: AbortSignal) {
  const session = protonSession;
  const link = protonLink;
  if (!session || !link) throw new Error('Connect WebAuth before requesting an ownership proof.');
  let request = ownershipRequests.get(session);
  if (!request) {
    request = createOwnershipProofRequester({
      getIdentity: () => protonSession === session && protonLink === link ? {
        actor: session.auth.actor, permission: session.auth.permission, chainId: session.chainId,
      } : null,
      // The paired session channel opens only `proton-dev://link` and depends on
      // push delivery. The parent transport sends the complete sign-only ESR,
      // which is the path verified against Android WebAuth on XPR Testnet.
      transact: (args, options) => link.transact(
        args as Parameters<typeof link.transact>[0],
        { ...options, chain: session.chainId },
      ),
    });
    ownershipRequests.set(session, request);
  }
  return request(challenge, { signal });
}

export async function loadWebauthSession(): Promise<WebAuthSession | null> {
  const revision = sessionRevision;
  const raw = await AsyncStorage.getItem(WEBAUTH_SESSION_KEY);
  if (!raw || revision !== sessionRevision) return null;
  try {
    sessionRevision += 1;
    currentSession = JSON.parse(raw) as WebAuthSession;
    return currentSession;
  } catch {
    return null;
  }
}

async function persistSession(s: WebAuthSession): Promise<void> {
  const previousRevision = sessionRevision;
  await cleanupInFlight;
  await storageMutationsInFlight;
  if (previousRevision !== sessionRevision) throw new Error('WebAuth session changed while saving; connect again.');
  sessionRevision += 1;
  const revision = sessionRevision;
  if (protonStorageAccess && protonSession?.auth.actor.toString() === s.account) {
    protonStorageAccess.revision = revision;
  }
  currentSession = null;
  await queueStorageMutation(() => revision === sessionRevision,
    () => AsyncStorage.setItem(WEBAUTH_SESSION_KEY, JSON.stringify(s)));
  if (revision !== sessionRevision) throw new Error('WebAuth session changed while saving; connect again.');
  currentSession = s;
}

export async function primeSessionFromBackend(
  account: string,
  permission: string,
): Promise<WebAuthSession> {
  const s: WebAuthSession = { account, permission, connectedAt: Date.now() };
  await persistSession(s);
  return s;
}

export async function clearSession(): Promise<void> {
  cleanupPending += 1;
  walletStorageSafe = false;
  sessionRevision += 1;
  currentSession = null;
  const previousSession = protonSession;
  const previousStorageAccess = protonStorageAccess;
  protonLink = null;
  protonSession = null;
  protonStorageAccess = null;
  // Also drop the Proton Link session (in-memory + SDK storage). Without this,
  // a later transfer restores the PREVIOUS wallet account's session, so after
  // switching accounts every payment fails the profile-wallet match check no
  // matter which account the user picks in WebAuth.
  const cleanup = cleanupInFlight.then(async () => {
    await storageMutationsInFlight;
    try {
      if (previousStorageAccess) previousStorageAccess.allowCleanup = true;
      await previousSession?.remove();
    } catch {
      // A broken session must not prevent removal of the saved identity.
    } finally {
      await storageMutationsInFlight;
      if (previousStorageAccess) previousStorageAccess.allowCleanup = false;
    }
    await Promise.all([
      AsyncStorage.removeItem(WEBAUTH_SESSION_KEY),
      linkStorage.remove('user-auth'),
    ]);
  });
  cleanupInFlight = cleanup.catch(() => {});
  try {
    await cleanup;
    if (cleanupPending === 1) walletStorageSafe = true;
  } finally {
    cleanupPending -= 1;
  }
}

function buildCallbackUrl(requestKey: string): string {
  // ESR wallets only substitute callback payload fields when the callback URL
  // explicitly contains placeholders like {{sa}}, {{sp}}, {{tx}}, and {{sig}}.
  // Match the official React Native SDK return URL shape (`app://screen`) so
  // Android routes the callback through the host-based intent filter.
  return [
    `smartcontractor://${CALLBACK_PATH}?rid=${encodeURIComponent(requestKey)}`,
    'sa={{sa}}',
    'sp={{sp}}',
    'tx={{tx}}',
    'sig={{sig}}',
    'cid={{cid}}',
  ].join('&');
}

const linkStorage: LinkStorage = {
  read: (key: string) => AsyncStorage.getItem(`${PROTON_LINK_STORAGE_PREFIX}${key}`),
  write: (key: string, data: string) =>
    AsyncStorage.setItem(`${PROTON_LINK_STORAGE_PREFIX}${key}`, data),
  remove: (key: string) => AsyncStorage.removeItem(`${PROTON_LINK_STORAGE_PREFIX}${key}`),
};

function queueStorageMutation(allowed: () => boolean, mutation: () => Promise<void>): Promise<void> {
  const pending = storageMutationsInFlight.then(() => allowed() ? mutation() : undefined);
  storageMutationsInFlight = pending.catch(() => {});
  return pending;
}

async function openSigningRequestWithWallet(req: SigningRequest): Promise<void> {
  const encoded = req.encode(true, false);
  const payload = encoded.replace(/^esr:(\/\/)?/i, '');
  const errors: string[] = [];
  for (const scheme of WALLET_SCHEMES) {
    const uri = `${scheme}://${payload}`;
    try {
      await Linking.openURL(uri);
      return;
    } catch (err) {
      errors.push(`${scheme}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(
    `Could not open the WebAuth wallet. Install WebAuth (testnet) from https://webauth.com. Tried schemes — ${errors.join(' | ')}`,
  );
}

async function connectWithProtonNativeSdk(restoreSession = false): Promise<LinkSession> {
  const revision = sessionRevision;
  const storageAccess = { allowCleanup: false, revision };
  const canUseStorage = () => storageAccess.revision === sessionRevision || storageAccess.allowCleanup;
  const scopedStorage: LinkStorage = {
    read: key => canUseStorage() ? linkStorage.read(key) : Promise.resolve(null),
    write: (key, data) => queueStorageMutation(canUseStorage, () => linkStorage.write(key, data)),
    remove: key => queueStorageMutation(canUseStorage, () => linkStorage.remove(key)),
  };
  const result = await ProtonRNSDK({
    linkOptions: {
      chainId: CHAIN_ID,
      endpoints: CHAIN_ENDPOINTS,
      storage: scopedStorage,
      storagePrefix: PROTON_LINK_STORAGE_PREFIX,
      restoreSession,
    },
    transportOptions: {
      requestAccount: REQUEST_ACCOUNT,
      getReturnUrl: () => `smartcontractor://${CALLBACK_PATH}`,
    },
  });

  if (revision !== sessionRevision) {
    throw new Error('WebAuth session changed while pairing; connect again before signing.');
  }
  if (!result.link || !result.session) {
    throw new Error('WebAuth did not return a Proton Link session');
  }
  protonLink = result.link;
  protonSession = result.session;
  protonStorageAccess = storageAccess;
  return result.session;
}

interface CallbackPayload {
  tx?: string;
  sig?: string;
  sa?: string;
  sp?: string;
  rid?: string;
  req?: string;
  cancelled?: string;
  error?: string;
}

function parseCallback(url: string): CallbackPayload {
  const parsed = Linking.parse(url);
  const qp = parsed.queryParams ?? {};
  const out: CallbackPayload = {};
  for (const k of Object.keys(qp)) {
    const v = qp[k];
    if (typeof v === 'string') (out as Record<string, string>)[k] = v;
  }
  return out;
}

export function dispatchWebAuthCallbackUrl(url: string): boolean {
  let handled = false;
  for (const handler of Array.from(callbackHandlers)) {
    handled = handler(url) || handled;
  }
  if (!handled) {
    pendingCallbackUrls.push(url);
    if (pendingCallbackUrls.length > 10) pendingCallbackUrls.shift();
  }
  return handled;
}

function waitForCallback(
  requestKey: string,
  timeoutMs: number,
): Promise<CallbackPayload> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let lastUrl: string | null = null;

    function cleanup() {
      callbackHandlers.delete(acceptUrl);
      sub.remove();
      appStateSub.remove();
      clearTimeout(timer);
    }

    function acceptUrl(url: string): boolean {
      if (settled || url === lastUrl) return true;
      lastUrl = url;
      const payload = parseCallback(url);
      if (payload.rid !== requestKey && payload.req !== requestKey) return false;
      settled = true;
      cleanup();
      if (payload.error) {
        reject(new Error(payload.error));
        return true;
      }
      if (payload.cancelled) {
        reject(new Error('User cancelled in WebAuth'));
        return true;
      }
      resolve(payload);
      return true;
    }

    const sub = Linking.addEventListener('url', ({ url }) => {
      acceptUrl(url);
    });

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      Linking.getInitialURL()
        .then((url) => {
          if (url) acceptUrl(url);
        })
        .catch(() => {});
    });

    Linking.getInitialURL()
      .then((url) => {
        if (url) acceptUrl(url);
      })
      .catch(() => {});

    callbackHandlers.add(acceptUrl);
    for (const url of [...pendingCallbackUrls]) {
      if (acceptUrl(url)) {
        const idx = pendingCallbackUrls.indexOf(url);
        if (idx >= 0) pendingCallbackUrls.splice(idx, 1);
      }
    }

    const timer = setTimeout(() => {
      settled = true;
      cleanup();
      reject(new Error('WebAuth callback timeout'));
    }, timeoutMs);
  });
}

// XPR WebAuth registers its own URL scheme, NOT `esr://`. Testnet WebAuth uses
// `proton-dev://`, mainnet uses `proton://`; some builds also accept `esr://`.
// Override/reorder via EXPO_PUBLIC_WEBAUTH_SCHEMES (comma-separated).
const WALLET_SCHEMES: string[] = (
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WEBAUTH_SCHEMES) ||
  'proton-dev,proton,esr'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Encode the same ESR payload under each candidate scheme and open the first
// one the OS can resolve, so the WebAuth handoff works across wallet variants.
async function openWithWallet(req: SigningRequest): Promise<void> {
  // compress=false: React Native has no zlib ("Need zlib to compress").
  // slashes=true: produce `esr://<payload>`. The ESR payload is scheme-agnostic,
  // so we swap the `esr` prefix for each candidate wallet scheme.
  const encoded = req.encode(false, true);
  const payload = encoded.replace(/^esr:(\/\/)?/i, '');
  const errors: string[] = [];
  for (const scheme of WALLET_SCHEMES) {
    const uri = `${scheme}://${payload}`;
    try {
      await Linking.openURL(uri);
      return;
    } catch (err) {
      errors.push(`${scheme}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(
    `Could not open the WebAuth wallet. Install WebAuth (testnet) from https://webauth.com. Tried schemes — ${errors.join(' | ')}`,
  );
}

function newRequestKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function extractTxHash(result: any): string | undefined {
  return (
    result?.transaction?.id?.toString?.() ??
    result?.processed?.id ??
    result?.payload?.tx
  );
}

function debugTransfer(args: TransferArgs, trace: string[], message: string): void {
  trace.push(message);
  args.onDebug?.(message);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function addSameDeviceInfo(req: SigningRequest): SigningRequest {
  // DEVICE LOG (2026-07-08, SM-N976U): with `same_device` + `return_path` set,
  // WebAuth returned to a BARE `smartcontractor://webauth-callback` (no
  // ?sa/?sp/?tx params) → waitForCallback never got the signer account → 120s
  // timeout → "no connect". WebAuth was using return_path as the return target
  // instead of substituting placeholders into the ESR callback.
  //
  // Fix: keep ONLY `req_account` (drives the "GCSC Token @gcsctoken111" label).
  // Dropping same_device/return_path makes WebAuth deliver the result through
  // the ESR `callback` URL, which carries the {{sa}}/{{sp}}/{{tx}}/{{sig}}
  // placeholders we need.
  req.setInfoKey('req_account', REQUEST_ACCOUNT);
  // return_path brings focus back to the app after signing; the actual signed
  // result travels over the Proton Link channel (not the deeplink), so a bare
  // return here is fine and expected.
  req.setInfoKey('same_device', true);
  req.setInfoKey('return_path', `smartcontractor://${CALLBACK_PATH}`);
  return req;
}

// Fallback ABI used only when the chain API is unreachable. A hand-written
// minimal ABI can make WebAuth silently drop/mis-render the transfer prompt,
// so the real on-chain ABI is fetched (and cached) whenever possible.
const FALLBACK_TOKEN_ABI = {
  version: 'eosio::abi/1.1',
  types: [],
  structs: [
    {
      name: 'transfer',
      base: '',
      fields: [
        { name: 'from', type: 'name' },
        { name: 'to', type: 'name' },
        { name: 'quantity', type: 'asset' },
        { name: 'memo', type: 'string' },
      ],
    },
  ],
  actions: [{ name: 'transfer', type: 'transfer', ricardian_contract: '' }],
  tables: [],
  ricardian_clauses: [],
  error_messages: [],
  abi_extensions: [],
  variants: [],
};

const abiCache = new Map<string, unknown>();

async function fetchChainAbi(account: string): Promise<unknown> {
  if (abiCache.has(account)) return abiCache.get(account);
  try {
    const res = await withTimeout(
      fetch(`${CHAIN_API}/v1/chain/get_abi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_name: account }),
      }),
      10_000,
      'get_abi',
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.abi) {
        abiCache.set(account, data.abi);
        return data.abi;
      }
    }
  } catch {
    // fall through to the minimal ABI
  }
  return FALLBACK_TOKEN_ABI;
}

function sharedSigningRequestOpts() {
  return {
    scheme: 'esr' as const,
    abiProvider: {
      getAbi: async (account: string) => fetchChainAbi(account || 'eosio.token'),
    },
    chainApi: CHAIN_API,
  };
}

function buildIdentityRequest(callback: string): SigningRequest {
  const req = SigningRequest.identity(
    { callback, chainId: CHAIN_ID },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sharedSigningRequestOpts() as any,
  );
  return addSameDeviceInfo(req);
}

async function buildTransferRequest(args: {
  recipient: string;
  amount: string;
  memo: string;
  from: string;
  permission: string;
  callback: string;
}): Promise<SigningRequest> {
  const action = {
    account: 'eosio.token',
    name: 'transfer',
    authorization: [{ actor: args.from, permission: args.permission }],
    data: {
      from: args.from,
      to: args.recipient,
      quantity: args.amount,
      memo: args.memo,
    },
  };
  const req = await SigningRequest.create(
    { action, callback: args.callback, chainId: CHAIN_ID },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sharedSigningRequestOpts() as any,
  );
  return addSameDeviceInfo(req);
}

export async function connectWallet(): Promise<WebAuthSession> {
  // Device logs (SM-N976U, 2026-07-08) proved the direct-ESR deeplink CANNOT
  // receive the identity result from XPR WebAuth — WebAuth delivers the signed
  // result over the Proton Link channel, not the deeplink callback. So the
  // Proton Link SDK is the ONLY working path; it just needed a real chain API
  // node (see CHAIN_API). Use it as the sole connect path.
  // Fresh pairing must not restore a previous account's SDK authorization.
  const expectedRevision = sessionRevision + 1;
  await clearSession();
  if (sessionRevision !== expectedRevision) {
    throw new Error('WebAuth session changed before pairing; connect again.');
  }
  const pairingRevision = sessionRevision;
  let identity: LinkSession;
  try {
    identity = await withTimeout(connectWithProtonNativeSdk(false), 90_000, 'Proton Link login');
  } catch (err) {
    if (pairingRevision === sessionRevision) await clearSession();
    throw err;
  }
  const session: WebAuthSession = {
    account: String(identity.auth.actor),
    permission: String(identity.auth.permission),
    publicKey: identity.publicKey?.toString(),
    connectedAt: Date.now(),
  };
  try {
    await persistSession(session);
    const savedRevision = sessionRevision;
    const stored = await linkStorage.read('user-auth');
    let savedAuth: { actor?: string; permission?: string } | null = null;
    try {
      savedAuth = stored ? JSON.parse(stored) as { actor?: string; permission?: string } : null;
    } catch {
      // Corrupt SDK storage is treated as a failed pairing.
    }
    if (savedRevision !== sessionRevision) throw new Error('WebAuth session changed while pairing; connect again.');
    if (savedAuth?.actor !== session.account || savedAuth?.permission !== session.permission) {
      throw new Error('WebAuth identity was not saved on this device; connect again.');
    }
    return session;
  } catch (err) {
    if (protonSession === identity) await clearSession();
    throw err;
  }
}

export async function signTransfer(args: TransferArgs): Promise<SignResult> {
  if (!walletStorageSafe) {
    return { ok: false, broadcastAttempted: false, error: 'WebAuth session cleanup failed or is incomplete. Reconnect before signing.' };
  }
  if (cleanupPending > 0) {
    return { ok: false, broadcastAttempted: false, error: 'WebAuth session is being cleared. Sign in and reconnect before signing.' };
  }
  if (transferInFlight) {
    return { ok: false, broadcastAttempted: false, error: 'A WebAuth transfer is still pending. Check its result before submitting another transfer.' };
  }
  transferInFlight = true;
  const trace: string[] = [];
  let broadcastAttempted = false;
  let txHash: string | undefined;
  const pendingWork: { promise: Promise<unknown> | null } = { promise: null };
  const revision = sessionRevision;
  // A UI timeout does not cancel SDK work. Keep the guard until that exact
  // promise settles, including when the caller already received an error.
  function track<T>(promise: Promise<T>): Promise<T> {
    pendingWork.promise = promise;
    const settled = () => { if (pendingWork.promise === promise) pendingWork.promise = null; };
    promise.then(settled, settled);
    return promise;
  }
  const assertAppSessionCurrent = () => {
    if (cleanupPending > 0 || !walletStorageSafe) {
      throw new Error('WebAuth session is being cleared. Sign in and reconnect before signing.');
    }
    if (args.isSessionCurrent && !args.isSessionCurrent()) {
      throw new Error('Application session changed before signing. Sign in again and review the transfer.');
    }
  };
  try {
    assertAppSessionCurrent();
    const hasExplicitIdentity = args.fromAccount !== undefined || args.fromPermission !== undefined;
    // Saved profile metadata is not a signable wallet session. Without explicit
    // payment identity, only a currently paired SDK session supplies authority.
    const from = hasExplicitIdentity ? args.fromAccount : protonLink && protonSession?.auth?.actor?.toString();
    const permission = hasExplicitIdentity ? args.fromPermission : protonLink && protonSession?.auth?.permission?.toString();
    if (!from || !permission) {
      throw new Error('A complete expected wallet account and permission or a current paired WebAuth session is required.');
    }
    debugTransfer(args, trace, `Preparing transfer as ${from}@${permission}`);

    let link: ProtonLink | null = protonLink;
    let session: LinkSession | null = protonSession;
    if (!link || !session) {
      debugTransfer(args, trace, 'Restoring Proton Link session');
      assertAppSessionCurrent();
      session = await withTimeout(
        track(connectWithProtonNativeSdk(true)),
        90_000,
        'Proton Link session restore',
      );
      link = protonLink;
    }
    const validateSigner = () => {
      assertAppSessionCurrent();
      if (revision !== sessionRevision || link !== protonLink || session !== protonSession) {
        throw new Error('WebAuth session changed before signing. Reconnect and review the transfer.');
      }
      if (!link || !session) throw new Error('No paired Proton Link session');
      const actor = session.auth?.actor?.toString();
      const actualPermission = session.auth?.permission?.toString();
      const chain = session.chainId?.toString();
      if (!actor || !actualPermission || !chain) {
        throw new Error('WebAuth signer is missing its account, permission or chain. Reconnect before signing.');
      }
      if (actor !== from || actualPermission !== permission || chain !== CHAIN_ID) {
        throw new Error(`WebAuth signer must match ${from}@${permission} on the configured XPR Testnet chain. Reconnect and select the linked wallet.`);
      }
    };
    validateSigner();
    const action = {
      account: 'eosio.token',
      name: 'transfer',
      authorization: [{ actor: from, permission }],
      data: {
        from,
        to: args.recipient,
        quantity: args.amount,
        memo: args.memo ?? '',
      },
    };
    debugTransfer(args, trace, 'Opening Proton Link transaction request');
    validateSigner();
    // Keep the parent Link transport: it carries the full ESR on Android.
    // Starting this call is the point after which a failed/late callback cannot
    // prove that nothing was broadcast. Never re-pair or broadcast automatically.
    broadcastAttempted = true;
    const result = await withTimeout(
      track(link!.transact({ actions: [action] }, { broadcast: true, chain: CHAIN_ID })),
      180_000,
      'WebAuth transaction',
    );
    txHash = extractTxHash(result);
    if (!txHash) throw new Error('WebAuth did not return tx id');
    return { ok: true, txHash, broadcastAttempted: true };
  } catch (err) {
    txHash = txHash ?? extractTxHash(err);
    const msg = err instanceof Error ? err.message : 'Unknown signing error';
    const outcome = broadcastAttempted
      ? `Transfer result is unknown. Check the wallet and chain before submitting again. ${msg}`
      : msg;
    // Invalidate a timed-out restore so its eventual completion cannot install
    // a signer after this operation has already failed.
    if (!broadcastAttempted && pendingWork.promise && revision === sessionRevision) sessionRevision += 1;
    return { ok: false, broadcastAttempted, ...(txHash ? { txHash } : {}), error: trace.length ? `${outcome} | ${trace.join(' -> ')}` : outcome };
  } finally {
    if (pendingWork.promise) {
      const release = () => { transferInFlight = false; };
      pendingWork.promise.then(release, release);
    } else {
      transferInFlight = false;
    }
  }
}

export const __webauthInternals = {
  buildCallbackUrl,
  parseCallback,
  CHAIN_ID,
  CHAIN_API,
  CALLBACK_PATH,
};
