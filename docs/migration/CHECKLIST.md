# GCSC: контрольный список завершения проекта

## Главный план: сначала единый репозиторий

Обновлено: 13 сентября 2026, America/Los_Angeles. Этот раздел определяет текущий
порядок; подробная история и критерии ниже сохраняются, но не меняют приоритеты.
Статус «ГОТОВО» означает проверенный результат, а не намерение.

13 сентября владелец изменил текущий приоритет на Android frontend: выбрать
проверенные дизайн-подходы и начать улучшение SmartContractor. Активный шаг UI-1:
дизайн-спецификация, общие доступные элементы управления и навигация в существующем
Expo/RN-приложении. Backend P2.2 не отменён; новая визуальная часть не означает
готовую авторизацию. Код: ветка codex/mobile-design-foundation-20260913,
frontend worktree; проверенный APK предыдущего шага остаётся на Pixel8.

UI-1 создан в кандидате29ba58e1: Material-тема, общие поля/кнопки, пять вкладок
каждой роли, читаемые профили без выдуманного рейтинга. Проверки:46+10 тестов,
static и TypeScript PASS; браузер320/390/768px с локальными fixtures, без ошибок.
Независимое ревью29ba58e1 APPROVED; [результат](C:/gcsc-platform/.worktrees/frontend/docs/migration/MOBILE-DESIGN-REVIEW.md). APK с этим дизайном не собран и
не установлен. Следующий frontend-шаг UI-2: jobs, bids и формы публикации по
[спецификации](C:/gcsc-platform/.worktrees/frontend/docs/migration/MOBILE-DESIGN.md).

