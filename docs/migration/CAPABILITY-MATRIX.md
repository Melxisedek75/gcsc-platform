# Матрица 60 возможностей GCSC

Дата: 2026-09-22. Названия взяты из переданного migration prompt, строки 379-438,
прочитанные основным агентом. Это карта происхождения и пробелов, НЕ 60 готовых функций.

Обозначения: **код** — исходник найден; **тест** — указан конкретный локальный набор;
**проверить** — функциональность/безопасность не подтверждены; **дубль** — есть разные
пути реализации; **план** — только дизайн. Наличие UI не доказывает наличие backend.

База: API f793bfb, website b55217e, web 2f02306; точные SHA и каждый исходный blob
в import-manifest.json. Web/native SDK остаются разными адаптерами, а не дублем,
который можно просто удалить. Полное независимое security review не выполнено.

Обновление 2026-09-13: кандидат e9f954fb (QA, codex/local-postgres-baseline-20260913)
добавляет реальный PostgreSQL18.4 baseline. Ниже обновлены только покрытые строки;
9/9 результатов включают родительский тест и 8 сценариев. Fixture-пользователи/JWT,
HTTP API и настоящая БД не заменяют регистрацию, UI, кошелёк или production.
Evidence: POSTGRES-BASELINE.md в той же ветке. Независимое ревью e9f954fb APPROVED;
reviewer повторил PG9/9 и guards4/4. Source candidate не включён в main.

Обновление 14 сентября: profile/documents/admin slice0f4961b2 и финальный
sanitizer8814b919 независимо APPROVED Lagrange. PG23/23 и API164/164 повторены
reviewer; browser component smoke/mock HTTP и web build проверены родителем.
P3.1 частично завершён, не вся матрица. Детали: PROFILE-DOCUMENT-ACCEPTANCE.md.

