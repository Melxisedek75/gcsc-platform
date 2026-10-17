Подготовлен узкий ремонт текущего кандидата f91c3cb8586f453b298aab5074f41436e7db9840. Исправление относится к текущей integration-ветке, не к историческому main. Это кандидат исходного кода; работоспособность всего кошелька и production не подтверждены. Предположение: приложение действительно собирается из этого кандидата. Установленный APK, deployed SHA и API origin неизвестны.

Подтверждённые причины: apps/mobile/lib/webauth.ts:signTransfer после ошибки с missing.*signature переподключает SDK и повторяет broadcast:true. Текст исключения не доказывает отсутствие отправки. В локальном воспроизведении один вызов сделал два transact. Метод сравнивает actor с профилем, но принимает permission SDK вместо запрошенного и не проверяет chainId. Синтетические owner/mainnet-сессии доходили до transact.

connectWithProtonNativeSdk изменяет модульные ссылки после завершения SDK. Внешний withTimeout не отменяет SDK. После timeout или clearSession позднее завершение восстанавливало отключённую сессию, а второй вызов открывал ещё один pairing. Простое снятие pending в finally внешнего timeout эту ошибку усугубляет.

Отдельно подтверждено в payments.ts:livePayment: любой успешный HTTP ответ объявляется подтверждением, хотя текущий pure-server.js:POST /api/payment/lead-token возвращает HTTP200 с pending:true и lead_status:pending_verification. Клиент также принимает отличающиеся условия 402, теряет txHash при verification-error, а отсутствие endpoint запускает имитацию даже при DEMO_MODE=false. Native patch ниже не исправляет эти отдельные потребительские ошибки; до разрешения денежных сценариев они остаются обязательными gates.

Существующий proof не заменяется. В request-proof.mjs уже есть disposable transaction copy, запрет broadcast, exact-byte/session/expiry checks и single-flight до завершения SDK. wallet-challenge-store.cjs уже делает PostgreSQL DELETE RETURNING по полному контексту; migration уже создаёт таблицу. Это не отсутствующие маршруты. Историческая таблица WALLET-API-CONTRACT с отсутствующим wallet-first login устарела относительно фактических web/mobile imports. Pixel8-запись25сентября подтверждает K1,490байт и parent ProtonLink sign-only transport; она не подтверждает текущие HTTP login, JWT, binding или платежи. SIG_WA остаётся отдельным capability gate, подпись не ослабляется.

Исправление выбирает безопасность вместо автоматического восстановления денежной операции. Pairing сериализован до фактического завершения SDK; generation отделяет поздний результат от актуальной сессии. Restore ошибки требуют отдельного reconnect. Перевод сверяет actor/permission/chain, а любой неопределённый broadcast блокирует последующие попытки в текущем процессе. Это сознательно может заблокировать повтор даже после пользовательского отказа: произвольное SDK-исключение нельзя считать доказанным отсутствием broadcast.

Пять враждебных сценариев проверены поведением транспилированного настоящего mobile-модуля со строго подменёнными импортами: signature-shaped ошибка после transact; чужой permission/network; параллельные переводы и timeout с поздним результатом; disconnect во время pairing; timeout pairing с повторным вызовом и поздним success. Исходник:5FAIL/1PASS. Подготовленная копия с исправлением:6PASS,0skipped. Отдельные payment-тесты подтвердили описанные потребительские дефекты: исходник5FAIL/1PASS, исправленная экспериментальная копия6PASS. Это не доказательство готовности денежных сценариев. DB,RPC,реальные ключи и кошельки не использовались. Typecheck не зелёный:9diagnostics о process/implicit-any; сравнение полного baseline/delta прервано недоступностью runtime. Приёмку типов нужно повторить.

Существенное ограничение: quarantine ниже хранится в памяти. Он не защищает после перезапуска процесса. До денежных сценариев необходим журнал неопределённого платежа с fail-closed записью до transact, сохранением известного hash и повторной проверкой этого hash без новой подписи. Существующий safeStorage допускает memory fallback и не является надёжным денежным журналом. Pending200 должен оставаться pending; receipt-error не должен предлагать повторную оплату; отсутствие endpoint должно завершаться ошибкой. Эти gates не снимаются данным patch.

