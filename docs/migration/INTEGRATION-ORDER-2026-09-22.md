# Candidate integration order

Date: 2026-09-22 (America/Los_Angeles)

This is a conflict analysis and proposed order only. No merge or deploy occurred.

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
