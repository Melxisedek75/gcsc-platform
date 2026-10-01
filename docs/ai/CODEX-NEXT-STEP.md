# Codex — следующий шаг GCSC

Репозиторий: Melxisedek75/gcsc-platform.
Ветка: codex/lead-marketplace-mvp-20261001.
PR: https://github.com/Melxisedek75/gcsc-platform/pull/1

Сначала прочитай AGENTS.md, docs/migration/CHECKLIST.md,
docs/marketplace/VALIDATION-2026-10-01.md,
docs/marketplace/GCSC-LEAD-MARKETPLACE-SPEC.md и
docs/ai/GCSC-AI-AGENTS-VOICE-SPEC.md. Сверь актуальный HEAD.

Контракт маркетплейса уже написан и запушен в этой ветке; не создавай второй.
Он не merged в main и не интегрирован в UI/API. 73 PASS — локальные contract tests,
14/14 — локальная offline-компиляция. Это не GitHub CI, не review и не deploy.

Следующая задача: независимое ревью точного текущего commit, устранение CI blockers
и добавление contract tests в CI. Затем согласовать и подключить marketplace API/UI.

Новое обязательное продуктовое требование: встроенный помощник обеих сторон,
поддерживаемые внешние AI-агенты, профиль бизнеса, подбор лидов, черновики
пропозалов/смет, conversation-to-project, голос и необязательный аватар.
Поиск/черновики работают вне цепи. Публикация и платные действия требуют
установленного подтверждения. Автономные покупки — отдельный будущий этап.

Сохраняй рабочие функции, не вводи новый параллельный backend вместо
services/api/v3/pure-server.js. Развивай существующий tools/mcp-server после
проверки его сборки, ролей и remote authorization. Не обещай поддержку любого
агента без проверки. Не делай merge, production release, реальных платежей,
custody или wallet signing без соответствующих ворот и доказательств.

Отмечай IMPLEMENTED / LOCAL_TESTED / CI_TESTED / REVIEWED / DEPLOYED / PLANNED
отдельно и указывай точные команды, результат и ограничения.
