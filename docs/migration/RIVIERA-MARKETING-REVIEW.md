# RIVIERA marketing review and repair checkpoint

Date: 2026-09-30 UTC. No merge, push or deployment was performed.

## Current checkpoint

- Reviewer: independent read-only Codex context RIVIERA,
  `01a0f0fd-0955-72e0-aa60-0caf8a412362`.
- Original marketing candidate: `89e7607f1e35032beaf2f69a17be6cd75899ef90`.
- First repair candidate: `028b0ff877f5b1faa15e4265240907846f53a4f3`.
- Follow-up candidate: `733e5fda037574adcfde122ca63e605825ee7333`.
- Receiving publication code: `5166e59f17587a27a7ebd924cacfc9b5df1f55b0`.
- Integration verdict: changes required. Independent repair review confirmed
  contrast and seven validator gaps fixed, with no new Medium+ issue. Final
  read-only follow-up independently closed the additional Low robots gap at
  `733e5fda`: 18/18 tests and normal static/diff checks exit 0, no new findings
  in that tiny diff. High/Medium target dependencies below remain open.
  Parent browser verification is not independent reviewer approval.
- High target project disclosure and Medium owner-role mismatch remain open.
  Marketing copy now explicitly describes privacy preview as in development;
  this does not repair access control. Role preselection exists only in
  the separate October-web candidate `2409c780`.
- Low contrast issue, parser coverage gaps and reproduced text-reflow clipping
  were addressed in the repair candidate. Re-review covers only these repairs,
  not whole-MVP acceptance.

## Parent repair verification

Commands below ran in `C:/gcsc-platform/.worktrees/marketing-october`.
Node v25.9.0, local Python 3.14.3, installed Edge 154.0.4258.37.
Nothing was installed. No app accounts, APIs, wallets or external URLs were used.
The table below describes `028b0ff8`. Follow-up `733e5fda` changes only validator,
fixtures and ledger: two new tests failed before its fix, then 18/18 tests,
normal static validation and diff checks exited 0. For this two-page public site,
nonempty Disallow and wildcard rules now fail closed for separate policy review;
no unsupported crawler precedence is inferred from Python's first-match parser.
Both conflicting rule orders are tested. Current robots.txt is unchanged.
Browser evidence is reused from `028b0ff8`; HTML/CSS/media/browser harness did
not change in `733e5fda`, and no new browser run is claimed.

| Command | Exit | Result |
| --- | --- | --- |
| `node apps/marketing/validate-static.mjs --test` | 0 | 16 tests; original seven missed mutations now rejected; valid quoted/encoded links retained |
| `node apps/marketing/validate-static.mjs` | 0 | 2 pages, 7 account CTAs |
| `node validate-static.mjs` from `apps/marketing` | 0 | 2 pages, 7 account CTAs; location-independent entry point |
| `node --check apps/marketing/validate-static.mjs` | 0 | Syntax |
| `node --check apps/marketing/verify-browser.cjs` | 0 | Syntax |
| `git diff --check` and staged equivalent | 0 | No whitespace errors |
| `node apps/marketing/verify-browser.cjs` with process-local variables below | 0 | 8 viewport/text cases, 0 page errors, 0 failed assertions |

Reproduce browser check in PowerShell with already installed dependencies:

```powershell
$env:NODE_PATH='C:\Users\rivne\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:GCSC_BROWSER_CHANNEL='msedge'
node apps/marketing/verify-browser.cjs
```

The browser opens `file://` locally, blocks HTTP(S), disables page JavaScript
and uses reduced motion. Width/height matrix: 1440x1000, 1920x1080, 768x1024,
390x844, 360x800, 320x740, 844x390, and 390x844 with simulated 200% text.
It checks hero-content containment, whole-page horizontal overflow, image decode,
mobile menu/anchor, dark hover and focus on light/dark surfaces. Desktop, mobile
and narrow screenshots were visually inspected by the parent.

Before the layout fix the narrow hero container was smaller than its content.
At doubled text, the title/actions were clipped and scroll width was 449 px
at a 390 px viewport. After the fix content can grow; all eight cases have no
horizontal overflow and no clipped hero content. Short landscape and enlarged
text require vertical scrolling; they are not evidence of a next-section hint
in every first viewport.

