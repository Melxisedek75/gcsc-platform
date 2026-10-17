Готов ограниченный ремонт текущего кандидата `f91c3cb8586f453b298aab5074f41436e7db9840`. Он устраняет подтверждённые ошибки связывания аккаунта и опасное поведение платёжного клиента. Это не доказательство работоспособности установленного APK или опубликованного сайта.

Подтверждённые причины:

| Код | Дефект |
|---|---|
| `apps/web/src/pages/Wallet.tsx`, `WalletPanel.tsx` | После SDK pairing вызывается старый `api.connectWallet` без подписанного challenge. Восстановление сессии также пытается сохранить pairing metadata. |
| `apps/mobile/lib/webauth.ts::signTransfer` | После ошибок `unsatisfied`/`missing signature` выполняется повторный `broadcast:true`. Проверяется аккаунт, но не точное разрешение и сеть. |
| `apps/mobile/lib/payments.ts::requestPayment` | Отсутствующий endpoint запускает симуляцию с успешным фиктивным чеком. |
| `payments.ts::livePayment` | Любой HTTP 200 считается подтверждением, хотя сервер возвращает `pending:true`. Хеш теряется при ошибке проверки; Retry способен начать новый перевод. |
| `payments.ts::livePayment` | HTTP 403 сбрасывает JWT, хотя сервер использует его для запрета операции по роли. |
| `binding-client.mjs`, mobile `auth.ts` | После отмены или смены application session запоздавший результат binding может попасть в интерфейс и сохранение профиля. |

Существующий nonce-bearing sign-only proof сохраняется. Сервер уже имеет challenge/login/link маршруты, durable challenge store, проверку актуальной authority и атомарное `DELETE … RETURNING` PostgreSQL. Нет причины заменять их неподдержанным `signMessage` или identity metadata. Пробный Pixel 8 результат 25 сентября подтверждает K1, 490 точных байт и parent transport; он не подтверждает application login или оплату.

Подготовленные исправления уже сохранены как **полные точные версии файлов**, относительно корня:

`/workspace/scratch/68329eaed702/gcsc-platform-current/.arena/wallet-current-20261017/scratch/a003/`

| Подготовленный файл | Назначение при применении |
|---|---|
| `apps/mobile/lib/payments.ts` | Полная замена одноимённого application файла |
| `apps/mobile/lib/webauth.ts` | Полная версия с исправленным `signTransfer` |
| `apps/mobile/lib/auth.ts` | Проверка application session вокруг binding |
| `packages/wallet-proof/binding-client.mjs` | Проверка отмены после verify |
| `apps/web/src/services/walletBinding.ts` | Новый модуль |
| `apps/web/src/services/api.ts` | Тип verified binding и два существующих ownership API endpoint |
| `apps/web/src/pages/Wallet.tsx` | Явное verified binding; restore не сохраняет metadata |
| `apps/web/src/pages/dashboard/WalletPanel.tsx` | Использует новый binding consumer |
| `tests/wallet-payment-safety.test.mjs` | Полные 19 регрессий |

Ниже ключевые точные изменения; подготовленные полные файлы являются источником применения.

```diff
--- a/packages/wallet-proof/binding-client.mjs
+++ b/packages/wallet-proof/binding-client.mjs
@@
       const response = await verify({ accountName, permission, proof });
+      if (signal?.aborted) fail('wallet_binding_cancelled');
       if (!response?.user?.wallet || response.user.wallet.verified !== true) {
```

```diff
--- a/apps/mobile/lib/auth.ts
+++ b/apps/mobile/lib/auth.ts
@@
-import { apiRequest, AuthUser, clearSession, normalizeUser, saveSession, UserRole } from './api';
+import { apiRequest, AuthUser, clearSession, getCurrentUser, getToken, normalizeUser, saveSession, UserRole } from './api';
@@
 export async function bindWallet(signal?: AbortSignal): Promise<AuthUser> {
-  return normalizeUser(await walletBinding({ signal }));
+  const token = getToken();
+  const userId = getCurrentUser()?.id;
+  if (!token || userId == null) throw new Error('wallet_binding_app_session_missing');
+  const updated = await walletBinding({ signal });
+  if (getToken() !== token || getCurrentUser()?.id !== userId || updated.id !== userId) {
+    throw new Error('wallet_binding_app_session_changed');
+  }
+  return normalizeUser(updated);
 }
```

В `webauth.ts::signTransfer` блок определения signer заменён следующим:

```ts
if (!session || String(session.chainId) !== CHAIN_ID) {
  throw new Error('wallet_payment_wrong_network');
}
const signerAccount = String(session.auth.actor);
const signerPermission = String(session.auth.permission);
if (signerAccount !== from || signerPermission !== permission) {
  throw new Error('wallet_payment_session_changed: reconnect the linked account and permission');
}
```