| Приоритет | Статус | Задача и критерий завершения |
| --- | --- | --- |
| P0.1 | ГОТОВО | Собраны три источника: gcsc-website, gcsc-smart-contractor, gcsc-store. 421 импортированный файл и 1510 исключений сверены с точными исходными Git-объектами. Оригиналы и резервная история сохранены. |
| P0.2 | ГОТОВО | Независимое ревью всех трёх веток. Исправлены два блокера ownership в API и скрытая зависимость тестов от mobile/node_modules. API 159/159; повторное ревью разрешило локальное объединение. |
| P0.3 | ГОТОВО | Backend, frontend/mobile и QA объединены в одну ветку. Кодовая точка 6f88ea54; конфликты общих JSON разрешены объединением записей, без потери команд и изменений. |
| P1.1 | ГОТОВО | Переносимые доказательства происхождения проверены независимо; чистый отдельный клон без archive refs проходит npm run check: 22 + 4 + 11 тестов, syntax/static PASS. |
| P1.2 | ГОТОВО | Проверена публикуемая история: 7 находок сканера разобраны как публичные ключи, тестовые пароли и ложные срабатывания. Непроверенная legacy-история не публикуется. |
| P1.3 | ГОТОВО | Единая main опубликована в приватном Melxisedek75/gcsc-platform. Первый опубликованный commit 5a9bba32 подтверждён git ls-remote; опубликована только main, без archive refs. |
| P1.4 | ГОТОВО | GitHub main и C:/gcsc-platform/.worktrees/publication зафиксированы в README/AGENTS как источник новой разработки. Старые репозитории не удалены, не архивированы, настройки работающих сервисов не менялись. |
| P1.4a | ГОТОВО | 12 уникальных staged/untracked файлов сохранены в архиве приватной main, SHA 6878cbdf подтверждён. Три снимка исходников также находятся в закрытом Google Drive. Независимое ревью e8188048: APPROVED; изоляция и контрольные суммы проверены. Renovation не активирован. Evidence: LEGACY-PRESERVATION-REVIEW.md, LOCAL-RECOVERY-2026-09-13.md. |
| P1.5 | ЧАСТИЧНО ГОТОВО | Root baseline39/39, API159/159, API-config15/15, web build2977 модулей PASS; lint0 ошибок/1 предупреждение. Подготовка контрактов6a352f46:9/9 runner и31/31 Vert, exit0; независимое ревью APPROVED. APK2094b69c собран, установлен и прошёл старт на Pixel8; его46/46+static PASS. Новый UI29ba58e1:46+10 тестов, types/static и браузер PASS, не новый APK. Реальная PostgreSQL и CI Node20 ещё не подтверждены. Evidence: LOCAL-RECOVERY-2026-09-13.md, CONTRACT-PREPARATION-BUDGET.md, frontend/MOBILE-STARTUP-RECOVERY.md и MOBILE-DESIGN.md. |
| P2.1 | ДИАГНОСТИКА ГОТОВА | Таблица маршрутов и клиентов: WALLET-API-CONTRACT.md. Web отправляет metadata без подписи; mobile сохраняет metadata через профиль. Wallet-first routes отсутствуют; связывание кошелька требует существующий app JWT. SDK v2 identity не подписывает nonce/domain. Следующий шаг: подтвердить поддерживаемый кошельком формат доказательства для P2.2. |
| P2.2 | ОЧЕРЕДЬ | Завершить backend авторизации: nonce, срок действия, replay, account/permission/network binding, отмена и ошибки. Никаких неподписанных identity metadata как доказательства. |
| P2.3 | ОЧЕРЕДЬ | Desktop/web: вход, восстановление, выход, смена кошелька/сети, истёкшая сессия. Проверка на реальном интерфейсе с локальным API; mock отдельно от интеграции. |
| P2.4 | СТАРТ НА ТЕЛЕФОНЕ ПРОВЕРЕН; AUTH ОТКРЫТ | APK2094b69c, опубликованный отчёт7acb7662: 0.1.3/code5 ARM64,28 504 933байта, SHA256 начинается6b06ca9ce5a0. Offline-сборка exit0 за24м11с,488задач; lintVitalRelease PASS,46/46+static PASS, независимое source-review APPROVED. Сертификат совпал со старой версией; install-r Success без удаления данных. Pixel8 подтверждает0.1.3/code5: два холодных старта и Sign in без прежнего красного экрана. Остались предупреждение(auth) layout, серверный вход, callbacks и покупка. API не запущен. [Evidence](C:/gcsc-platform/.worktrees/frontend/docs/migration/MOBILE-STARTUP-RECOVERY.md). Код кандидата в main не включён. |
| P2.5 | ОЧЕРЕДЬ | Покупка лида: eligibility до предложения оплаты, сумма/получатель/memo, подпись пользователем, проверка перевода, повтор callback, отложенное подтверждение, отсутствие двойной покупки. Web и mobile отдельно. |
| P2.6 | ОЧЕРЕДЬ | Реальная изолированная PostgreSQL: миграции, роли, ограничения, повторные платежи, восстановление. Не использовать live базу для тестов. |
| P3.1 | ОЧЕРЕДЬ | Проверить согласованный MVP по матрице 60 возможностей: jobs, bids, документы/verification, chat, профиль, роли, proof/milestones. Вернуть отсутствующее; каждый пункт закрывается пользовательским сценарием. Отдельно согласовать выборочный перенос сохранённых renovation/Resend изменений с v1.4, SQL constraints и тестами; архив не означает работающую функцию. |
| P3.2 | ОЧЕРЕДЬ | Security и эксплуатация: зависимости/лицензии, доступы, rate limits, наблюдаемость, backup/restore, rollback. Предупреждения устаревших пакетов не скрывать. |
| P3.3 | ОЧЕРЕДЬ | Preview-пилот и физическое устройство: подтвердить все основные сценарии для точного артефакта; подготовить публикацию и переключение сервисов. |
| P3.4 | ОЧЕРЕДЬ | Production после обязательной приёмки: авторизованное переключение, smoke, rollback, наблюдение. Только затем рассмотреть архивирование трёх старых репозиториев. |

После публикации статический API gate обнаружил 47 объявленных маршрутов и 5/7
обязательных entrypoints. Отсутствуют POST /api/auth/wallet/challenge и /verify.
Это подтверждённый разрыв API-контракта, а не доказательство единственной причины
ошибок прежних APK. P2.1 документирован в WALLET-API-CONTRACT.md; полный login/link
протокол и проверки на телефоне остаются открытыми. У web также отсутствует
обработчик покупки лида: P2.5 требует реализации, а не только исправления.
P1.5 продвинут после очистки: API и web baseline подтверждены локально;
таймаут подготовки escrow исправлен в кандидате с полным прогоном 31/31.
APK собран и установлен, проверка старта завершена. После восстановления места,
сборки и сохранения старого APK для сравнения подписи осталось3,980 ГиБ.
Новая сборка требует исходных4ГиБ; без изменения кода повторно не запускать.

### Что находится вместе

