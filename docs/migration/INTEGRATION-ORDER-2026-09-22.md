# Candidate integration order

Date: 2026-09-22 (America/Los_Angeles)

This is a conflict analysis and proposed order only. No merge or deploy occurred.

## Current October continuation, 2026-09-30

The older sequence below is historical. Current reviewed local candidates:
backend `c46bd1b45c40bf60bb683027c219b680e91c85f9`, QA
`1bceb8f58dac6840eae614788d72da8b06af0a66`, October-web
`b1cda59be1d9e37cf2d282a5570444424e163798`, marketing `733e5fda`.
Scope/limits are in PAID-PROJECT-DETAILS-REVIEW.md and the marketing/role reports.
Backend and QA are clean; reviews and their test processes have completed.

Read-only receiving-tree analysis (publication HEAD `b14eacda`, app code
`5166e59f`; later coordination-only commits do not change that app code):

```powershell
git merge-base codex/monorepo-publication codex/backend-integration
git merge-tree --write-tree --name-only codex/monorepo-publication codex/backend-integration
```

Merge-base: `6be2c5a13d52cee07ef3b6c63b373706ed3d9c75`. Analysis exit1,
temporary Git tree `d404fc0ebebda6fe53484c9d0993edfb32257553`. Conflicts:
- `docs/migration/adaptations.json`
- `services/api/v3/pure-server.js`
- `services/api/v3/tests/escrow-milestones.test.js`
- `services/api/v3/tests/payment-reconciler.test.js`
- `services/api/v3/tests/postgres-workflow-smoke.js`

This only wrote local Git objects, not a branch/index/worktree merge. There is
no ongoing merge to abort. Do not replace the publication API or packages with
the backend checkout wholesale: publication also has later schema-migration,
profile/document, chat and wallet-client work that is absent from the older
backend base. A direct two-tree diff shows apparent removals; preserve those
receiving-tree features while applying the reviewed backend changes.

Next safe sequence, still governed by CHECKLIST L01/L08/L09:
1. Select/reuse an isolated integration checkout after verifying ownership.
   Reconcile the five conflicts, retaining both reviewed behaviors. Keep the
   publication checklist as canonical and merge adaptation records explicitly.
2. Bring the QA runner/browser regressions and approved October-web/marketing
   changes into that local candidate in dependency order. Reconcile QA's older
   checklist evidence; do not overwrite the newer plan. Pin acceptance to the
   combined source, not to source01613262 from the separate backend.
3. Run provenance/static checks, full API tests including receiving-tree schema,
   profile and chat regressions, web types/lint/build, isolated PG and actual
   browser journey. Review the resolved diff independently before cutover.
4. Continue the missing test-mode project-specific checkout/webhook flow.
   Keep commercial conditions and real provider/payment/production gates open.

Do not label this plan an integrated application. No merge, push or deploy was
performed in this checkpoint; no paid service or real signature was used.

## Independently approved candidates

1. Backend wallet auth: `c808f80a`.
2. Mobile wallet consumer: `6e67d6f3`, included in frontend head `3702e457`.
3. Web wallet consumer: `3702e457`.
4. Web jobs/bids UI: `a587c2ab`.

## Read-only merge analysis

- `git merge-tree --write-tree c808f80a 3702e457`: clean, exit 0.
- `git merge-tree --write-tree c808f80a a587c2ab`: clean, exit 0.
- `git merge-tree --write-tree 3702e457 a587c2ab`: conflicts, exit 1.

The frontend/design conflict is confined to coordinator metadata:

- `docs/migration/ACTIVE-TASK.json`
- `docs/migration/CHECKLIST.md`
- `docs/migration/adaptations.json`
- `package.json`

Application changes are in separate ownership areas. During authorized
integration, preserve both script entries and both adaptation records, use the
publication checklist as the final coordinator source, then rerun provenance,
wallet client, jobs/bids state, mobile TypeScript, web build and lint checks.

## Proposed sequence

1. Integrate backend `c808f80a` into a dedicated integration candidate.
2. Integrate frontend `3702e457` and run combined API/client contract checks.
3. Integrate design `a587c2ab`, resolving only the four coordinator files above.
4. Run browser/API acceptance and local PostgreSQL acceptance when their current
   environment blockers are removed.
5. Build/install one exact Android candidate and perform owner-approved sign-only
   Testnet acceptance on the physical phone.

Merge, deploy, real signing and production remain separate gates.