Measured contrast after repair: dark hover 8.3058:1; focus on white 6.6978:1;
focus on dark 8.3058:1. The hero bitmap decoded as 1774x887 in every case.

Local artifacts, relative to marketing worktree:
- `.tmp/marketing-review/result-before-layout.json`: failed initial layout run.
- `.tmp/marketing-browser/result.json`: final browser assertions.
- `.tmp/marketing-browser/{desktop,mobile,narrow,text-200,...}.png`: captures.
- Source verifier: `apps/marketing/verify-browser.cjs`; artifacts are ignored,
  source is committed. A rerun replaces generated captures.

Limitations: not real browser zoom, a screen reader, Safari/Firefox/device QA,
full WCAG or Core Web Vitals acceptance. The parser is focused, not an HTML5
conformance/security audit. Browser assets on historical whitepaper are not
covered by the homepage matrix. Receiving-app role behavior, real registration,
PostgreSQL, payments, WebAuth, public domains, video rights and deployment
remain separate gates. Do not check L18/L20/L21 as complete from this evidence.

## Independent original report

The report below is preserved as delivered, with line references belonging to
the original pinned versions rather than later repairs.

**Commit Reviewed**
RIVIERA, независимое read-only ревью.

- **C:** `89e7607f1e35032beaf2f69a17be6cd75899ef90`, `codex/marketing-october-20260928`.
- **T:** `5166e59f17587a27a7ebd924cacfc9b5df1f55b0`, `codex/monorepo-publication`.
- **B:** `d89f15e60169253292519fac9203681bd4374fba`, подтверждённый merge-base.

**Scope**
Проверен полный `B..C`: 10 commits, 12 файлов, включая HTML/CSS, изображение, whitepaper, CLAIM-LEDGER, creative/video documents и validator. Прочитаны кандидатный AGENTS, текущие publication CHECKLIST/WORK-LANES, October product contract и относящийся к CTA код target.

Оба worktree чистые до и после проверки; HEAD не изменились. Файлы, Git/index, сервисы и внешние системы не изменялись; сетевых запросов не было.

**Commands Executed**
Обозначения cwd: **M** = `C:\gcsc-platform\.worktrees\marketing-october`; **P** = `C:\gcsc-platform\.worktrees\publication`. C/T/B в таблице обозначают полные SHA выше.

| Команда / проверка | cwd | Exit | Точный результат |
|---|---|---:|---|
| `git --no-optional-locks status --short --branch`; `rev-parse HEAD`, до/после | M, P | 0 | Чисто; HEAD=C и T; publication ahead 106 |
| `git --no-optional-locks merge-base C T` | M | 0 | B |
| `git --no-optional-locks merge-base --is-ancestor 2409c780fc098965f5b50b0e1f4d98f53d4edfd8 T` | P | 1 | October-web **не входит** в target |
| `git --no-optional-locks diff --check B C` | M | 0 | Замечаний нет |
| `node --version`; `node --check apps/marketing/validate-static.mjs` | M | 0 | `v25.9.0`; syntax OK |
| `node apps/marketing/validate-static.mjs`, два запуска | M | 0 | `Marketing static checks PASS: 2 pages, 7 account CTAs` |
| `node scripts/validate-auth-registration-feedback.mjs` | P`\apps\web` | 0 | `auth registration feedback validation passed` |
| `node scripts/validate-auth-channel-verification-ui.mjs` | P`\apps\web` | 0 | `auth channel verification UI validation passed` |
| Inline `node -e`, исходники из pinned Git objects | P | 0 | Role probe: 2/2 воспроизведения; Dashboard: 5/5 случаев; project GET: 4/4 воспроизведения |
| Inline `python -I -S -B -c`, HTMLParser/XML | M | 0 | HTML: 11/15 уникальных IDs, 25/27 ссылок; вложенность, локальные цели, ARIA references и sitemap XML прошли |
| Inline `node -e`, PostCSS, metadata/assets, secrets, mutations | M, P | 0 | CSS syntax OK; PNG 1774×887, 1 987 776 bytes; 11 текстовых файлов, 0 найденных secret patterns; 7 дефектных mutations пропущены валидатором |

