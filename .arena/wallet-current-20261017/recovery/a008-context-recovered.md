Не удалось подтвердить запись `r0/a008.md`: исполнитель файловых операций потерял соединение. До сбоя успешно сохранены:

- `.arena/wallet-current-20261017/scratch/a008/repair.patch`
- `.arena/wallet-current-20261017/scratch/a008/transfer.test.mjs`
- `.arena/wallet-current-20261017/scratch/a008/webauth.before.ts`
- `.arena/wallet-current-20261017/scratch/a008/webauth.after.ts`
- `.arena/wallet-current-20261017/scratch/a008/red.log`
- `.arena/wallet-current-20261017/scratch/a008/green.log`

Ниже самостоятельная поставка на случай, если запись итогового файла не восстановится.

После этого изменения один вызов native-перевода отправляет не более одного запроса с `broadcast:true` и заранее отклоняет другую сеть либо permission. Это узкий ремонт текущего кандидата, а не заявление о работоспособности всего кошелька. Обратная сторона решения: устаревшая сессия требует отдельного подключения и выяснения судьбы предыдущей операции; автоматическое восстановление уступает защите от повторной оплаты.

Допущения: источник — указанный GitHub commit `f91c3cb8586f453b298aab5074f41436e7db9840`; сеть — Testnet. Свежего device trace и SHA установленного приложения нет. Ограничения AGENTS.md сохранены: JWT, verified binding и signable SDK session различаются. Приложение не изменялось.

В `apps/mobile/lib/webauth.ts`, `signTransfer`, после ошибки `link.transact(..., {broadcast:true})` catch классифицирует текст по `/does not have signatures|unsatisfied|missing.*signature/i`, подключает SDK заново и инициирует второй broadcast той же action. Транспортная ошибка не доказывает отсутствие первого перевода. Кроме того, action создаётся до переподключения, а новая identity не проверяется. Первый запрос сравнивает actor, но незаметно использует SDK permission вместо переданного `fromPermission`. Проверки `session.chainId` перед оплатой также нет.

Исправление удаляет автоматический повтор, проверяет сеть и permission до action и передаёт SDK chain явно. Успешный путь сохраняет hash и существующий `SignResult`. Ownership verification, серверные ограничения, KYC и escrow не ослабляются.

`packages/wallet-proof/request-proof.mjs` уже использует disposable transaction, `broadcast:false`, `noModify:true`, сравнение точных байтов и повторную проверку identity. Native ownership adapter уже вызывает parent `link.transact`. Повторно реализовывать этот протокол или заменять identity на неподтверждённый `reqauth` не требуется. Sign-only эксперимент не доказывает текущий вход приложения или приём платежа.

Локальные регрессии используют настоящий TypeScript-модуль, транспилированный установленным TypeScript в VM. Подменены внешние SDK/storage импорты; RPC, БД и кошелёк не вызываются. На исходнике: **2/7 PASS**, пять ожидаемых падений. После исправления: **7/7 PASS**. Проверяются три signature-like ошибки, обычный обрыв соединения, permission/network mismatch и успешное получение hash. Это adapter orchestration evidence, не physical-device acceptance.

Остаются отдельные подтверждённые блокеры. `payments.ts::requestPayment` симулирует оплату при отсутствующем endpoint даже с `DEMO_MODE=false`. `livePayment` объявляет успех при любом `second.ok`, хотя серверный lead-token route возвращает HTTP 200 с `pending:true`. При ошибке verification catch теряет уже полученный hash. Следовательно, receipt recovery и UI повторной оплаты ещё нельзя принимать. Серверный reconciler следует использовать для установления результата; новый перевод не является восстановлением предыдущего. USD display не меняет XPR settlement amount.

Интеграция требует frontend ownership, независимого QA и review точного финансового patch. Не следует переносить все 482 коммита ветки. После переноса нужны mobile typecheck, проверка точного APK SHA/API origin и отдельная device-приёмка. Rollback не должен возвращать автоматический broadcast retry: при необходимости отключается платёжный вход до безопасного кандидата.

Открытые device gates: desktop/Android login и verified linking отдельно; cold restore; actor/permission/network switch; cancellation и поздний callback; двойное нажатие; expiry/replay/concurrent challenges; сохранение hash до verification и pending→confirmed/rejected reconciliation. Production deploy этим результатом не разрешается.

Точная замена `signTransfer` в `apps/mobile/lib/webauth.ts`:

```ts
export async function signTransfer(args: TransferArgs): Promise<SignResult> {
  const trace: string[] = [];
  try {
    if (!currentSession) {
      debugTransfer(args, trace, 'Loading stored WebAuth session');
      await loadWebauthSession();
    }
    const from = args.fromAccount ?? currentSession?.account;
    const permission =
      args.fromPermission ?? currentSession?.permission ?? 'active';
    if (!from) {
      throw new Error('No WebAuth session — call connectWallet() first');
    }
    debugTransfer(args, trace, `Preparing transfer as ${from}@${permission}`);

    let link: ProtonLink | null = protonLink;
    let session: LinkSession | null = protonSession;
    if (!link || !session) {
      try {
        debugTransfer(args, trace, 'Restoring Proton Link session');
        session = await withTimeout(
          connectWithProtonNativeSdk(true),
          90_000,
          'Proton Link session restore',
        );
        link = protonLink;
      } catch (restoreErr) {
        debugTransfer(
          args, trace,
          `Restore failed: ${describeError(restoreErr)}; re-authenticating`,
        );
        session = await withTimeout(
          connectWithProtonNativeSdk(false),
          90_000,
          'Proton Link re-login',
        );
        link = protonLink;
      }
    }
    if (!link) {
      throw new Error('No Proton Link session');
    }
    if (!session || String(session.chainId) !== CHAIN_ID) {
      throw new Error('WebAuth signing session is missing or on the wrong network');
    }
    if (String(session.auth.permission) !== permission) {
      throw new Error(
        `Payment permission must be ${permission}; reconnect the linked wallet`,
      );
    }

    const signerAccount = session?.auth?.actor
      ? String(session.auth.actor) : from;
    const signerPermission = session?.auth?.permission
      ? String(session.auth.permission) : permission;
    if (from && signerAccount !== from) {
      throw new Error(
        `Payment must be signed by your linked wallet ${from}, but WebAuth is using ${signerAccount}. ` +
        'To switch accounts: open Profile -> Disconnect wallet -> Connect WebAuth and pick the account you want.',
      );
    }
    const action = {
      account: 'eosio.token',
      name: 'transfer',
      authorization: [{ actor: signerAccount, permission: signerPermission }],
      data: {
        from: signerAccount,
        to: args.recipient,
        quantity: args.amount,
        memo: args.memo ?? '',
      },
    };
    debugTransfer(args, trace, 'Opening Proton Link transaction request');
    // One explicit approval must never trigger a second broadcast automatically.
    // A transport error can arrive after acceptance; preserve it for reconciliation.
    const result = await withTimeout(
      link.transact(
        { actions: [action] },
        { broadcast: true, chain: session!.chainId },
      ),
      180_000,
      'WebAuth transaction',
    );
    const txHash = extractTxHash(result);
    if (!txHash) {
      throw new Error('WebAuth did not return tx id');
    }
    return { ok: true, txHash };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown signing error';
    return {
      ok: false,
      error: trace.length ? `${msg} | ${trace.join(' -> ')}` : msg,
    };
  }
}
```

Полный regression для `tests/mobile-transfer-safety.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(
  process.env.WALLET_SOURCE || 'apps/mobile/lib/webauth.ts', 'utf8',
);
const chain =
  '71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd';

function fixture({ permission = 'active', network = chain, error } = {}) {
  let broadcasts = 0, pairings = 0;
  const link = {
    transact: async () => {
      broadcasts++;
      if (error) throw new Error(error);
      return { processed: { id: 'a'.repeat(64) } };
    },
  };
  const exports = {};
  const modules = {
    'expo-linking': {},
    'react-native': {},
    './storage': { safeStorage: { setItem: async () => {} } },
    '@proton/signing-request': {},
    '@proton/link': {},
    '@proton/react-native-sdk': {
      __esModule: true,
      default: async () => {
        pairings++;
        return {
          link,
          session: {
            auth: { actor: 'alice', permission },
            chainId: network,
          },
        };
      },
    },
    '../../../packages/wallet-proof/request-proof.mjs': {},
  };
  const context = vm.createContext({
    exports,
    require: name => {
      assert.ok(name in modules, `unexpected import ${name}`);
      return modules[name];
    },
    setTimeout,
    clearTimeout,
    process: { env: {} },
  });
  vm.runInContext(ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText, context);
  return {
    exports,
    broadcasts: () => broadcasts,
    pairings: () => pairings,
  };
}

for (const error of [
  'does not have signatures',
  'unsatisfied authority',
  'missing required signature',
  'connection lost',
]) {
  test(`one broadcast even after ${error}`, async () => {
    const f = fixture({ error });
    await f.exports.connectWallet();
    const result = await f.exports.signTransfer({
      recipient: 'bob',
      amount: '1.0000 XPR',
      fromAccount: 'alice',
      fromPermission: 'active',
    });
    assert.equal(result.ok, false);
    assert.equal(f.broadcasts(), 1);
    assert.equal(f.pairings(), 1);
  });
}

for (const options of [
  { permission: 'owner' },
  { network: '0'.repeat(64) },
]) {
  test(`reject identity mismatch ${JSON.stringify(options)}`, async () => {
    const f = fixture(options);
    await f.exports.connectWallet();
    const result = await f.exports.signTransfer({
      recipient: 'bob',
      amount: '1.0000 XPR',
      fromAccount: 'alice',
      fromPermission: 'active',
    });
    assert.equal(result.ok, false);
    assert.equal(f.broadcasts(), 0);
  });
}

test('matching identity sends once and retains hash', async () => {
  const f = fixture();
  await f.exports.connectWallet();
  const result = await f.exports.signTransfer({
    recipient: 'bob',
    amount: '1.0000 XPR',
    fromAccount: 'alice',
    fromPermission: 'active',
  });
  assert.equal(result.ok, true);
  assert.equal(result.txHash, 'a'.repeat(64));
  assert.equal(f.broadcasts(), 1);
});
```

Запуск из корня:

```bash
node --test tests/mobile-transfer-safety.test.mjs
```
