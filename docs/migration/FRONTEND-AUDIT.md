# Frontend audit: консолидация GCSC

Дата: 2026-09-06. Область: локальные tracked frontend/deployment-исходники website/store, выбранный upstream native baseline и MCP store. Это аудит исходников, не release approval.

## Границы и происхождение

| Объект | Зафиксировано | Основание / ограничение |
|---|---|---|
| Ровно три репозитория | Melxisedek75/gcsc-website, gcsc-store, gcsc-smart-contractor | Область утверждена пользователем; backend исследует parent |
| Store canonical candidate | C:\gcsc-store, api-backend, 2f023068cb7b5a08a481f7fb0a503d3a5f0f6248 | Локальный HEAD 2f02306 проверен; полный свежий upstream SHA предоставлен пользователем |
| Store upstream main | 45b457dfbec69a14f6f2c46ded5f4bf8ee9b3750 | Свежая проверка пользователя; прежний локальный origin/main устарел. НЕ равен api-backend |
| Website canonical source | upstream b55217ec9c177a732a726ba3c193956036c39aa1 | Выбран parent и записан в import-manifest.json. Первичный аудит C:\gcsc был на локальном HEAD 288c2525, не на выбранном upstream |
| Native canonical source | C:\gcsc-platform\apps\mobile из website b55217ec9c177a732a726ba3c193956036c39aa1 | Выбран parent; manifest и SHA-256 пяти выбранных native файлов проверены, см. F17 |
| Recovery НЕ canonical | 3bd60239; C:\gcsc\.tmp\codex\mobile-lead-payment-recovery-week | Unreviewed candidate по решению parent. Первичные recovery observations не заменяют evidence импортированного baseline |
| Импортированный candidate | C:\gcsc-platform; docs/migration/import-manifest.json | JSON прочитан: 421 file entry; mode LOCAL_CANDIDATE_NOT_RELEASED. Проверка всех 421 файлов и истории остаётся parent |
| Snapshot mirror | C:\gcsc-migration-20260906-final | Исправленный путь предоставлен пользователем; предыдущие два snapshot partial. Полнота mirror этим аудитом НЕ проверена |
| Независимый QA | UNVERIFIED: ошибка usage limit | Сообщение пользователя; review не завершён, PASS отсутствует |
| Dirty state | Store: untracked vercel.json; website: существующие tracked/untracked изменения | Ничего не очищалось. Untracked vercel.json и секреты не читались |

Ни источники, ни snapshot не менялись этим исполнителем. Разрешённые записи: только этот файл и capability-matrix.md. Не выполнялись установки, commits, fetch, deployment, API-вызовы, подписи и проверки live-систем. Snapshot/history/import mapping принадлежат parent.

## Канонические компоненты и точный frontend mapping

Назначения относительны C:\gcsc-platform. Parent выполнил source import; ниже принятый mapping и ограничения. Manifest подтверждает декларации provenance, а не интеграцию/deploy. Этот исполнитель ничего не переносил.