Интегрировать только узкий diff через frontend lane, согласовать денежный потребитель с backend и получить независимое ревью окончательного SHA. Не переносить482коммита целиком. Повторить focused regression, mobile typecheck, wallet proof/login/restore и web build. На desktop/Android подтвердить отдельно JWT/profile/signable-session, account/permission/network switch, cancel, expired/replayed/concurrent challenge и late callback. Сверить установленный SHA/API origin и проверить receipt reconciliation синтетическими ответами до любого отдельно разрешённого owner-controlled testnet действия. Review и разрешение deploy обязательны. Rollback — отмена узкого коммита с сохранением журналов неопределённых платежей; откат не означает, что средства не отправлялись.

Ниже exact contextual recovery патча. Финальный файл записать и повторно проверить не удалось из-за exec-server transport disconnected; никаких утверждений о сохранении официального output-файла нет. Ранее успешно подготовленные regression-модули и результаты сохранены в scratch/a006 относительно назначенной рабочей области: native-wallet-races.test.mjs, payment-receipt.test.mjs, red.txt,green.txt,payment-red.txt,payment-green.txt. Тесты транспилируют production source через TypeScript/VM, подменяют SDK/storage/fetch и не загружают API/БД. Последующая попытка расширить денежный guard была прервана runtime и не считается проверенным исправлением.

