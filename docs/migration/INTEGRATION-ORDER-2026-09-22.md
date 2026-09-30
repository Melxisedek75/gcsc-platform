# Candidate integration order

Date: 2026-09-22 (America/Los_Angeles)

Originally a conflict analysis; current local integration evidence is below.
No push or deployment is authorized by this document.

## Current October continuation, 2026-09-30

Receiving worktree: `C:/gcsc-platform/.worktrees/legacy-preservation`, branch
`codex/october-integration-20260930`, based on publication656a6469. Backend
merge445a54b4 preserves canonical migrations/profile/document/chat and passed
independent receiving review. QA merge034f6225 includes guarded source roots
from2e6fc4fa. Web merge874153d9 preserves approved tree85957258 exactly;
RIVIERA receiving review PASS. Docs-only8165a19f records evidence and fixes two
Low provenance descriptions. Both backend and web runtime are frozen and tested.

Parent receiving tests: API301/301, PG baseline39/39, project16/16, actual
API/UI/PG1/1 with five checkpoints (`FuE0Vg`), role10/10 and paidbrief22/22;
check/build/lint/static exit0, test services stopped. These are local fixtures,
not checkout, real wallet, provider registration or launch evidence.

Completed merge: marketing733e5fda, without content conflicts. Reviewed
tree9d89cb68ddba3cd366fd0b9b3e9ad355baf94cc0 adds marketing, correct source
adaptations and two actual CTA-to-registration fixture cases. Parent parser18/18,
static2pages/7CTA, role+marketing12/12 and viewport/text8/8 pass. RIVIERA returned
PASS for the exact tree, preserved in merge `d613c440af47e9097f60a889675f8dac9f527e8f`.
Local publication fast-forwarded from656a6469, preserving coordinator edits.
No push/deploy; previous receiving blockers are closed only for the local tree.
After fast-forward, `npm run check` in publication also exits0: root31/31,
mobile12/12, wallet11/11 and API/static web. Runtime/test/package diff against
d613c440 is empty; only nine coordinator/product/review documents changed.

Remaining dependency-ready sequence:
1. Record the passed receiving reviews and exact local publication source d613c440;
   do not repeat resolved integration/reviewer work. No external cutover authorized.
2. Implement L11-L12 project-bound checkout and durable webhook processing in
   local test fixtures first. Existing Stripe escrow PaymentIntent must not be
   relabeled lead checkout. Server-owned versioned price, contractor/project
   binding, event/signature verification, replay/out-of-order and atomic grant
   tests are mandatory. Real provider/account/price/refund terms remain L10 gates.

## Historical pre-integration analysis

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