Перед auth validators сверены 24 входных файла с T; перед marketing probes сверены 9 файлов с C. Версии использованных локальных TypeScript/PostCSS/router совпали с target lockfile. Первоначальный asset probe завершился exit 1 из-за лимита буфера `ENOBUFS`; повтор с 8 MiB завершился exit 0. Это ошибка проверочного harness, не кандидата.

Просмотр через `git show/diff/ls-tree/blame`, `Get-Content` и поисковые команды выполнялся только на чтение. Поиск обработчиков role-query в target вернул exit 1: совпадений нет.

**Findings By Severity**
1. **High: унаследованная зависимость target не обеспечивает обещанный privacy-preview.**
   Ссылки: кандидат [index.html:111](C:/gcsc-platform/.worktrees/marketing-october/apps/marketing/index.html:111); target [pure-server.js:3867](C:/gcsc-platform/.worktrees/publication/services/api/v3/pure-server.js:3867), [pure-server.js:3874](C:/gcsc-platform/.worktrees/publication/services/api/v3/pure-server.js:3874).
   **Воспроизведение/evidence:** извлечённые GET-обработчики и storage helpers T получили синтетический неопубликованный проект с `title`, `description`, точным `location`. Для JSON и mock-PG оба обработчика вернули 200 с этими полями без проверки пользователя: 4/4. Общий dispatcher также не добавляет авторизацию.
   **Влияние:** принимающий target нельзя выдавать за безопасный October preview; данные заявки доступны до project-specific paid access. Это существующий дефект target, **не новая backend-регрессия marketing**.
   **Безопасное исправление:** до приёмки этого CTA-сценария интегрировать независимо проверенные privacy API и совместимый web consumer. Пока зависимости отсутствуют, явно описывать preview как планируемый и не представлять target как подтверждённую реализацию.

2. **Medium: новый owner-CTA открывает регистрацию подрядчика.**
   Ссылки: [index.html:89](C:/gcsc-platform/.worktrees/marketing-october/apps/marketing/index.html:89), [CLAIM-LEDGER.md:41](C:/gcsc-platform/.worktrees/marketing-october/apps/marketing/CLAIM-LEDGER.md:41); target [AccountAccess.tsx:11](C:/gcsc-platform/.worktrees/publication/apps/web/src/pages/dashboard/AccountAccess.tsx:11).
   **Воспроизведение/evidence:** гость переходит на `/#/dashboard?role=homeowner`. Target игнорирует query и инициализирует `contractor`. Проверка исходного компонента в памяти подтвердила также `role: contractor` в перехваченном регистрационном payload.
   **Влияние:** выбравший owner посетитель может создать неправильный тип аккаунта; owner-действия затем недоступны. Утверждение ledger о предварительном выборе роли неверно для T.
   **Безопасное исправление:** сначала принять проверенный role-query consumer либо временно убрать обещание role-specific перехода. Реализация есть в `2409c780`, но её наличие в отдельной ветке не закрывает интеграцию.

3. **Low: новые интерактивные цвета не достигают требуемого контраста.**
   Ссылка: [site.css:55](C:/gcsc-platform/.worktrees/marketing-october/apps/marketing/site.css:55); дополнительное состояние focus задано на строке 20.
   **Воспроизведение/evidence:** при наведении на whitepaper-ссылку секции Future правило `.text-link:hover` перекрывает светлый цвет: `#b94d32` на `#102b27`, **2.986:1** вместо 4.5:1 для этого текста. Focus outline `#e87856` на белом: **2.896:1**, ниже 3:1.
   **Влияние:** ухудшается различимость ссылки и клавиатурного фокуса.
   **Безопасное исправление:** отдельный контрастный hover для тёмных секций и подходящий focus-цвет для светлых поверхностей; затем браузерная проверка.

