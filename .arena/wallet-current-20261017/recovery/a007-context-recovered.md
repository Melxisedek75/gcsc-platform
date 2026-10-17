Файл `r0/a007.md` не удалось записать: транспорт исполнения отключился; попытка `apply_patch` также зависла. Исходные и изменённые копии сохранены в `.arena/wallet-current-20261017/scratch/a007/{before,after}/`. Ниже — самостоятельное предложение. Результаты тестов не подтверждены.

Основная причина веб-привязки подтверждается текущим кодом: `Wallet.tsx` и `dashboard/WalletPanel.tsx` вызывают `api.connectWallet(metadata)`. Этот метод отправляет account/permission/publicKey в `/api/wallet/connect`, которому необходима подпись. Публичный ключ из pairing не заменяет ownership proof. Восстановление страницы повторяет тот же неподписанный запрос. При этом новые `/api/wallet/ownership/challenge` и `/verify`, канонический proof requester и общий binding client уже существуют.

Второй подтверждённый дефект находится в native `signTransfer`: после ошибки, совпавшей с регулярным выражением `does not have signatures|unsatisfied|missing.*signature`, функция автоматически выполняет новую pairing и второй `broadcast:true`. Она также сравнивает только account, подставляя permission SDK вместо запрошенной, и не проверяет chain перед переводом.

Открытые вопросы разрешены так:

- Развёрнутый SHA и свежая трасса отсутствуют: выводы относятся к указанному `f91c3cb8586f453b298aab5074f41436e7db9840`.
- Существующий ownership transaction сохраняется без изменений. Проверенный Android parent transport и disposable SDK transaction copy сохраняются.
- Привязка требует существующего app JWT. Wallet-first login продолжает использовать отдельные login routes.
- Restore восстанавливает локальное pairing, без автоматической привязки.
- Отмена во время уже отправленного verify не отменяет серверную запись: ответ отбрасывается, актуальное состояние следует получать через profile.
- Истечение клиентского timeout не доказывает отсутствие broadcast.

С позиции протокола исправляется фактический контракт потребителя, с позиции SDK — проверяется точная тройка account/permission/chain, с позиции эксплуатации — удаляется автоматический повтор финансового действия. Создавать второй протокол или принимать metadata как доказательство не требуется.

Полный новый модуль `apps/web/src/services/walletBinding.ts`:

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