- API: services/api/v3/pure-server.js.
- Веб-приложение: apps/web; мобильное приложение: apps/mobile.
- Публичный сайт: apps/marketing; публичный whitepaper не заменён внутренним.
- Контракты: contracts/gcsc-core; общие модули: packages.
- Документы, внутренний whitepaper 1.4, проверки и CI: docs, tests, scripts, .github.
- Будущие кредиты, оценка недвижимости и AI draw recommendations не объявляются
  действующими финансовыми сервисами: whitepaper 1.4 остаётся внутренним проектом.

### Порядок автономной работы

Брать первый незавершённый пункт с выполненными зависимостями. При реальном блокере
сохранить причину и условие продолжения в ACTIVE-TASK.json, затем взять независимую
часть того же приоритета. Не уходить в Trader Bot или новые функции вне этого плана.
После результата обновлять этот файл; не создавать параллельные списки задач.
Не ждать таймер между доступными действиями и не опрашивать лимиты каждые две минуты.
При исчерпании ресурсов сохранить checkpoint; автоматическое пробуждение после
покупки кредитов не гарантируется платформой. Подпись кошельком, недоступные
учётные данные и обязательные внешние решения нельзя заменить общим разрешением.

Доказательства объединения: [CONSOLIDATION-REVIEW.md](CONSOLIDATION-REVIEW.md).
Ни объединение репозиториев, ни локальные тесты не означают готовность приложения
на 100%. Незавершённые пункты выше остаются незавершёнными до проверки.

## Completion sequence and autonomous execution (2026-09-09)

- [x] 2026-09-12 local web wallet restore error isolation: preserve app session on
  wallet/network failures; clear only matching token on profile HTTP401. Frontend
  candidate tests: restore 11/11, API config 15/15, npm run check and web build PASS.
  Sol/high independent scoped review APPROVED after token-race correction;
  NOT integrated, NOT phone/wallet end-to-end acceptance.
  Evidence: .worktrees/frontend/docs/migration/WALLET-RESTORE-ERROR-ISOLATION.md.

Owner requested continuation through market readiness. This is the single plan;
ACTIVE-TASK.json records the current step, worktree, evidence and next action.
Proceed immediately between dependency-ready tasks. Scheduler is recovery only.
Check off a stage only when its acceptance evidence is present for the exact commit.

1. [ ] Reproducible foundation (QA): resolve contract compiler timeout, run Vert;
   verify API/database, web and native builds with pinned local dependencies.
   Acceptance: documented commands, artifacts and passing required tests.
2. [ ] Integrate candidates (backend/frontend/QA): independently review exact
   candidates and resolve findings; coordinate API configuration and wallet proof.
   Acceptance: reviewed changes integrated without losing imported capabilities.
3. [ ] Wallet and lead journey (backend + web/mobile): login, restore, cancellation,
   expired proof, account/network switch, lead purchase, verification, duplicate
   callbacks and interrupted payment recovery. Acceptance: end-to-end evidence on
   desktop and physical phone; mocks cannot close device or signing checks.
4. [ ] Product completeness (all lanes): verify the existing 60-row capability
   matrix against agreed MVP scope: jobs, bids, evidence, chat, profiles and roles.
   Explicitly separate future whitepaper features from launch requirements.
   Acceptance: each release requirement has a testable user outcome and evidence.
5. [ ] Release assurance (QA): security/auth review, secret and license checks,
   permissions, backups/restore, error monitoring, accessibility and failure cases.
   Acceptance: no unresolved release-blocking findings; rollback rehearsal passes.
6. [ ] Preview pilot (coordinator): documented environment configuration, deployment
   roots and origins, seeded test data and realistic journeys across web/mobile.
   Acceptance: preview and device tests pass for the release artifact, with support
   and incident handling prepared. Credentials/device access are concrete gates.
7. [ ] Production release (coordinator): prepare exact reviewed version, configuration,
   cutover/rollback steps and remaining owner decisions for existing production gate.
   Acceptance: authorized deployment, post-deploy smoke and monitored real service.
   Archive original repos only after verified cutover; preserve all history.
8. [ ] Launch closeout: validate market-facing claims and launch scope, operational
   ownership and known limitations. 100% means the agreed release scope is accepted,
   not a promise that every future roadmap feature is live or that bugs cannot occur.