**Checked Areas**
Без дополнительных подтверждённых находок:
- HashRouter корректно разбирает путь `/dashboard` и query внутри hash. Авторизованному пользователю query не меняет роль; ошибка восстановления сессии возвращает AccountAccess.
- Локальные файлы/anchors, `lang`, единственный H1, ARIA references, `noopener`; CNAME сохранён.
- Canonical, OG/Twitter image и sitemap согласованы с `xprnet.org`. Whitepaper имеет `noindex`, не включён в sitemap, но разрешён для обхода.
- Главная обозначает pilot in development; финансовые инструменты вынесены в будущее. Видео-документы не выдают сценарии за готовые фильмы, изображение обозначено в ledger как generated concept.
- В изменённых текстовых файлах не обнаружены проверенные паттерны секретов или credentials в URL. Это ограниченный scan, не аудит всей истории.

**Test Gaps**
- [validate-static.mjs:11](C:/gcsc-platform/.worktrees/marketing-october/apps/marketing/validate-static.mjs:11) пропустил все семь изменений **только в памяти**: удалённый canonical, неверные social-image URLs, блокирующий robots, owner-CTA внутри комментария, `javascript:` URL, duplicate ID и отсутствующую цель в одинарных кавычках. Это недостатки покрытия, не семь дефектов текущего HTML.
- Нет browser/visual acceptance, keyboard/screen-reader/zoom/mobile проверки или измерений производительности. Особенно нужны проверки фиксированной высоты hero на 320/390 px и при увеличении текста.
- Реальная регистрация, PostgreSQL, оплаты, WebAuth, deployed domains и combined E2E не запускались. In-memory probes используют заглушки и не заменяют эти обязательные проверки.
- Build/CI с созданием output, сетевые проверки и установки запрещены условиями ревью; PASS им не присваивается.
- Whitepaper сохраняет исторические формулировки «uses licensed partners» и «Every sensitive workflow preserves…». Фактическое подтверждение этих утверждений требует отдельного product/legal evidence; общий статус draft не доказывает их.
- Privacy/terms/support и media-rights acceptance остаются открытыми. Прежние два `mailto:` и четыре старых anchor ID удалены; внешнее использование старых anchors не проверялось.

**Final Verdict**
Для интеграции нужно закрыть owner-CTA mismatch и явно зафиксировать зависимости privacy-preview/API/web. После этого проверить точный объединённый SHA; результаты отдельных веток и regex validators не заменяют combined acceptance. Этот отчёт не разрешает deploy и не оценивает готовность всего backend к production.

**AI_REVIEW_GATE=CHANGES_REQUIRED**

## Independent first repair report

**RIVIERA: Повторное Ревью**
Проверены все 7 файлов ремонта `89e7607f..028b0ff8`, полный candidate SHA: `028b0ff877f5b1faa15e4265240907846f53a4f3`. Target остался `5166e59f17587a27a7ebd924cacfc9b5df1f55b0`.

Marketing worktree чистый до/после, файлы соответствуют candidate. Появившиеся publication docs/checkpoint-изменения parent не использованы как доказательства. Ничего не изменял.

**Команды И Результаты**
Cwd: `C:\gcsc-platform\.worktrees\marketing-october`. Среда: Node `25.9.0`, Python `3.14.3`.

| Команда | Exit | Результат |
|---|---:|---|
| `node apps/marketing/validate-static.mjs` | 0 | `PASS: 2 pages, 7 account CTAs` |
| `node apps/marketing/validate-static.mjs --test` | 0 | 16 тестов, `OK` |
| `node --check apps/marketing/validate-static.mjs` | 0 | Ошибок синтаксиса нет |
| `node --check apps/marketing/verify-browser.cjs` | 0 | Ошибок синтаксиса нет; verifier **не запускался** |
| `git --no-optional-locks diff --check 89e7607f1e35032beaf2f69a17be6cd75899ef90 028b0ff877f5b1faa15e4265240907846f53a4f3` | 0 | Замечаний нет |

Дополнительные независимые проверки в памяти завершились exit 0: повтор семи прежних mutations, разбор CSS/расчёт контраста и проверка порядка robots-правил.

**Новая Находка**
**Low: robots-проверка может пропустить более конкретный запрет.**
[validate_static.py:111](C:/gcsc-platform/.worktrees/marketing-october/apps/marketing/validate_static.py:111)

