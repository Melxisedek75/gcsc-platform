# GCSC monorepo operating rules

Respond to the founder in Russian. Read this file and docs/migration/CHECKLIST.md
first, then only task-relevant files. Do not repeatedly scan historical sources.

Consolidation source of truth: Melxisedek75/gcsc-platform, branch main. Active
integration worktree: C:/gcsc-platform/.worktrees/publication. The older root
checkout and three source repositories retain prior/dirty work; do not develop
against them by mistake. Verify HEAD and the active checkpoint before writing.

Owner authorized autonomous continuation on 2026-09-09. Use the existing checklist
as the completion plan and ACTIVE-TASK.json as the checkpoint. Continue directly
from each verified step to the next dependency-ready step; do not wait for a timer
or renewed permission. A local test failure requires diagnosis, not a handoff to
the owner. Preserve a checkpoint before context/usage exhaustion. Scheduled wakes
resume from it if capacity is available; they must not duplicate an active writer.
Stop on owner pause or a concrete unresolved external gate, completing independent
authorized work first. Production acceptance below remains mandatory; general
autonomy does not certify a release or remove review requirements.

Anti-stall rule (owner requested 2026-09-09): after one confirmed unchanged blocker,
record its evidence and explicit resume condition in ACTIVE-TASK.json and select
a different dependency-ready task in the same run. Never spend recurring wakes
only checking RAM, Docker, quota or Git. Retry only after new evidence, a changed
condition or a genuinely different diagnostic hypothesis. Status-file edits alone
are not progress. If every remaining authorized task is blocked, send one concise
blocker summary and pause this heartbeat through automation_update; do not keep
waking every two minutes. Resume only on owner instruction or an explicitly
authorized event-driven recovery. Do not silently drop blocked tasks.

Quota pause (owner requested 2026-09-09): on explicit usage exhaustion, checkpoint
and pause the heartbeat while tools remain available. Never poll quota every two
minutes or emit repeated continuation messages. A prompt cannot stop the scheduler
when the model cannot run. Keep the schedule paused until owner resumption or a
separately configured supported recovery event; do not claim credit top-ups or
plan changes automatically wake this agent. Do not spend reset credits implicitly.

Model economy (owner requested 2026-09-12): the current chat model cannot be
switched by instruction alone. Where delegated model selection is supported, use
the least costly suitable model for a narrow independent task with a short brief,
not the full conversation. Routine work may use Terra/Luna; auth/security review
needs appropriately stronger reasoning (for example Sol). Do not spawn agents
merely to label roles, duplicate the parent's work, or claim unmeasured savings.
Continue directly within the active run; keep the two-minute scheduler paused
unless the owner explicitly requests its reactivation.

Scope: only gcsc-website, gcsc-smart-contractor, gcsc-store. Their owner is not a
fourth repository. Trading/xprclaw and unrelated projects are excluded from the
active tree; historical source refs are provenance, never active build inputs.

Source declarations can be wrong. Verify actual imports, process entrypoints,
tests and deployment configs. The sole application API candidate is
services/api/v3/pure-server.js, not the old Express routes/server implementation.
The v3 subdirectory is intentionally retained to preserve existing relative paths.

Ownership lanes:
- backend: services/api, packages; parent coordinates API contract changes.
- frontend: apps/web, apps/marketing, apps/mobile; no invented API contracts.
- qa: tests, CI, migration tooling and review records; no self-approval.

One writer per worktree. Branches use codex/. Shared contracts require a documented
proposal and coordinated consumer changes. Use small scoped commits. No force-push,
reset/clean, deletion, auto-merge or production actions. Preserve unrelated dirty work.

Wallet identity, application JWT and a signable SDK session are distinct. Test web
and native independently. Never silently retry a broadcast, treat profile metadata
as proof of ownership, weaken signatures, or mark a mock test as device evidence.

Whitepaper v1.4 is an internal decision-support draft. Renovation valuation and draw
recommendations are advisory/simulation only. No real loan, disbursement, custody,
stablecoin or settlement authority is implied.

Independent review may use a separate Codex execution context; Claude is not a
required paid dependency. A failed/unavailable reviewer is NOT a pass. Financial,
auth and migration changes require review evidence before integration/cutover.

Update the checklist with commands, results, limitations and next task. Checkboxes
are checked only for verified completed work. No recurring document-generation loops.
Continuation must be bounded, stop on expired schedule, and notify only on material
progress, failure or owner-required action. Never promise uninterrupted availability.

No new global plugin, paid service, live database, public deployment, wallet signing,
account/privacy change or provider commitment as a side effect of local migration.
