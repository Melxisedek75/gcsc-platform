# GCSC Platform

Единый monorepo для трёх репозиториев владельца Melxisedek75:
`gcsc-website`, `gcsc-smart-contractor` и `gcsc-store`.

Целевой репозиторий: https://github.com/Melxisedek75/gcsc-platform (private).
Новая разработка ведётся от единой `main`, а не от трёх старых репозиториев.
Рабочая папка этой миграции: `C:\gcsc-platform\.worktrees\publication`.

**Не production-релиз.** Перенесённый код, успешная проверка переноса и полностью
работающий продукт — разные этапы готовности.

Текущий прогресс: [контрольный список](docs/migration/CHECKLIST.md),
[матрица 60 возможностей](docs/migration/CAPABILITY-MATRIX.md),
[результаты проверок](docs/migration/RESULTS-2026-09-06.md).

Original repositories are not deleted, archived, made private, or modified by
this local migration. Local backups are outside this repository at
`C:\gcsc-migration-20260906-final`. Never publish those backups or historical refs
before a dedicated secrets/license review.

## Структура

- `services/api/v3/pure-server.js`: единственный application API.
- `apps/web`, `apps/mobile`, `apps/marketing`: веб, телефон, публичный сайт.
- `contracts/gcsc-core`, `packages`: контракты и общие модули.
- `docs`, `tests`, `scripts`, `.github`: план, evidence и проверки.

## Проверка чистого клона

Node.js >=20. Команды запускаются из корня; параметры окружения и секреты не
нужны для базовой проверки. Установка зависимостей не запускает deploy.

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm --prefix services/api/v3 ci --ignore-scripts --no-audit --no-fund
npm run test:api
npm --prefix apps/web ci --ignore-scripts --no-audit --no-fund
npm run test:api-config
npm run build:web
npm run lint:web
npm --prefix contracts/gcsc-core ci --ignore-scripts --no-audit --no-fund
node --test tests/contract-runner.test.mjs tests/local-test-database.test.mjs
```

Native/SDK проверки требуют отдельного `npm ci` внутри `apps/mobile`.
`npm run test:source-history` является отдельной локальной проверкой сохранённых
archive refs. В обычном GitHub-клоне их намеренно нет: переносимый provenance
проверяется командой `npm test` без публикации legacy-истории.

`check:integration-contracts` остаётся отдельным красным gate до завершения
wallet-first API; его нельзя считать PASS на основании успешного переноса.
