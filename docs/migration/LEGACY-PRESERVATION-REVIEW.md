# Legacy preservation review

Date: 2026-09-13. Scope: preservation, provenance checks and client/API diagnosis.
Author: parent Codex execution. Independent reviewer: Harvey, separate Sol/high
context `01a0998c-62ea-7f10-ad0b-10e8b40c6d90`.

Base: `1ac9644d6988895bf0f6b79229d94c813dd2e121`.
Preservation candidate: `2b4f61c5f85a71cc634c57eae2c0c895f4f516fe`.
Reviewed final candidate: `e8188048699dbf86331f54328cda5044943ad5c8`.

## Independent result

APPROVED for the final candidate above, no remaining findings. Approval is limited
to archival preservation and diagnostic documentation. It does not approve an
authentication protocol, historical renovation activation, device behavior,
deployment, source-repository deletion or a production release.

Reviewer independently verified:
- All 12 source files match archived bytes, manifest SHA-256/size and Git blobs.
- Both source status hashes match `git status --porcelain=v1 -z -uall`.
- Archive-only attributes preserve original bytes and affect no active source.
- No changes under services, apps, contracts, packages or root CI. No imports or
  migration discovery activate archived files.
- Preservation tests 2/2 and root check 24 + 4 + 11 PASS, including syntax/static.
- Pinned SDK characterization/payload tests 43/43 PASS offline.
- Integration inventory remains correctly FAIL: 47 routes, 5/7 required entries.
- Final `git diff --check` from the base PASS.

## Resolved finding

Initial review of 2b4f61c5 found two overstated web consumers in
WALLET-API-CONTRACT.md. The web profile form does not submit a wallet binding;
the web app has no lead-token receipt consumer. Parent verified the source and
corrected the table and P2.5 explanation in e8188048. Reviewer checked the exact
docs-only correction and approved; no tests, archives or runtime changed during
that correction. Parent self-checks are not presented as independent approval.

## Publication and evidence boundary

Private remote branch `codex/legacy-local-preservation-20260913` initially
published 2b4f61c5; `git ls-remote` confirmed its exact SHA while main remained
at 1ac9644d. The approved successor may be fast-forwarded into the clean active
publication worktree and pushed to private main under existing owner authority.
Only documentation/checkpoint evidence may be added after this review without
claiming a new source review. Further code changes require their own checks.

Source backup and disk details: LOCAL-RECOVERY-2026-09-13.md. Current priorities
and acceptance gaps: CHECKLIST.md and ACTIVE-TASK.json. Review does not turn the
known-red wallet integration gate into a pass.