export async function bindWebAuthWallet(
  signal?: AbortSignal,
): Promise<GcscUser> {
  if (pending) throw new Error('wallet_binding_request_pending')
  const token = api.getToken()
  if (!token) throw new Error('wallet_binding_app_login_required')

  let session: WebAuthSigningSession | null = null
  const assertCurrent = () => {
    if (signal?.aborted) throw new Error('wallet_binding_cancelled')
    if (api.getToken() !== token) {
      throw new Error('wallet_binding_app_session_changed')
    }
  }

  pending = true
  try {
    const bind = createWalletBinding<GcscUser>({
      connect: async () => {
        assertCurrent()
        const connected = await connectWebAuthSession({
          chainId: CHAIN_ID,
          endpoints: (
            import.meta.env.VITE_XPR_TESTNET_RPC_URL ||
            'https://testnet-api.alvosec.com'
          ).split(',').map((endpoint: string) => endpoint.trim()).filter(Boolean),
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
      sign: (challenge, requestSignal) => {
        assertCurrent()
        if (!session) throw new Error('wallet_binding_session_missing')
        return signWebAuthOwnershipChallenge(session, challenge, requestSignal)
      },
      verify: async body => {
        assertCurrent()
        const response = await api.walletOwnershipVerify(body)
        assertCurrent()
        if (
          response.user?.wallet?.accountName !== body.accountName ||
          response.user.wallet.permission !== body.permission
        ) {
          throw new Error('wallet_binding_response_invalid')
        }
        return response
      },
    })
    return await bind({ signal })
  } finally {
    pending = false
  }
}
```

В `apps/web/src/services/api.ts` добавить `verified?: boolean` в `GcscWallet`. Заменить существующий метод `connectWallet` следующими методами; существующие импорты `OwnershipChallenge` и `OwnershipProof` уже присутствуют:

```ts
walletOwnershipChallenge(body: {
  accountName: string
  permission: string
}): Promise<OwnershipChallenge> {
  return this.request('/wallet/ownership/challenge', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
walletOwnershipVerify(body: {
  accountName: string
  permission: string
  proof: OwnershipProof
}): Promise<{ user: GcscUser }> {
  return this.request('/wallet/ownership/verify', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
```

В `WalletPanel.tsx` заменить импорт `connectWebAuthWallet` импортом `bindWebAuthWallet` из `../../services/walletBinding`; импорт API оставить только типовым. Заменить тело успешной ветви:

```ts
const updated = await bindWebAuthWallet()
onUserChange(updated)
setStatus('WebAuth wallet connected; ownership verified.')
```

В `Wallet.tsx` импортировать `bindWebAuthWallet` из `../services/walletBinding`. В restore удалить вызов `api.connectWallet(restored)` и последующее присваивание user/wallet; оставить:

```ts
setStatus(
  'Restored local WebAuth pairing only. Select Connect to verify ownership for this profile.',
)
```

В ручном connect заменить ветвление следующим:

```ts
if (user) {
  const updated = await bindWebAuthWallet()
  setUser(updated)
  setWallet(updated.wallet || null)
  setStatus('WebAuth wallet connected; ownership verified and saved.')
} else {
  const connected = await connectWebAuthWallet()
  setWallet({ ...connected })
  setStatus(
    'WebAuth wallet connected locally. Sign in to verify ownership for your profile.',
  )
}
```

Оба компонента должны различать `wallet.verified === true` и профильные metadata. Текст об автоматическом присоединении кошелька заменить явным требованием отдельного sign-only proof.

В native модуле добавить рядом с `protonSession`:

```ts
let transferPending = false
```

В начале `signTransfer`, перед существующим `try`, установить:

```ts
if (transferPending) {
  return { ok: false, error: 'wallet_transfer_request_pending' }
}
transferPending = true
let broadcastStarted = false
let broadcastSettled = false
let callerFinished = false
```

Заменить вычисление `signerAccount`/`signerPermission` и существующую проверку account:

```ts
if (!session || String(session.chainId) !== CHAIN_ID) {
  throw new Error('wallet_transfer_wrong_network')
}
const signerAccount = String(session.auth.actor)
const signerPermission = String(session.auth.permission)
if (signerAccount !== from || signerPermission !== permission) {
  throw new Error(
    'wallet_transfer_identity_changed: reconnect the linked account and permission',
  )
}
```

Полностью заменить блок от `let result;` до `const txHash = extractTxHash(result);`, исключая последнюю строку:

```ts
broadcastStarted = true
const operation = Promise.resolve()
  .then(() => link!.transact(
    { actions: [action] },
    { broadcast: true, chain: session!.chainId },
  ))
  .then(value => {
    broadcastSettled = true
    if (callerFinished) transferPending = false
    return value
  }, error => {
    broadcastSettled = true
    if (callerFinished) transferPending = false
    throw error
  })
const result = await withTimeout(operation, 180_000, 'WebAuth transaction')
```

После существующего `catch` добавить:

```ts
finally {
  callerFinished = true
  if (!broadcastStarted || broadcastSettled) transferPending = false
}
```

Это предотвращает параллельный вызов и сохраняет блокировку после timeout, пока фактический SDK promise не завершится. Это процессная блокировка, не долговечный платёжный журнал.

Узкие регрессии уже записаны полным файлом `scratch/a007/after/tests/wallet-reliability.test.mjs`. Они исполняют настоящий TypeScript через `transpileModule`/VM с заменой только внешнего I/O:

1. Ошибка `does not have signatures` даёт ровно один transact.
2. Permission `owner` при требовании `active` даёт ноль transact.
3. Другая chain даёт ноль transact.
4. Два одновременных вызова дают один transact.
5. Timeout незавершённого SDK promise сохраняет блокировку.
6. Успешный transact получает точный `chain`.
7. Web выполняет connect → challenge → sign → verify.
8. Смена JWT после handoff предотвращает challenge.
9. Abort во время verify отбрасывает результат.
10. Concurrent binding не открывает вторую pairing.
11. Wrong-chain и `verified:false` отвергаются.
12. Оба веб-потребителя используют signed binding без `api.connectWallet`.

В существующем `tests/wallet-restore.test.mjs` требуется счётчик вызовов `api.connectWallet` с ожиданием нуля во всех сценариях; успешное local restore должно оставлять profile wallet равным `null`.

Прогоны были запущены на изолированных копиях, но отключение среды не позволило получить результаты. Это не red/green доказательство. Перед интеграцией нужно завершить эти регрессии, TypeScript checks и независимое ревью точного diff. Правки относятся к frontend lane; backend routes/схема не меняются. Переносить следует только выбранный патч на совместимый кандидат, без широкого merge 482 коммитов. Rollback — откат этого коммита; неизвестный результат перевода требует reconciliation даже после отката.

Дополнительные подтверждённые ограничения остаются gates: native `payments.ts` принимает HTTP 200 с `pending:true` как `confirmed`, теряет полученный txHash при ошибке receipt verification и симулирует успех при отсутствующем endpoint. SDK connection timeout также не отменяет позднее изменение глобальной session. Эти пути нельзя считать принятыми этим патчем. Нужны долговечное сохранение платёжной попытки, повторная проверка существующего hash без нового broadcast и проверка account-switch/late callback на устройстве. Суммы XPR не являются USD settlement.

Физическая приёмка должна отдельно подтвердить web popup signing, Android login и linking через настоящий API, отмену, холодный restore и принадлежность развёрнутого APK/web/API конкретным SHA. Изолированная K1-подпись 490 байтов из сентябрьского probe не доказывает эти сценарии и не позволяет объявить кошелёк исправным.