If a step fails, isolate and fix the cause, then rerun affected checks. If an
external gate blocks it, work on another dependency-ready requirement. Do not
generate repeated status documents or retry unavailable reviewers without new
availability evidence. User pause stops continuation. Scheduler cannot guarantee
execution during exhausted limits, an offline host or service unavailability.

Статус: локальный monorepo создан; интеграция продукта НЕ завершена. Проверка: 2026-09-08 UTC.

## Исходники и сохранность
- [x] Подтверждены ровно три репозитория.
- [x] Записаны локальные изменения и точные актуальные SHA из GitHub.
- [x] Созданы и проверены три резервных Git bundle со всеми локальными refs.
- [x] Созданы три upstream mirror; оригиналы оставлены на месте.
- [x] Сохранены 529 допустимых dirty-файлов; исключённые/ignored остались в оригиналах.
- [x] Получен отдельный аудит web/marketing; три static validator прошли, это не E2E.
- [ ] Независимое backend/security review: проверяющие остановлены лимитом.
  Попытка Pascal для fe16dfc1 также остановлена лимитом; отчёт отсутствует,
  QA worktree чистый (проверено 2026-09-07 15:37 UTC). Не засчитано как PASS.
  Попытка Anscombe для 309c2909 также завершилась usage limit: отчёт отсутствует,
  QA worktree чистый, исполнитель закрыт, lease снята (2026-09-08 04:10 UTC).
  Общая доступная квота не подтверждает доступность reviewer; без новых доказательств
  восстановления лимита повторно не запускать. Статус BLOCKED_REVIEW / NOT_APPROVED.
- [x] Отдельно сохранён и проверен Git bundle кандидата wallet-backend.

