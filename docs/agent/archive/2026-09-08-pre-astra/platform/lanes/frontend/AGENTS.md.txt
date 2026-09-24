# GCSC monorepo operating rules

Respond to the founder in Russian. Read this file and docs/migration/CHECKLIST.md
first, then only task-relevant files. Do not repeatedly scan historical sources.

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