Весь внутренний retry-блок `let result; try { … } catch (txErr) { … }` заменён одним вызовом:

```ts
// An SDK rejection is not proof that no broadcast occurred. A user may
// explicitly reconnect later; this operation must never submit twice.
const result = await withTimeout(
  link.transact({ actions: [action] }, { broadcast: true }),
  180_000,
  'WebAuth transaction; outcome may be unknown',
);
```

Полная новая версия `apps/mobile/lib/payments.ts`:

```ts
// XPR testnet settlement. USD display is not a settlement instruction.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signTransfer as webauthSignTransfer } from './webauth';
import { getToken, clearSession, getCurrentUser } from './api';
import { getApiUrl } from './api-config';

export class SessionExpiredError extends Error {
  constructor() {
    super('Your session has expired. Please sign in again.');
    this.name = 'SessionExpiredError';
  }
}
export type PaymentMode = 'charge' | 'session';
export interface PaymentRequest {
  mode: PaymentMode;
  amount: string;
  recipient: string;
  memo?: string;
  endpoint?: string;
  meta?: Record<string, unknown>;
}
export interface PaymentReceipt {
  ok: boolean;
  txHash?: string;
  amount: string;
  recipient: string;
  timestamp: number;
  error?: string;
}
export type PaymentStage =
  | 'idle'
  | 'requesting'
  | 'awaiting_signature'
  | 'broadcasting'
  | 'verifying'
  | 'confirmed'
  | 'failed';
export interface PaymentProgress {
  stage: PaymentStage;
  detail: string;
}

const ATTEMPT_KEY = '@gcsc/payment-attempt/v1';
const HASH = /^[a-f0-9]{64}$/;
let busy = false;
let storageUncertain = false;
type Attempt = { version: 1; context: string; txHash?: string };

async function durable<T>(operation: Promise<T>): Promise<T> {
  if (storageUncertain) {
    throw new Error('payment_storage_uncertain: restart before reconciliation');
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('payment_storage_timeout')),
          5000,
        );
      }),
    ]);
  } catch (error) {
    // An operation may still complete late; do not start competing writes.
    storageUncertain = true;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function post(
  endpoint: string,
  token: string,
  meta: unknown,
  txHash?: string,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(txHash ? { 'X-Payment-Tx': txHash } : {}),
      },
      body: meta == null ? undefined : JSON.stringify(meta),
    });
    const body = await response.json();
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

export async function requestPayment(
  req: PaymentRequest,
  onProgress: (p: PaymentProgress) => void,
): Promise<PaymentReceipt> {
  const base = {
    amount: req.amount,
    recipient: req.recipient,
    timestamp: Date.now(),
  };
  const emit = (stage: PaymentStage, detail: string) => {
    try {
      onProgress({ stage, detail });
    } catch {
      // UI must not interrupt settlement state.
    }
  };
  if (busy) {
    return { ...base, ok: false, error: 'payment_request_pending' };
  }
  busy = true;
  let txHash: string | undefined;
  try {
    if (storageUncertain) throw new Error('payment_storage_uncertain');
    req = {
      ...req,
      meta: req.meta == null
        ? undefined
        : JSON.parse(JSON.stringify(req.meta)),
    };
    if (!req.endpoint) throw new Error('payment_endpoint_required');

    const token = getToken();
    const user = getCurrentUser();
    const wallet = user?.wallet;
    const account = wallet?.account || wallet?.accountName;
    const permission = wallet?.permission;
    if (!token || !user || wallet?.verified !== true ||
        !account || !permission) {
      throw new Error('verified_wallet_required');
    }

    const endpoint = getApiUrl(req.endpoint);
    const meta = req.meta;
    const memo = req.memo ?? '';
    const context = JSON.stringify([
      endpoint, user.id, account, permission,
      req.amount, req.recipient, memo, meta,
    ]);
    const assertCurrent = () => {
      const current = getCurrentUser();
      const currentWallet = current?.wallet;
      if (getToken() !== token ||
          current?.id !== user.id ||
          currentWallet?.verified !== true ||
          (currentWallet.account || currentWallet.accountName) !== account ||
          currentWallet.permission !== permission) {
        throw new Error('payment_app_session_changed');
      }
    };

    const raw = await durable(AsyncStorage.getItem(ATTEMPT_KEY));
    let attempt: Attempt | null = raw == null ? null : JSON.parse(raw);
    if (raw !== null && (!attempt || typeof attempt !== 'object')) {
      throw new Error('payment_journal_invalid');
    }
    if (attempt) {
      if (attempt.version !== 1 ||
          typeof attempt.context !== 'string' ||
          (attempt.txHash !== undefined && !HASH.test(attempt.txHash))) {
        throw new Error('payment_journal_invalid');
      }
      if (attempt.context !== context) {
        throw new Error('payment_outstanding: reconcile the previous payment');
      }
      if (!attempt.txHash) {
        throw new Error('payment_outcome_unknown: reconcile before paying again');
      }
      txHash = attempt.txHash;
    } else {
      emit('requesting', 'Contacting payment endpoint…');
      const first = await post(endpoint, token, meta);
      if (first.response.status === 401) {
        if (getToken() === token) await clearSession();
        throw new SessionExpiredError();
      }
      if (first.response.status !== 402) {
        throw new Error(`Payment unavailable: ${first.response.status}`);
      }

      // Never redirect approved terms using an unpinned 402.
      const expected =
        `Payment recipient="${req.recipient}" amount="${req.amount}" memo="${memo}"`;
      if (first.response.headers.get('WWW-Authenticate') !== expected) {
        throw new Error('payment_challenge_mismatch');
      }
      assertCurrent();
      attempt = { version: 1, context };

      // Native durable storage, not safeStorage's in-memory fallback.
      await durable(AsyncStorage.setItem(
        ATTEMPT_KEY, JSON.stringify(attempt),
      ));
      assertCurrent();

      emit(
        'awaiting_signature',
        'Approve in WebAuth; uncertain outcomes require reconciliation',
      );
      const result = await webauthSignTransfer({
        recipient: req.recipient,
        amount: req.amount,
        memo,
        fromAccount: account,
        fromPermission: permission,
      });
      if (!result.ok || !result.txHash || !HASH.test(result.txHash)) {
        throw new Error(result.error || 'payment_outcome_unknown');
      }
      txHash = result.txHash;
      attempt.txHash = txHash;
      await durable(AsyncStorage.setItem(
        ATTEMPT_KEY, JSON.stringify(attempt),
      ));
    }

    assertCurrent();
    emit('verifying', 'Checking the existing transaction; no new transfer');
    const second = await post(endpoint, token, meta, txHash);
    assertCurrent();

    // HTTP 200 may mean pending. 409 never proves ownership/status.
    if (!second.response.ok ||
        second.body?.pending !== false ||
        second.body?.tx_hash !== txHash) {
      throw new Error(
        `payment_reconciliation_required: ${second.response.status}`,
      );
    }
    await durable(AsyncStorage.removeItem(ATTEMPT_KEY));
    emit('confirmed', `Confirmed · ${txHash}`);
    return { ...base, ok: true, txHash };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment failed';
    emit('failed', message);
    return { ...base, ok: false, txHash, error: message };
  } finally {
    busy = false;
  }
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
```