Воспроизведение: для `User-agent: *`, при сохранённом правильном Sitemap:
```text
Allow: /
Disallow: /whitepaper.html
```
Валидатор принимает этот вариант; после перестановки двух строк отклоняет. Использованный `RobotFileParser` здесь применяет первое совпадение, тогда как более конкретный запрет должен блокировать whitepaper независимо от порядка.

Влияние: возможен ложный результат проверки crawlability, необходимой для чтения `noindex`. **Текущий robots.txt такого дефекта не содержит.** Безопасное исправление: учитывать специфичность правил либо консервативно отклонять перекрывающиеся правила; добавить fixtures обоих порядков.

**Итог Ремонта**
- **Прежний Low contrast устранён.** Независимый расчёт по CSS: dark hover **8.3058:1**, white focus **6.6978:1**, dark focus **8.3058:1**. Цветовые переопределения и порядок селекторов корректны: [site.css:21](C:/gcsc-platform/.worktrees/marketing-october/apps/marketing/site.css:21), [site.css:59](C:/gcsc-platform/.worktrees/marketing-october/apps/marketing/site.css:59).
- **Все семь исходных coverage-воспроизведений закрыты: 7/7 отклонены.** Это canonical, social image, блокирующий robots, CTA в комментарии, опасный URL, duplicate ID и отсутствующая single-quoted ссылка. Дополнительный robots-пробел описан выше.
- **Auto-height/wrap:** фиксированные `height/max-height` hero удалены; добавлены переносы и ограничения ширины ссылок/кнопок. Причины прежнего clipping/overflow адресованы в исходнике: [site.css:39](C:/gcsc-platform/.worktrees/marketing-october/apps/marketing/site.css:39).
- **Claim ledger корректно сохраняет блокеры**, не выдавая отдельные ветки за интеграцию; privacy-текст главной теперь описывает разрабатываемый сценарий: [CLAIM-LEDGER.md:24](C:/gcsc-platform/.worktrees/marketing-october/apps/marketing/CLAIM-LEDGER.md:24).
- **Новых подтверждённых Medium/High/Critical в этом ремонте не обнаружено.**

**Ограничения И Gate**
Браузер, сеть, установки и сервисы не запускались. Результаты Edge и screenshots parent остаются **не независимым evidence**. Отсутствие clipping, настоящий browser zoom и полный WCAG самостоятельно не подтверждены.

Прежние **High privacy disclosure** и **Medium owner CTA** остаются OPEN против pinned target; backend повторно не проверялся. Их документирование не заменяет исправление и приёмку объединённых зависимостей.

**AI_REVIEW_GATE=CHANGES_REQUIRED**

## Independent final robots follow-up

**RIVIERA: Финальная Проверка**
SHA: `733e5fda037574adcfde122ca63e605825ee7333`.
Проверен только diff от `028b0ff8`: 3 файла, 19 добавленных строк.

Cwd: `C:\gcsc-platform\.worktrees\marketing-october`.

| Команда | Результат |
|---|---|
| `node apps/marketing/validate-static.mjs --test` | exit 0; **18/18 OK** |
| `node apps/marketing/validate-static.mjs` | exit 0; **2 pages, 7 account CTAs** |
| `git --no-optional-locks diff --check 028b0ff8 733e5fda` | exit 0; замечаний нет |

**Low Robots Закрыт**
[validate_static.py:107](C:/gcsc-platform/.worktrees/marketing-october/apps/marketing/validate_static.py:107) теперь отклоняет любой непустой `Disallow` независимо от порядка правил. Оба порядка и дополнительное ограничение `/private` покрыты проходящими тестами. Wildcard-ограничения также требуют отдельного review; ledger честно описывает консервативную политику, а не реализацию RFC specificity.

Текущий `robots.txt` не изменён. Новых подтверждённых замечаний в этом diff нет.

Marketing чистый до/после, HEAD соответствует указанному SHA. Записей, сети, browser/layout/backend-проверок не выполнял.

Прежние **High privacy disclosure** и **Medium owner CTA** остаются **OPEN** против publication target. Закрытие Low не означает одобрения общей интеграции.

**AI_REVIEW_GATE=CHANGES_REQUIRED**