| Источник | Назначение parent | Причина |
|---|---|---|
| C:\gcsc-store\src\**, public\**, scripts\** | apps/web/ с сохранением подпутей | Сохранить приложение, assets, валидаторы и оба shell без изменения поведения |
| C:\gcsc-store\package.json, package-lock.json, index.html, vite.config.ts, tsconfig.json, tsconfig.app.json, tsconfig.node.json, eslint.config.js, postcss.config.js, tailwind.config.js, components.json | apps/web/ с теми же именами | Полный frontend build/config boundary; lockfile сохранять как provenance до решения parent о workspace lock |
| C:\gcsc-store\railway.json | apps/web/railway.json | Сохранить декларацию; root directory/watch paths адаптировать перед подключением hosting |
| Website b55217ec9c177a732a726ba3c193956036c39aa1: index.html, whitepaper.html, whitepaper.css, CNAME | apps/marketing/ с теми же именами | Manifest: 4 файла. Минимальный статический сайт; публичный whitepaper не заменять draft |
| Website b55217ec9c177a732a726ba3c193956036c39aa1: mobile/smartcontractor/** | apps/mobile/ | Manifest: 70 файлов. НЕ recovery 3bd60239; Expo/native отдельно от web |
| Store 2f023068cb7b5a08a481f7fb0a503d3a5f0f6248: mcp-server/** | tools/mcp-server/ | Manifest: 14 файлов; отдельный stdio runtime, не frontend bundle |
| C:\gcsc-store\api\**, render.yaml | НЕ apps/web и НЕ apps/marketing | Store API не canonical; parent выбрал services/api/v3 из backend f793bfb0cd19562c908a31ec4e1469ea56d849b7. Backend поведение UNVERIFIED pending parent/QA |
| C:\gcsc\construction-ai\public\**; recovery worktree | НЕ apps/web и НЕ canonical apps/mobile | Legacy Express/Capacitor и unreviewed recovery не подменяют upstream baseline |
| Website draft HTML, block-producer variants, xprclaw\** | Сохранить provenance; исключить из автоматического marketing publish | Отдельные/альтернативные поверхности, не удалять и не публиковать без решения parent |

Привязки исходников ниже абсолютные. F01-F11/F13-F16 относятся к исходному локальному аудиту; F12 заново проверен в импортированном native baseline, F17 фиксирует выборочную проверку manifest. Нельзя автоматически распространить старые проверки на весь imported tree.

| Evidence ID | Локальное доказательство | Вывод только в проверенной области |
|---|---|---|
| F01 | [App.tsx:47](C:/gcsc-store/src/App.tsx:47) | Маркетинг /, /pricing, /about, /security, /contact и app /dashboard, /contractors/:id, /token, /wallet в одном React-приложении |
| F02 | [main.tsx:7](C:/gcsc-store/src/main.tsx:7), [vite.config.ts:8](C:/gcsc-store/vite.config.ts:8) | HashRouter и base './'; сохранить URL вида /#/dashboard |
| F03 | [api.ts:2](C:/gcsc-store/src/services/api.ts:2), [api.ts:229](C:/gcsc-store/src/services/api.ts:229) | VITE_API_URL либо production Railway /api; Bearer token в localStorage |
| F04 | [api.ts:281](C:/gcsc-store/src/services/api.ts:281), [api.ts:353](C:/gcsc-store/src/services/api.ts:353) | Клиент требует admin, financing, escrow и milestone API; наличие клиента не доказывает handlers |
| F05 | [webauth.ts:35](C:/gcsc-store/src/services/webauth.ts:35) | @proton/web-sdk; VITE_XPR_RPC_URL либо proton.greymass.com; requestAccount gcsc.store; logo от текущего origin |
| F06 | [xprSettlement.ts:3](C:/gcsc-store/src/services/xprSettlement.ts:3), [xprSettlement.ts:92](C:/gcsc-store/src/services/xprSettlement.ts:92) | Testnet chain/RPC overrides, gcscrow1111, submitms/approvems/releasems/disputems; broadcast true, не mock |
| F07 | [api/server.js:13](C:/gcsc-store/api/server.js:13), [api/server.js:38](C:/gcsc-store/api/server.js:38), [api/server.js:52](C:/gcsc-store/api/server.js:52) | Store-local server: origins gcsc.store/localhost:5173, шесть mounted route groups, static ../dist |
| F08 | [railway.json:3](C:/gcsc-store/railway.json:3), [render.yaml:6](C:/gcsc-store/render.yaml:6) | Railway frontend build/preview/watch paths; Render rootDir api. Это декларации, не live evidence |
| F09 | [index.html:50](C:/gcsc/index.html:50), [whitepaper.html:8](C:/gcsc/whitepaper.html:8), [CNAME:1](C:/gcsc/CNAME:1) | Website Launch App -> gcsc.store; whitepaper.css соседний; объявлен домен xprnet.org |
| F10 | [index.html:8](C:/gcsc/index.html:8), [block-producer.html:7](C:/gcsc/block-producer.html:7) | Marketing использует внешние CDN; legacy HTML ссылается на styles.css/script.js, отсутствующие в tracked root |
| F11 | [server.js:1864](C:/gcsc/construction-ai/server.js:1864), [capacitor.config.json:4](C:/gcsc/construction-ai/capacitor.config.json:4) | construction-ai/public обслуживается Express и используется как Capacitor webDir |
| F12 | [mobile payments.ts:216](C:/gcsc-platform/apps/mobile/lib/payments.ts:216), [mobile webauth.ts:52](C:/gcsc-platform/apps/mobile/lib/webauth.ts:52), [app.json:6](C:/gcsc-platform/apps/mobile/app.json:6), [auth.ts:94](C:/gcsc-platform/apps/mobile/lib/auth.ts:94) | Повторно прочитан upstream baseline b55217ec: EXPO_PUBLIC_API_BASE_URL либо Railway origin; native testnet/deep links, requestAccount gcsctoken111, scheme smartcontractor. Mobile verification требует /api/verify; web требует /api/auth/verification/check, payloads различаются. Комментарий auto-deploy не подтверждён |
| F13 | [MCP index.ts:17](C:/gcsc-store/mcp-server/src/index.ts:17), [client.ts:4](C:/gcsc-store/mcp-server/src/client.ts:4) | MCP stdio регистрирует auth/projects/bids/escrow/admin/financing/token; GCSC_API_URL либо production /api, токен из GCSC_API_TOKEN либо login |
| F14 | [MCP admin.ts:34](C:/gcsc-store/mcp-server/src/tools/admin.ts:34), [escrow.ts:45](C:/gcsc-store/mcp-server/src/tools/escrow.ts:45) | MCP включает mutating HTTP tools; не считать автоматически read-only/безопасным |
| F15 | [EstimatorPanel.tsx:13](C:/gcsc-store/src/pages/dashboard/EstimatorPanel.tsx:13), [estimator.ts:69](C:/gcsc-store/src/pages/dashboard/estimator.ts:69) | UI вызывает локальный calculateEstimate; это не доказательство AI inference |
| F16 | [LoansFinancingPanel.tsx:44](C:/gcsc-store/src/pages/dashboard/LoansFinancingPanel.tsx:44), [api.ts:297](C:/gcsc-store/src/services/api.ts:297) | Demo financing/precheck поверхность и клиент; реальное lending НЕ подтверждено |
| F17 | [import-manifest.json:1](C:/gcsc-platform/docs/migration/import-manifest.json:1) | JSON: 421 записи; apps/web 156, apps/mobile 70, apps/marketing 4, tools/mcp-server 14. SHA-256 совпали с manifest для apps/mobile/{package.json,app.json,lib/api.ts,lib/payments.ts,lib/webauth.ts}, apps/web/src/services/api.ts, tools/mcp-server/src/client.ts. Это 7 выбранных файлов, НЕ полный import audit |

## Блокеры интеграции

| ID | Блокер | Что должно закрыть parent/QA |
|---|---|---|
| B01 | Routing: HashRouter, marketing/app shells и внешние CTA | Утвердить origin/base/hash URLs, refresh/deep-link checks, logo/assets; не смешивать route split с переносом |
| B02 | API contract не согласован | Сопоставить web/MCP /api, mobile origin + /api/payment/* с canonical services/api/v3; methods, schemas, auth, roles, errors, payment semantics. Проверено: mobile auth.ts:95 POST /api/verify {email,otp} против web api.ts:260 /auth/verification/check {email,phone,role,channel,code}. Store-local entrypoint не монтирует admin/financing/milestones; canonical backend UNVERIFIED pending parent/QA |
| B03 | Production fallbacks и wallet signing | Offline tests только с сетевым запретом или mocked/local API; никакого tools/call, wallet broadcast или реальных payments |
| B04 | Origins/storage | Проверить CORS: Vite 3000 против server allowlist 5173; новый origin не переносит localStorage login/session; разделить mobile/browser wallet adapters |
| B05 | Hosting и archive/privacy | Проверить GitHub App access, repo/branch/root, watch patterns, publish directory, CNAME/DNS/Pages, rollback до archive/private. Не публиковать monorepo root с internal docs/backend |
| B06 | Independent QA отсутствует | QA завершился ошибкой quota; требуется новый независимый review. AI_REVIEW_GATE=PASS не заявлен |
| B07 | Источник 60 имён не прочитан | Переданный путь C:\Users\rivne\Downloads\GCSC_MONOREPO_MASTER_MIGRATION_PROMPT.md проверен: Get-Content вернул file not found. Поиск имени в Downloads, C:\gcsc, C:\gcsc-platform и corrected mirror не дал совпадений. Строки 379-438 не доступны; не выдумывать exact names и не считать placeholders capabilities |
| B08 | Provenance branch divergence | Использовать store api-backend 2f023068..., а не считать stale origin/main равным ему; imported hashes/dirty overlays проверяет parent |

## Baseline и ограничения тестов

| Проверка | Команда / cwd | Результат и граница |
|---|---|---|
| T01 | node scripts/validate-webauth-integration.mjs; C:\gcsc-store | PASS в предшествующем read-only этапе этой задачи; статический source validator, НЕ wallet E2E |
| T02 | node scripts/validate-xpr-settlement-layer.mjs; C:\gcsc-store | PASS там же; строковые проверки, НЕ транзакция и не on-chain validation |
| T03 | node scripts/validate-production-trust-workflow.mjs; C:\gcsc-store | PASS там же; source contract, НЕ проверка backend authorization |
| T04 | git diff --check с ограничением на проверенные frontend/config пути; C:\gcsc и C:\gcsc-store | PASS там же; не проверяет untracked files и не заменяет build |
| Web build/lint | npm run build / npm run lint; C:\gcsc-store | НЕ запускались. package.json:8-9: tsc -b && vite build / eslint .; build пишет dist/cache |
| Web scripts | package.json:11-27 | 17 check:* деклараций; запущены только T01-T03; отдельного test script нет |
| MCP | npm run check; C:\gcsc-store\mcp-server | НЕ запускался. package.json:14 собирает tsc и запускает smoke; сборка пишет dist |
| MCP smoke scope | mcp-server/test/smoke.mjs:14,65,73 | Исходник ожидает 26 tools, initialize и tools/list; tools/call не выполняет. Требуется соответствующий source build; не доказательство API-функций |
| Mobile canonical | C:\gcsc-platform\apps\mobile\package.json:6 | Скрипты start/android/ios/web; test script ОТСУТСТВУЕТ в выбранном b55217ec baseline. Прежняя запись npm test относилась только к исключённой recovery-ветке и не применима к canonical |
| Marketing | Статические index.html + whitepaper.html + CSS | Сборка не объявлена tracked root package.json; CDN/font loading требует сеть, runtime render не проверен |

Повторять T01-T03 безопасно после просмотра неизменности скриптов: они читают source и не вызывают API. Полный backend check, dev server, MCP tool calls и mobile tests в этом bounded docs этапе не запускать.

Итог: source evidence != imported != integrated != tested end-to-end != deployed. Backend/contracts/AI: UNVERIFIED pending parent/QA. Routing/API contracts и независимый review остаются блокерами.
