# GCSC: контрольный список объединения

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
identity v2 уже воспроизведены в QA eb4a84d8, не повторять диагностику. Следующий
шаг: локально доказать поддержку SDK non-broadcast payload с подписанными
domain/nonce/expiry для обоих transport, затем согласовать протокол до изменения
API/клиентов. Не предполагать signMessage и не использовать transfer для входа.
Доказательства: .worktrees/qa/docs/migration/WALLET-SDK-IDENTITY.md.
Доказательства: .worktrees/frontend/docs/migration/API-CONFIG-CONTRACT.md,
.worktrees/frontend/docs/migration/NATIVE-BUILD-BASELINE.md и
.worktrees/backend/docs/migration/WALLET-TRUST-BOUNDARY.md.

Открытые пункты выше не означают, что функцию нужно написать заново: сначала сверить
существующий код и evidence в CAPABILITY-MATRIX.md. Факт сборки не заменяет тест
на телефоне, а mock-транзакция не подтверждает реальную подпись или платёж.