| # | Capability | Источник / кандидат | Проверено и что остаётся | Риск |
| --- | --- | --- | --- | --- |
| 1 | Authentication | services/api/v3/pure-server.js; `/api/auth/wallet/challenge`, `/verify`; web/native consumers | Wallet-first source contract независимо одобрен: backend `c808f80a`, mobile `6e67d6f3`, web `3702e457`; combined E2E и device acceptance открыты | HIGH |
| 2 | Registration | API /api/auth/register | Код; /api/register — второй путь; проверить единый контракт ролей | HIGH |
| 3 | Session management | API JWT; web api.ts; native lib/auth.ts | Код; JWT, профиль и signing session не эквивалентны | HIGH |
| 4 | User profiles | API /api/auth/profile;0f4961b2 | Real PG: профиль сохраняется после рестарта API, привилегированные поля игнорируются, invalid input без частичной записи. Wallet proof не ослаблен; регистрация/UI E2E отдельно | HIGH |
| 5 | Contractor profiles | API /api/contractors/:id/public; apps/web | Код, static trust validator; не полный E2E | MEDIUM |
| 6 | Homeowner profiles | API profile; apps/mobile/app/(homeowner) | Код; проверить поля и разделение ролей | MEDIUM |
| 7 | KYC / verification hooks | API verification/check, compliance | Код; реальный провайдер и KYC не подтверждены | HIGH |
| 8 | Contractor compliance documents | API auth/documents, admin review;0f4961b2 | Real PG: owner/admin download, revision-bound review, re-upload reset, race и audit PASS; JSON5 tests, browser component smoke с mock HTTP PASS. Provider/KYC, scanning, полная UI/API/DB приёмка открыты | HIGH |
| 9 | Insurance records | UI compliance; contracts/gcsc-core | Проверить: UI/контракт не доказывает страховой продукт | HIGH |
| 10 | Bonds | Требование продукта | Проверить; действующая bond-интеграция не подтверждена | HIGH |
| 11 | Projects | API /api/projects; web ProjectsPanel; native jobs | HTTP + real PG: создание/чтение и повторное открытие данных PASS; web loading/error/empty/latest-request states independently approved in `a587c2ab`; полный UI/API/DB E2E открыт | HIGH |
| 12 | Project creation | API POST /api/projects | Real PG: владелец берётся из JWT, anonymous/contractor отклонены, audit сохранён. Fixture JWT; регистрация/UI E2E открыты | HIGH |
| 13 | Project discovery | API GET /api/projects, /:id | Real PG: category/location фильтры и my-projects по владельцу PASS; полнота ACL/пагинация открыты | MEDIUM |
| 14 | Bids | API /api/bids, /:id/accept; web/native | Real PG: подача, роли, my-bids, сохранение и audit PASS; responsive/list states independently approved in `a587c2ab`; принятие/escrow/lead eligibility и live E2E открыты | HIGH |
| 15 | Contracts | contracts; bid/escrow API | On-chain исходники есть; отдельный lifecycle договора проверить | HIGH |
| 16 | Milestones | API /api/escrow/:id/milestones, /api/milestones/* | Код; escrow-milestones.test.js PASS, не реальная выплата | HIGH |
| 17 | Evidence upload | API milestones/:id/submit, auth/documents | Код; storage/размеры/MIME/ACL требуют отдельного теста | HIGH |
| 18 | AI milestone verification | docs/whitepaper; packages/domain-simulation | План/локальные модели; полноценный AI inference не подтверждён | HIGH |
| 19 | Approval workflow | API milestones/:id/approve | Код; escrow unit suite PASS; права/двойное подтверждение отдельно | HIGH |
| 20 | Escrow | API, contracts/gcsc-core/gcscrow1111.contract.ts | Код; unit PASS; реальные custody/settlement не подтверждены | CRITICAL |
| 21 | Payments | API /api/payment/* | payments-402.test.js PASS на mock-верификаторе | CRITICAL |
| 22 | Stripe integration | API stripe/config, payment-intent, webhook | Код; production/provider тест не выполнялся | CRITICAL |
| 23 | Refunds | История Stripe/escrow реализаций | Отдельный canonical refund маршрут не найден в 47-route inventory | CRITICAL |
| 24 | Payouts | История escrow/settlement | Не доказана полноценная payout-интеграция | CRITICAL |
| 25 | Payment reconciliation | API reconcilePendingPayments | payment-reconciler.test.js PASS; Hyperion ответы mocked | CRITICAL |
| 26 | Idempotency | API receipts / payment tests | PostgreSQL UNIQUE: две одновременные SQL-вставки дают одну запись; это ещё не race payment endpoints/reconciler | CRITICAL |
| 27 | Audit log | API admin/audit-events; web AdminAuditLogPanel | Real PG сохраняет project.created/bid.submitted; полнота, неизменяемость и admin E2E открыты | HIGH |
| 28 | Disputes | API milestones/:id/dispute | Код, часть escrow suite; старый Express disputes не активировать | HIGH |
| 29 | Reviews | Клиентские/старые модульные реализации | Canonical review маршрут не подтверждён; не включать старый router вслепую | MEDIUM |
| 30 | Lead purchase | API payment/lead-token; native payments.ts | 402/reconciler unit PASS; device purchase НЕ проверена | CRITICAL |
| 30a | Priority Access Marketplace | product spec, versioned contract fixture and acceptance-test design | SPEC ONLY: binding/state/accounting invariants and deterministic spec tests; API/DB/UI/payment implementation absent | CRITICAL |
| 31 | Financing / loan UI or workflows | API financing/prechecks; web LoansFinancingPanel; v1.4 | Код/план, только precheck/decision support, не кредитование | CRITICAL |
| 32 | Wallet connection | Wallet-first API plus shared proof/login clients and web/native adapters | Replay/network/account/session guards и независимое source review PASS; проверить browser/API/PG и device round trip | HIGH |
| 33 | WebAuth | apps/web/src/services/webauth.ts; apps/mobile/lib/webauth.ts | Оба consumer используют frozen Testnet sign-only contract; popup/device E2E нет | HIGH |
| 34 | XPR signing | Native SDK / web xprSettlement.ts | Код; реальные подписи не выполнялись | CRITICAL |
| 35 | XPR settlement | Web adapter / API chain-txs / gcscrow1111 | Код; web static validator PASS; broadcast не запускался | CRITICAL |
| 36 | Chain transaction audit | API chain-txs/:txId/verify | Код; соответствие chain/actor/amount/receipt отдельно проверить | HIGH |
| 37 | Desktop wallet flow | apps/web; candidate `3702e457` | Independently APPROVED source consumer; browser-wallet round trip не выполнен | HIGH |
| 38 | Mobile wallet flow | apps/mobile; candidate `6e67d6f3` | Independently APPROVED source consumer; exact APK/device sign-only acceptance не выполнены | HIGH |
| 39 | Deep links / return flow | Native app.json, lib/webauth.ts | Код; cancellation/duplicate/late callback нужны на устройстве | HIGH |
| 40 | React web application | apps/web из gcsc-store/api-backend | Build PASS; lint 0 errors/1 warning | MEDIUM |
| 41 | React Native mobile application | apps/mobile из gcsc-website/main | Импорт/хеши и current TypeScript PASS; APK с current wallet candidate не собран и не установлен | HIGH |
| 42 | Store / marketplace application | apps/web | Код; сохранить MarketingShell/AppShell и HashRouter | MEDIUM |
| 43 | Public marketing site | apps/marketing | HTML/CSS перенесены побайтно; публикация не менялась | MEDIUM |
| 44 | Admin dashboard | apps/web + API admin routes;0f4961b2 | Все4 admin routes проверяют актуального активного admin в БД; revoked/demoted/deleted JWT отклонены на PG. Download/review UI smoke PASS; полная end-to-end сессия открыта | HIGH |
| 45 | Smart contracts | contracts | Исходники сохранены; generated builds исключены, rebuild обязателен | HIGH |
| 46 | DAO contracts | contracts/gcsc-core | Код; governance/permissions/security audit не повторялся | HIGH |
| 47 | Token contracts | contracts/gcsc-core; contracts/gcsc-meme | Код; deploy/supply/ключи не изменялись | HIGH |
| 48 | Treasury contracts | contracts/gcsc-core/gcsctreasry1.contract.ts | Код; полномочия и ограничения требуют review | CRITICAL |
| 49 | Escrow contracts | contracts/gcsc-core/gcscrow1111.contract.ts | Код; on-chain suite/build не запускались | CRITICAL |
| 50 | Real-estate related contracts | gcscrealty11; v1.4 gcscrenovate design | Существующий исходник + новый план; реальные займы/выдачи запрещены | CRITICAL |
| 51 | MCP server | tools/mcp-server | 26-tool source registry из store; build/smoke/подключение не выполнены | HIGH |
| 52 | Shared validation | API inline + web/native + domain-simulation | Частичные дубли; общего business-validation контракта ещё нет | HIGH |
| 53 | Shared API types | Web/native собственные типы | Проверить/создать по согласованному API; не пустой package ради структуры | HIGH |
| 54 | Database schema | services/api/v3/database/schema-statements.cjs; API initStorage | 1a2814f1: схема едина для API и SQL-экспорта; колонки, ограничения и индексы совпали на real PG. Произвольные legacy-схемы не сертифицированы | HIGH |
| 55 | Database migrations | services/api/v3/database/migrate-schema.cjs | Real PG: fresh/repeat/additive/legacy-action upgrade, data+DDL rollback и concurrent startup PASS. Старый init.sql отклоняется до изменений. Preflight означает local readiness, не production | CRITICAL |
| 56 | PostgreSQL | API storage + scripts/run-postgres-baseline.mjs | 6666e8e7: real PG18.4:39/39 PASS, включая profile/documents и16 chat scenarios. Fake storage PASS. Полная DB-приёмка/backup открыты; прежний wallet_missing не ослаблен | HIGH |
| 57 | CI | .github/workflows/ci.yml | Новый checks-only workflow; GitHub запуск не выполнен | HIGH |
| 58 | Security checks | limited secret-pattern scan + tests | Активный tree без совпадений узкого скана; полный history/security review отсутствует | HIGH |
| 59 | E2E tests | HTTP/PG + browser component acceptance;0f4961b2 | PG23 результатов с fixture JWT; отдельно реальные React панели с mock HTTP на1280/390 PASS. Это не единый UI/API/DB путь, не регистрация/кошелёк/phone E2E | HIGH |
| 60 | Deployment | docs/migration/source-configs | Только declarations; live root/Pages/GitHub App/rollback не проверены | CRITICAL |

## Дополнение MVP: чат

14 сентября, кандидат6666e8e7: canonical `/api/chat/threads` и messages,
PostgreSQL-only. Мобильный `p<projectId>`/React-state чат не был серверной
доставкой и не мигрируется в общую историю. Новые диалоги разделены по проекту,
исходному заказчику и подрядчику с реальной заявкой; только актуальные участники.
Read-only после отклонения/завершения, UUID повтора, последовательный cursor,
атомарный audit без текста, ограничения тела/частоты и тайм-ауты блокировок.
PG39/39 (16 chat), API168/168, root48/static и fake storage PASS.
Замечания о тайм-аутах и UTF-8 исправлены; независимое ревью6666e8e7 APPROVED,
Copernicus повторил PG39/39 и API168/168.
UI/registration/lead/payment/native приёмки нет;
оплата лида и право на контакт требуют совместной проверки с P2.5 до пилота.
Детали: CHAT-ACCEPTANCE.md. Исходная матрица60 не переименована под новый отчёт.

## Приёмка

Завершение переноса ≠ готовность продукта. Для каждого HIGH/CRITICAL нужны отдельно
команды, результат, среда, негативные сценарии и независимый reviewer. Старые
репозитории нельзя архивировать до проверенного cutover и плана возврата.
