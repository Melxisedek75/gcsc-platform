Не удалось подтвердить запись `r0/a009.md`: exec-server отключился. Ниже самостоятельное предложение. До отключения созданы `scratch/a009/webauth.original.ts`, `webauth.patched.ts` и `wallet-transfer-safety.test.mjs`; запуск теста не завершился, red/green не заявляю.

Предлагаю узкое исправление текущего `f91c3cb8586f453b298aab5074f41436e7db9840`: убрать автоматический повтор broadcast и проверить permission/network восстановленного SDK. Это исправление конкретной опасной ветки, а не подтверждение исправности всего кошелька.

Предположение: verified профиль задаёт ожидаемые account/permission; восстановленный signable SDK должен соответствовать им. Переподключение после ошибки требует отдельного пользовательского действия.

1. `apps/mobile/lib/webauth.ts::signTransfer` после `transact(..., {broadcast:true})` распознаёт текст `does not have signatures|unsatisfied|missing.*signature`, заново подключает WebAuth и **повторяет broadcast**. Текст SDK-ошибки не доказывает отсутствие первого перевода. Кроме того, второй запрос использует action, построенную до нового pairing.
2. Та же функция после restore/re-login проверяет только account. Восстановленный permission `owner` вместо ожидаемого `active` либо другая chain проходят локальный барьер.
3. Существующий proof сохраняем: `request-proof.mjs` уже передаёт disposable transaction copy, сверяет identity и запрещает broadcast; native ownership adapter использует parent link. Pixel8-проба 25 сентября с 490 точными байтами и K1 не доказывает приложение целиком. Wallet-first и ownership маршруты уже присутствуют.

Точная замена всей функции `signTransfer` в `apps/mobile/lib/webauth.ts`:
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
          args,
          trace,
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
    if (!link || !session) {
      throw new Error('No Proton Link session');
    }
    if (String(session.chainId) !== CHAIN_ID) {
      throw new Error('Payment wallet is on the wrong network');
    }

    const signerAccount = session.auth?.actor
      ? String(session.auth.actor)
      : from;
    const signerPermission = session.auth?.permission
      ? String(session.auth.permission)
      : permission;
    if (signerAccount !== from || signerPermission !== permission) {
      throw new Error(
        `Payment must be signed by your linked wallet ${from}@${permission}, ` +
        `but WebAuth is using ${signerAccount}@${signerPermission}. ` +
        'To switch accounts: open Profile -> Disconnect wallet -> Connect WebAuth ' +
        'and pick the account you want.',
      );
    }
    const action = {
      account: 'eosio.token',
      name: 'transfer',
      authorization: [{
        actor: signerAccount,
        permission: signerPermission,
      }],
      data: {
        from: signerAccount,
        to: args.recipient,
        quantity: args.amount,
        memo: args.memo ?? '',
      },
    };
    debugTransfer(args, trace, 'Opening Proton Link transaction request');

    // A broadcast error is not proof that no transfer occurred.
    const result = await withTimeout(
      link.transact(
        { actions: [action] },
        { broadcast: true, chain: CHAIN_ID },
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

Подготовленная узкая регрессия `scratch/a009/wallet-transfer-safety.test.mjs` извлекает настоящую функцию через TypeScript AST, выполняет её в VM с заглушками SDK и считает вызовы transact/pairing. Она не импортирует API, не использует DATABASE_URL/gcsc.db и не обращается к сети.

Обязательные ожидания:

| Сценарий | Ожидается |
|---|---|
| Три ошибки подписи, совпадающие с прежним regex | Один transact, ноль pairing, `ok:false` |
| Timeout после запроса broadcast | Один transact, ноль pairing |
| Restore другого account | Ноль transact |
| Restore другого permission | Ноль transact |
| Restore другой chain | Ноль transact |
| Совпадающая SDK identity | Один transact, исходный txHash |

Исходник должен провалить пять случаев: три автоматических повтора, permission и chain. Исправленная копия должна пройти восемь. Это ожидаемые результаты: отключение exec-server прервало проверку. Выполнить тест с `TRANSFER_SOURCE`, указывающим сначала на оригинальную, затем на исправленную scratch-копию. При переносе теста в корневой `tests/` заменить scratch-specific `createRequire` на обычный импорт `typescript`, а путь исходника — на `../apps/mobile/lib/webauth.ts`.

Консервативный выбор увеличивает число явных переподключений, зато один вызов функции больше не создаёт второй broadcast. Он не устраняет параллельные вызовы, ручной Retry, restart или неопределённый исход после timeout.

Есть отдельные подтверждённые платёжные блокеры: `payments.ts::livePayment` считает любой HTTP 200 подтверждением, хотя `/api/payment/lead-token` возвращает 200 с `pending:true`; при ошибке проверки теряется известный txHash; `PaymentSheet` предлагает Retry. Отсутствующий endpoint включает simulation несмотря на `DEMO_MODE=false`. До платёжной приёмки нужны durable intent/txHash, состояния pending/unknown и reconciliation существующего чека. Повторное получение receipt не должно инициировать новый перевод. HTTP 409 «уже обработано» само по себе не доказывает принадлежность и подтверждение чека. USD-интерфейс остаётся отдельным от XPR settlement.

Frontend lane применяет только этот diff в отдельном worktree текущего кандидата. Coordinator и независимый reviewer проверяют окончательный diff, focused tests и mobile types. Не сливать 482 коммита ради этой правки. Rollback — отдельный revert с сохранением истории; платёжный сценарий остаётся закрыт до проверки, поскольку возврат старого автоматического повтора небезопасен.

Контроль требований: текущий источник и приоритет прочитаны; конкретный код предложен; существующие proof/routes и ownership/KYC/escrow проверки сохранены; тест подготовлен, запуск заблокирован средой; production, реальные подписи и платежи не выполнялись. Отдельно остаются web/native проверки connect, login/link, account/permission/network switching, cancellation/late callback, challenge expiry/replay/concurrency, restore и receipt reconciliation. Последний gate — точный deployed SHA и пользовательские desktop/Android трассы. Без них нельзя объяснить все месяцы сбоев или объявлять кошелёк исправленным.