Новый `apps/web/src/services/walletBinding.ts`:

```ts
import { createWalletBinding } from '../../../../packages/wallet-proof/binding-client.mjs'
import { api, type GcscUser } from './api'
import {
  connectWebAuthSession,
  signWebAuthOwnershipChallenge,
  type WebAuthSigningSession,
} from './webauth'

const CHAIN_ID =
  '71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd'
let pending = false

export async function bindWebAuthToProfile(
  signal?: AbortSignal,
): Promise<{
  user: GcscUser
  wallet: NonNullable<GcscUser['wallet']>
}> {
  if (pending) throw new Error('wallet_binding_request_pending')
  const token = api.getToken()
  if (!token) throw new Error('wallet_binding_app_session_missing')
  pending = true
  let session: WebAuthSigningSession | null = null

  const assertCurrent = () => {
    if (api.getToken() !== token) {
      throw new Error('wallet_binding_app_session_changed')
    }
  }

  try {
    const bind = createWalletBinding<GcscUser>({
      connect: async () => {
        const connected = await connectWebAuthSession({
          restoreSession: false,
          chainId: CHAIN_ID,
          endpoints: [
            import.meta.env.VITE_XPR_TESTNET_RPC_URL ||
              'https://testnet-api.alvosec.com',
          ],
        })
        assertCurrent()
        if (!connected) return null
        if (connected.session.chainId !== CHAIN_ID) {
          throw new Error('wallet_binding_wrong_network')
        }
        session = connected.session
        return {
          account: connected.wallet.accountName,
          permission: connected.wallet.permission,
        }
      },
      issueChallenge: body => {
        assertCurrent()
        return api.walletOwnershipChallenge(body)
      },
      sign: (challenge, abort) => {
        assertCurrent()
        if (!session) throw new Error('wallet_binding_session_missing')
        return signWebAuthOwnershipChallenge(session, challenge, abort)
      },
      verify: body => {
        assertCurrent()
        return api.walletOwnershipVerify(body)
      },
    })
    const user = await bind({ signal })
    assertCurrent()
    if (!user.wallet || user.wallet.verified !== true) {
      throw new Error('wallet_binding_response_invalid')
    }
    return { user, wallet: user.wallet }
  } finally {
    pending = false
  }
}
```

Точные дополнения API:

```diff
--- a/apps/web/src/services/api.ts
+++ b/apps/web/src/services/api.ts
@@
 export interface GcscWallet {
+  verified?: boolean
+  verifiedAt?: string
@@
-  getConnectedWallet() {
+  walletOwnershipChallenge(body: { accountName: string; permission: string }): Promise<OwnershipChallenge> {
+    return this.request('/wallet/ownership/challenge', { method: 'POST', body: JSON.stringify(body) })
+  }
+  walletOwnershipVerify(body: { accountName: string; permission: string; proof: OwnershipProof }): Promise<{ user: GcscUser }> {
+    return this.request('/wallet/ownership/verify', { method: 'POST', body: JSON.stringify(body) })
+  }
+  getConnectedWallet() {
```

Точные изменения web consumers:

```diff
--- a/apps/web/src/pages/Wallet.tsx
+++ b/apps/web/src/pages/Wallet.tsx
@@
 import { connectWebAuthWallet, restoreWebAuthWallet } from '../services/webauth'
+import { bindWebAuthToProfile } from '../services/walletBinding'
@@
-            const saved = await api.connectWallet(restored)
-            if (!mounted) return
-            setUser(saved.user)
-            setWallet(saved.wallet)
-            setStatus('Restored WebAuth session and saved it to your GCSC account.')
+            setStatus('WebAuth session found locally. Connect WebAuth to verify ownership for this profile.')
@@
-      const connected = await connectWebAuthWallet()
       if (user) {
-        const response = await api.connectWallet(connected)
+        const response = await bindWebAuthToProfile()
@@
       } else {
+        const connected = await connectWebAuthWallet()
         setWallet({ ...connected })
--- a/apps/web/src/pages/dashboard/WalletPanel.tsx
+++ b/apps/web/src/pages/dashboard/WalletPanel.tsx
@@
-import { api, type GcscUser } from '../../services/api';
-import { connectWebAuthWallet } from '../../services/webauth';
+import { type GcscUser } from '../../services/api';
+import { bindWebAuthToProfile } from '../../services/walletBinding';
@@
-      const webauthWallet = await connectWebAuthWallet();
-      const response = await api.connectWallet(webauthWallet);
+      const response = await bindWebAuthToProfile();
```

Фактическая проверка: первые 15 регрессий против исходных файлов дали **0/15 PASS**, изолированные подготовленные версии — **15/15 PASS**. После добавления web consumer/contract проверок итоговый сохранённый прогон дал **19/19 PASS**, без skipped. Проверки выполняют настоящие функции из TypeScript через transpile/VM со stub SDK, HTTP и storage; сеть и база не используются. Это не device evidence.

Покрыты отсутствие endpoint, 403, unverified metadata, подмена 402, отказ durable storage, `pending:true`, потерянный HTTP-ответ, восстановление известного хеша, неизвестный исход после рестарта, повреждённый journal, двойное нажатие, другая permission/network, отсутствие повторного broadcast, отмена binding, смена JWT и web ownership routing. Сохранены `green.log`, `red.log`, `types.log`, `web-types.log`. Semantic overlay web изменённых файлов: **0 diagnostics**. Mobile overlay: **7 ранее существовавших diagnostics**, **0 новых**; полный mobile type gate остаётся открытым.

Journal сознательно не удаляется при неизвестном исходе. Известный хеш позволяет повторить только HTTP-проверку. Если сервер уже записал receipt и отвечает 409, либо SDK не вернул хеш, требуется отдельная доверенная reconciliation: текущий API не предоставляет достаточного authenticated receipt-status lookup для автоматического завершения этого случая. Обходить этот gate удалением journal или новым переводом нельзя. Отмена после server verify также не откатывает уже выполненную серверную привязку: следующий profile refresh должен показать её фактическое состояние.

Применение — отдельный worktree от указанного SHA, без объединения всех 482 коммитов. Frontend владелец принимает consumers, backend/packages владелец — shared cancellation change, QA независимо проверяет итоговый diff и сохранённые регрессии. Затем обязательны текущие wallet suites, web build, mobile types и review точного combined SHA. Rollback не должен удалять unresolved payment journal или возвращать автоматический rebroadcast.

Открыты пользовательские проверки desktop и Android: свежий login, binding после email login, холодный запуск, отмена, смена сети/account/permission, late callback, текущая authority, K1 и неподдержанный формат подписи, pending/reconciled receipt. Нужны SHA опубликованного backend/web и встроенного APK bundle. Само наличие 59 маршрутов и 7/7 entrypoints не заменяет эти проверки.

Финальный `r0/a003.md` не удалось завершить и проверить из-за отключения `exec-server transport`; попытка записи была остановлена. Подготовленные исходники, 19 тестов и результаты были успешно сохранены до сбоя. Не считать возможный частичный `a003.md` готовым результатом.