## Контролируемый перенос
- [x] Записаны решения об источниках истины и явные исключения.
- [x] 421 исходный файл перенесён с точным указанием commit/path/blob/SHA-256.
- [x] История сохранена в archive/*; 1510 исключений явно зарегистрированы.
- [x] Внутренний Whitepaper v1.4, дизайн и план сохранены отдельно от публичного.
- [x] Исправлен API main/start/dev; регрессионный тест сначала падал, затем прошёл.
- [x] Созданы отдельные worktree/ветки backend, frontend и QA.
- [x] Перенос: 7 тестов PASS; API: 87 PASS; web build PASS; lint: 0 ошибок/1 warning.

## Интеграция: ещё не завершена
- [x] QA candidate `7c55289b`: PostgreSQL-тесты с очисткой таблиц проверяют
  локальный адрес и тестовое имя БД до подключения; guard/provenance 9/9 PASS.
  Локальный QA API baseline 87/87 PASS. Настоящий PostgreSQL ещё не проверен:
  Docker engine не ответил за 15 секунд; фиктивные Pool-тесты не засчитаны как SQL.
- [x] Локальная воспроизводимая проверка контрактов: QA candidate `30b31639`.
  Устранена обработка JavaScript-зависимостей TypeScript-загрузчиком компилятора.
  Contract/Vert 31/31 PASS; guards 8/8 PASS; provenance 7/7 PASS.
  Независимое ревью и интеграция не выполнены; это не live-подписи и не тест телефона.
- [x] Составлена матрица 60 возможностей с кодом, доказательствами и неизвестными областями.
- [ ] Для всех 60 возможностей собраны функциональные доказательства; unknown не равно готово.
- [ ] Согласован единый wallet-auth protocol и безопасное подтверждение владения аккаунтом.
- [x] Проверены ограничения установленных wallet SDK: QA candidate eb4a84d8,
  24/24 диагностических теста дважды PASS. В identity v2 nonce/domain/callback
  не входят в digest, scope опущен, заданный expiry игнорируется. Это выявленные
  ограничения, НЕ одобрение безопасного входа; отдельное требование nonce binding FAIL.
- [x] Проверена передача unsigned challenge payload: QA candidate 08636fde.
  Полный transaction сохраняет domain/nonce/expiry в digest; native URI и web popup
  проверены с IO-заглушками. Совместно 43/43 теста дважды PASS. Синтетические действия
  НЕ подтверждают приём настоящим кошельком и НЕ являются готовым протоколом входа.
- [x] Локальный кандидат защиты wallet metadata: backend commit fe16dfc1.
  Неподтверждённая привязка отклоняется на обоих payment endpoints; смена account/permission
  сбрасывает proof. 102/102 offline API-тестов дважды PASS, 7/7 provenance PASS.
  Независимое ревью и интеграция НЕ выполнены; это не готовый wallet-first вход.
- [x] Локальный кандидат threshold-проверки: backend commit 66fe4734 поверх fe16dfc1.
  Вес одного подтверждённого ключа должен сам удовлетворять порогу разрешения;
  некорректные числа отклоняются. 38 новых тестов; полный API suite 140/140 дважды PASS.
  Provenance 7/7, syntax/static проверки PASS. Независимого одобрения и интеграции нет.
- [x] Локально убран обход ownership-проверки через env: backend commit 309c2909.
  При отказе или ошибке проверки привязка не создаётся; старая настройка false не
  отключает контроль. API 141/141 дважды PASS, mock-PG + mock-RPC smoke дважды PASS,
  provenance 7/7 и syntax/static PASS. Это не live PostgreSQL и не тест телефона;
  независимое ревью и интеграция ещё не выполнены.
- [ ] Убраны production URL fallback через проверенный контракт конфигурации.
- [x] Локальный кандидат конфигурации: общий URL resolver для web/mobile, убран fallback
  и цикл API/payments; 14/14 тестов дважды, web build PASS. Ветка codex/frontend-integration,
  commit 4ec7a0b7. Независимое ревью и интеграция ещё не выполнены; native JS bundle проверен ниже.
- [x] Локальный Android JS/Hermes baseline: commit 6151d36b в frontend worktree,
  1110 модулей, 3 795 880 байт, все 24 ресурса проверены. Полный mobile TypeScript PASS;
  migration 7/7, build guards 4/4, API config 14/14 PASS. Это НЕ APK и НЕ тест телефона.
- [ ] Web/native используют совместимые API-типы и форматы запросов/ответов.
- [ ] На телефоне проверены вход, restore, cancel, timeout, смена аккаунта/сети.
- [ ] Проверена сквозная покупка лида, duplicate callbacks и восстановление платежа.
- [ ] AI-функции выделены из конкурирующего construction-ai приложения без потери функций.
- [ ] Воспроизводимо проходят native/DB/contract build/tests и полноценный E2E.
- [x] Добавлен root CI без auto-deploy; integration gate намеренно красный до исправлений.
- [ ] Независимый reviewer одобрил точный commit после всех исправлений.

## Публикация и архив
- [ ] Проверены секреты и лицензии во всей истории перед push.
- [ ] Проверены hosting origins, service roots, GitHub App/Pages, DNS и rollback.
- [ ] Создан новый remote и опубликована проверенная миграция без приватных данных.
- [ ] Пройдены preview и проверка на устройстве; выполнена репетиция возврата.
- [ ] Отдельно согласован и проверен production cutover.
- [ ] Старые repos переведены в read-only archive после cutover, без удаления.
- [ ] Изменение private/access проверено отдельно от архивирования.

Следующие безопасные задачи: независимое ревью переноса и локальных кандидатов,
wallet-auth protocol/ownership, APK build baseline, PostgreSQL/contract fixtures. Два обязательных
wallet-first API-маршрута пока отсутствуют; integration gate остаётся красным.

Для следующего исполнителя: конфигурационный кандидат и guarded native JS build уже
есть в frontend worktree; не переписывать их повторно. Получить независимое ревью;
в backend lane продолжить protocol/ownership contract до реализации отсутствующих
маршрутов. Direct-key threshold уже исправлен локально в 66fe4734, не переписывать.
Обход ownership-проверки уже убран локально в 309c2909. Следующий конкретный риск:
challenge без domain/chain/permission binding; перед изменением согласовать контракт
с существующими SDK/web/native consumers. Parent/delegated/multisig authority
не поддерживается текущим single-key proof; не считать это полным chain verifier.
Сначала локальные негативные тесты и узкое исправление, без live RPC/подписей.
Consumer audit frontend 6151d36b: mobile connect-wallet сохраняет только profile
metadata, web wallet/connect отправляет запрос без challenge-подписи. Ограничения
identity v2 и unsigned payload уже проверены в QA eb4a84d8/08636fde; не повторять.
Готовность реального кошелька принимать новый payload и независимое security review
остаются отдельными воротами. Не включать экспериментальный proof в API/клиентах.
Следующая безопасная задача: local contract build/test baseline без RPC/deploy.
Доказательства: .worktrees/qa/docs/migration/WALLET-SDK-IDENTITY.md.
Доказательства: .worktrees/frontend/docs/migration/API-CONFIG-CONTRACT.md,
.worktrees/frontend/docs/migration/NATIVE-BUILD-BASELINE.md и
.worktrees/backend/docs/migration/WALLET-TRUST-BOUNDARY.md.

Открытые пункты выше не означают, что функцию нужно написать заново: сначала сверить
существующий код и evidence в CAPABILITY-MATRIX.md. Факт сборки не заменяет тест
на телефоне, а mock-транзакция не подтверждает реальную подпись или платёж.
Статус: локальный monorepo создан; интеграция продукта НЕ завершена. Проверка: 2026-09-08 UTC.

## Исходники и сохранность
- [x] Подтверждены ровно три репозитория.
- [x] Записаны локальные изменения и точные актуальные SHA из GitHub.
- [x] Созданы и проверены три резервных Git bundle со всеми локальными refs.
- [x] Созданы три upstream mirror; оригиналы оставлены на месте.
- [x] Сохранены 529 допустимых dirty-файлов; исключённые/ignored остались в оригиналах.
- [x] Получен отдельный аудит web/marketing; три static validator прошли, это не E2E.
- [ ] Независимое backend/security review: проверяющие остановлены лимитом.
  Попытка Pascal для fe16dfc1 также остановлена лимитом; отчёт отсутствует,
  QA worktree чистый (проверено 2026-09-07 15:37 UTC). Не засчитано как PASS.
  Попытка Anscombe для 309c2909 также завершилась usage limit: отчёт отсутствует,
  QA worktree чистый, исполнитель закрыт, lease снята (2026-09-08 04:10 UTC).
  Общая доступная квота не подтверждает доступность reviewer; без новых доказательств
  восстановления лимита повторно не запускать. Статус BLOCKED_REVIEW / NOT_APPROVED.
- [x] Отдельно сохранён и проверен Git bundle кандидата wallet-backend.

## Контролируемый перенос
- [x] Записаны решения об источниках истины и явные исключения.
- [x] 421 исходный файл перенесён с точным указанием commit/path/blob/SHA-256.
- [x] История сохранена в archive/*; 1510 исключений явно зарегистрированы.
- [x] Внутренний Whitepaper v1.4, дизайн и план сохранены отдельно от публичного.
- [x] Исправлен API main/start/dev; регрессионный тест сначала падал, затем прошёл.
- [x] Созданы отдельные worktree/ветки backend, frontend и QA.
- [x] Перенос: 7 тестов PASS; API: 87 PASS; web build PASS; lint: 0 ошибок/1 warning.

## Интеграция: ещё не завершена
- [x] Составлена матрица 60 возможностей с кодом, доказательствами и неизвестными областями.
- [ ] Для всех 60 возможностей собраны функциональные доказательства; unknown не равно готово.
- [ ] Согласован единый wallet-auth protocol и безопасное подтверждение владения аккаунтом.
- [x] Проверены ограничения установленных wallet SDK: QA candidate eb4a84d8,
  24/24 диагностических теста дважды PASS. В identity v2 nonce/domain/callback
  не входят в digest, scope опущен, заданный expiry игнорируется. Это выявленные
  ограничения, НЕ одобрение безопасного входа; отдельное требование nonce binding FAIL.
- [x] Проверена передача unsigned challenge payload: QA candidate 08636fde.
  Полный transaction сохраняет domain/nonce/expiry в digest; native URI и web popup
  проверены с IO-заглушками. Совместно 43/43 теста дважды PASS. Синтетические действия
  НЕ подтверждают приём настоящим кошельком и НЕ являются готовым протоколом входа.
- [x] Локальный кандидат защиты wallet metadata: backend commit fe16dfc1.
  Неподтверждённая привязка отклоняется на обоих payment endpoints; смена account/permission
  сбрасывает proof. 102/102 offline API-тестов дважды PASS, 7/7 provenance PASS.
  Независимое ревью и интеграция НЕ выполнены; это не готовый wallet-first вход.
- [x] Локальный кандидат threshold-проверки: backend commit 66fe4734 поверх fe16dfc1.
  Вес одного подтверждённого ключа должен сам удовлетворять порогу разрешения;
  некорректные числа отклоняются. 38 новых тестов; полный API suite 140/140 дважды PASS.
  Provenance 7/7, syntax/static проверки PASS. Независимого одобрения и интеграции нет.
- [x] Локально убран обход ownership-проверки через env: backend commit 309c2909.
  При отказе или ошибке проверки привязка не создаётся; старая настройка false не
  отключает контроль. API 141/141 дважды PASS, mock-PG + mock-RPC smoke дважды PASS,
  provenance 7/7 и syntax/static PASS. Это не live PostgreSQL и не тест телефона;
  независимое ревью и интеграция ещё не выполнены.
- [ ] Убраны production URL fallback через проверенный контракт конфигурации.
- [x] Локальный кандидат конфигурации: общий URL resolver для web/mobile, убран fallback
  и цикл API/payments; 14/14 тестов дважды, web build PASS. Ветка codex/frontend-integration,
  commit 4ec7a0b7. Независимое ревью и интеграция ещё не выполнены; native JS bundle проверен ниже.
- [x] Локальный Android JS/Hermes baseline: commit 6151d36b в frontend worktree,
  1110 модулей, 3 795 880 байт, все 24 ресурса проверены. Полный mobile TypeScript PASS;
  migration 7/7, build guards 4/4, API config 14/14 PASS. Это НЕ APK и НЕ тест телефона.
- [ ] Web/native используют совместимые API-типы и форматы запросов/ответов.
- [ ] На телефоне проверены вход, restore, cancel, timeout, смена аккаунта/сети.
- [ ] Проверена сквозная покупка лида, duplicate callbacks и восстановление платежа.
- [ ] AI-функции выделены из конкурирующего construction-ai приложения без потери функций.
- [ ] Воспроизводимо проходят native/DB/contract build/tests и полноценный E2E.
- [x] Добавлен root CI без auto-deploy; integration gate намеренно красный до исправлений.
- [ ] Независимый reviewer одобрил точный commit после всех исправлений.

## Публикация и архив
- [ ] Проверены секреты и лицензии во всей истории перед push.
- [ ] Проверены hosting origins, service roots, GitHub App/Pages, DNS и rollback.
- [ ] Создан новый remote и опубликована проверенная миграция без приватных данных.
- [ ] Пройдены preview и проверка на устройстве; выполнена репетиция возврата.
- [ ] Отдельно согласован и проверен production cutover.
- [ ] Старые repos переведены в read-only archive после cutover, без удаления.
- [ ] Изменение private/access проверено отдельно от архивирования.

Следующие безопасные задачи: независимое ревью переноса и локальных кандидатов,
wallet-auth protocol/ownership, APK build baseline, PostgreSQL/contract fixtures. Два обязательных
wallet-first API-маршрута пока отсутствуют; integration gate остаётся красным.

Для следующего исполнителя: конфигурационный кандидат и guarded native JS build уже
есть в frontend worktree; не переписывать их повторно. Получить независимое ревью;
в backend lane продолжить protocol/ownership contract до реализации отсутствующих
маршрутов. Direct-key threshold уже исправлен локально в 66fe4734, не переписывать.
Обход ownership-проверки уже убран локально в 309c2909. Следующий конкретный риск:
challenge без domain/chain/permission binding; перед изменением согласовать контракт
с существующими SDK/web/native consumers. Parent/delegated/multisig authority
не поддерживается текущим single-key proof; не считать это полным chain verifier.
Сначала локальные негативные тесты и узкое исправление, без live RPC/подписей.
Consumer audit frontend 6151d36b: mobile connect-wallet сохраняет только profile
metadata, web wallet/connect отправляет запрос без challenge-подписи. Ограничения
identity v2 и unsigned payload уже проверены в QA eb4a84d8/08636fde; не повторять.
Готовность реального кошелька принимать новый payload и независимое security review
остаются отдельными воротами. Не включать экспериментальный proof в API/клиентах.
Следующая безопасная задача: local contract build/test baseline без RPC/deploy.
Доказательства: .worktrees/qa/docs/migration/WALLET-SDK-IDENTITY.md.
Доказательства: .worktrees/frontend/docs/migration/API-CONFIG-CONTRACT.md,
.worktrees/frontend/docs/migration/NATIVE-BUILD-BASELINE.md и
.worktrees/backend/docs/migration/WALLET-TRUST-BOUNDARY.md.

Открытые пункты выше не означают, что функцию нужно написать заново: сначала сверить
существующий код и evidence в CAPABILITY-MATRIX.md. Факт сборки не заменяет тест
на телефоне, а mock-транзакция не подтверждает реальную подпись или платёж.