```diff
--- a/apps/mobile/lib/webauth.ts
+++ b/apps/mobile/lib/webauth.ts
@@ -80,1 +80,5 @@
-let protonSession: LinkSession | null = null;
+let protonSession: LinkSession | null = null;
+let pairingPending = false;
+let sessionGeneration = 0;
+// Keep an uncertain broadcast locked for this process.
+let transferPending = false;
@@ -140,2 +140,3 @@
-export async function clearSession(): Promise<void> {
-  currentSession = null;
+export async function clearSession(): Promise<void> {
+  sessionGeneration += 1;
+  currentSession = null;
@@ -194,22 +194,38 @@
-async function connectWithProtonNativeSdk(restoreSession = false): Promise<LinkSession> {
-  const result = await ProtonRNSDK({
-    linkOptions: {
-      chainId: CHAIN_ID,
-      endpoints: CHAIN_ENDPOINTS,
-      storage: linkStorage,
-      storagePrefix: PROTON_LINK_STORAGE_PREFIX,
-      restoreSession,
-    },
-    transportOptions: {
-      requestAccount: REQUEST_ACCOUNT,
-      getReturnUrl: () => `smartcontractor://${CALLBACK_PATH}`,
-    },
-  });
-
-  if (!result.link || !result.session) {
-    throw new Error('WebAuth did not return a Proton Link session');
-  }
-  protonLink = result.link;
-  protonSession = result.session;
-  return result.session;
-}
+async function connectWithProtonNativeSdk(restoreSession = false): Promise<LinkSession> {
+  if (pairingPending) throw new Error('wallet_pairing_pending');
+  pairingPending = true;
+  const generation = sessionGeneration;
+  const operation = Promise.resolve().then(() => ProtonRNSDK({
+    linkOptions: {
+      chainId: CHAIN_ID,
+      endpoints: CHAIN_ENDPOINTS,
+      storage: {
+        read: key => linkStorage.read(key),
+        write: (key, data) => generation === sessionGeneration
+          ? linkStorage.write(key, data) : Promise.resolve(),
+        remove: key => linkStorage.remove(key),
+      },
+      storagePrefix: PROTON_LINK_STORAGE_PREFIX,
+      restoreSession,
+    },
+    transportOptions: {
+      requestAccount: REQUEST_ACCOUNT,
+      getReturnUrl: () => `smartcontractor://${CALLBACK_PATH}`,
+    },
+  })).then(result => {
+    if (generation !== sessionGeneration) throw new Error('wallet_session_changed');
+    if (!result.link || !result.session) {
+      throw new Error('WebAuth did not return a Proton Link session');
+    }
+    if (String(result.session.chainId) !== CHAIN_ID) throw new Error('wallet_wrong_network');
+    protonLink = result.link;
+    protonSession = result.session;
+    return result.session;
+  }).finally(() => { pairingPending = false; });
+  try {
+    return await withTimeout(operation, 90_000, 'Proton Link pairing');
+  } catch (error) {
+    if (generation === sessionGeneration) sessionGeneration += 1;
+    throw error;
+  }
+}
@@ -520,7 +520,6 @@
-  protonLink = null;
-  protonSession = null;
-  const identity = await withTimeout(
-    connectWithProtonNativeSdk(false),
-    90_000,
-    'Proton Link login',
-  );
+  if (pairingPending) throw new Error('wallet_pairing_pending');
+  const generation = sessionGeneration;
+  protonLink = null;
+  protonSession = null;
+  const identity = await connectWithProtonNativeSdk(false);
+  if (generation !== sessionGeneration) throw new Error('wallet_session_changed');
@@ -537,3 +537,6 @@
-export async function signTransfer(args: TransferArgs): Promise<SignResult> {
-  const trace: string[] = [];
-  try {
+export async function signTransfer(args: TransferArgs): Promise<SignResult> {
+  const trace: string[] = [];
+  if (transferPending) return { ok: false, error: 'wallet_transfer_pending_or_unknown' };
+  transferPending = true;
+  let broadcastStarted = false;
+  try {
@@ -558,25 +558,9 @@
-    if (!link || !session) {
-      try {
-        debugTransfer(args, trace, 'Restoring Proton Link session');
-        session = await withTimeout(
-          connectWithProtonNativeSdk(true),
-          90_000,
-          'Proton Link session restore',
-        );
-        link = protonLink;
-      } catch (restoreErr) {
-        // A stored session can't always be restored (SDK login sessions are
-        // in-memory and lost across app restarts). Fall back to a fresh login,
-        // which re-opens WebAuth to re-establish a signable Proton Link session.
-        debugTransfer(args, trace, `Restore failed: ${describeError(restoreErr)}; re-authenticating`);
-        session = await withTimeout(
-          connectWithProtonNativeSdk(false),
-          90_000,
-          'Proton Link re-login',
-        );
-        link = protonLink;
-      }
-    }
-    if (!link) {
-      throw new Error('No Proton Link session');
-    }
+    if (!link || !session) {
+      debugTransfer(args, trace, 'Restoring Proton Link session');
+      session = await connectWithProtonNativeSdk(true);
+      link = protonLink;
+    }
+    if (!link || !session || protonLink !== link || protonSession !== session) {
+      throw new Error('wallet_session_changed');
+    }
+    if (String(session.chainId) !== CHAIN_ID) throw new Error('wallet_wrong_network');
@@ -594,2 +594,3 @@
-    const action = {
-      account: 'eosio.token',
+    if (signerPermission !== permission) throw new Error('wallet_permission_changed');
+    const action = {
+      account: 'eosio.token',
@@ -606,32 +606,7 @@
-    let result;
-    try {
-      result = await withTimeout(
-        link.transact({ actions: [action] }, { broadcast: true }),
-        180_000,
-        'WebAuth transaction',
-      );
-    } catch (txErr) {
-      // A session restored from storage can be stale after a reinstall or a
-      // fresh registration: the chain rejects its session key with "declares
-      // authority ... but does not have signatures". Self-heal by discarding
-      // the stale session, pairing fresh in WebAuth, and retrying once.
-      const txMsg = txErr instanceof Error ? txErr.message : String(txErr);
-      if (!/does not have signatures|unsatisfied|missing.*signature/i.test(txMsg)) {
-        throw txErr;
-      }
-      debugTransfer(args, trace, 'Stale session signature rejected; re-pairing');
-      protonLink = null;
-      protonSession = null;
-      await connectWithProtonNativeSdk(false);
-      // connectWithProtonNativeSdk repopulates the module-level protonLink;
-      // the cast re-widens the type TS narrowed to null above.
-      link = protonLink as ProtonLink | null;
-      if (!link) {
-        throw new Error('Re-pairing with WebAuth failed');
-      }
-      result = await withTimeout(
-        link.transact({ actions: [action] }, { broadcast: true }),
-        180_000,
-        'WebAuth transaction (retry)',
-      );
-    }
+    broadcastStarted = true;
+    // SDK exception text cannot prove the transfer was not broadcast.
+    const result = await withTimeout(
+      link.transact({ actions: [action] }, { broadcast: true }),
+      180_000,
+      'WebAuth transaction',
+    );
@@ -648,6 +648,9 @@
-    return { ok: true, txHash };
-  } catch (err) {
-    const msg = err instanceof Error ? err.message : 'Unknown signing error';
-    return { ok: false, error: trace.length ? `${msg} | ${trace.join(' -> ')}` : msg };
-  }
-}
+    transferPending = false;
+    return { ok: true, txHash };
+  } catch (err) {
+    const msg = err instanceof Error ? err.message : 'Unknown signing error';
+    return { ok: false, error: trace.length ? `${msg} | ${trace.join(' -> ')}` : msg };
+  } finally {
+    if (!broadcastStarted) transferPending = false;
+  }
+}
```
