# Consolidation review and publication boundary

Review date: 2026-09-12 local (America/Los_Angeles).
Author: parent Codex. Independent reviewers: separate Sol/high contexts, read-only.
This record authorizes scoped repository consolidation, NOT a product release.

## Candidate branches

- Backend 309c2909 plus reviewed four-file fix, committed as 0b2dcebb.
  Descartes (01a0991d-2c88-7a02-852d-a011723df4d8):
  APPROVED_FOR_LOCAL_CONSOLIDATION after requiring wallet ownership before both
  payment challenges and bid readiness. Parent final API tests: 159/159 PASS.
  Reviewer independently ran ownership/compliance 33/33 and escrow 51/51 PASS.
- Frontend bf3728bf plus reviewed root TypeScript/lockfile/CI fix, committed as
  2ab3bf14. Same reviewer: APPROVED_FOR_LOCAL_CONSOLIDATION. Parent root check PASS;
  reviewer API-config/wallet tests 26/26 PASS. TypeScript 5.9.3 is now an explicit
  locked root dependency installed before CI checks, not a hidden mobile install.
- QA 7c55289b: same reviewer APPROVED_FOR_LOCAL_CONSOLIDATION; offline SDK/payload
  and guards 53/53 PASS. No additional signing protocol enabled.
- Initial import 5a520f49 / root 17332463: Bohr
  (01a0991d-2522-78c0-9246-20ba3794dcbb) PASS for local structural consolidation.
  421 imports and 1510 exclusions verified. Clean-clone archive-ref dependency
  identified; portable-provenance correction reviewed separately below.

## Portable provenance

Candidate exports the exact four source commit objects and complete tree
inventories, not source file contents or parent history. Git SHA-1 object hashes
bind each inventory to the manifest's exact commit. Paths, modes, blob IDs,
UTF-8 byte round trips, origin declarations and exclusions are checked.
Whitepaper evidence attests its entire historical tree, but deliberately imports
only four selected files; all other paths from that source remain unselected.
The explicit local test still requires original archive refs and fails without
them. The default portable suite does not silently skip missing history.

Initial review found unchecked origin metadata; canonical mapping and negative
metadata-mutation tests were added. Bohr final review: PASS / READY_FOR_PUBLICATION
for structural provenance. Independent portable tests 22/22 and local history4/4
PASS. AGENTS workflow carry-forward is documentation outside that code review.

Upstream selected heads were rechecked using git ls-remote this run and match:
website/main b55217ec9c177a732a726ba3c193956036c39aa1;
smart-contractor/main f793bfb0cd19562c908a31ec4e1469ea56d849b7;
store/api-backend 2f023068cb7b5a08a481f7fb0a503d3a5f0f6248.
Whitepaper 1300761b26576a8513c5808af119b2e138e04b97 is explicitly local history,
not claimed as an upstream branch. Owner mapping is documented in source-origins.

## Publication security and licenses

Portable Gitleaks 8.30.1 downloaded from official gitleaks/gitleaks release;
ZIP SHA256 d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e
verified against GitHub release asset digest. No global installation or data upload.

Selected new monorepo history: 20 commits, 4.71 MB, seven generic-api-key findings:
- Two public EOS-format keys in wallet-authority test fixtures, not signing keys.
- Three fixed passwords created for local smoke-test users, not service credentials.
- FRONTEND-AUDIT source commit SHA and ARCHITECTURE-AUDIT prose: false positives.
All seven individually inspected. No scanner exclusions added or rules disabled.
Initial publication tree scan including plaintext provenance: five corresponding
findings, no additional matches in source metadata. Merged history6f88ea54 scan:
23 non-merge commits, 5.47 MB; exactly the same seven adjudicated findings, no new
matches. Legacy source refs are not ancestors of the publish branch.
This is scoped secret screening, not a guarantee that all vulnerabilities are absent.

Legacy source history scan: 2376 commits, eight findings. At least two need further
triage; therefore NO archive refs or legacy parent histories will be uploaded.
They remain intact in original repositories and local backup bundles. Raw parent
OIDs inside commit evidence are text, not reachable Git parents of the new branch.

Website MIT notice preserved in docs/licenses/gcsc-website-LICENSE. Backend declares
UNLICENSED; this private same-owner consolidation does not relicense it. Dependency
locks and notices retained; node_modules are not published. Comprehensive third-party
release license/vulnerability clearance remains a separate production gate.

Root GitHub workflow triggers only pull_request/workflow_dispatch, contents:read,
no push/deploy. Nested legacy workflow paths do not activate root GitHub Actions.
No hosting project connected, live settings changed, database touched or wallet signed.

## Publication acceptance

Private Melxisedek75/gcsc-platform created via existing authorized GitHub identity.
Required before claiming consolidation complete: reviewed integrated commit,
clean-clone check PASS, final redacted secret triage, push only intended main ref,
remote SHA/tree verification. Original repositories stay unchanged until a future
tested cutover. Wallet-first integration-readiness gate remains intentionally red
and is NOT a monorepo preservation failure or a production approval.

Clean isolated clone of6f88ea54 was created with --no-local --single-branch.
Only the publication branch is present, no archive refs. Root npm ci installed
the one pinned TypeScript dependency, and npm run check passed22 provenance,
4 mobile-build guards,11 wallet-restore tests plus syntax/static validators.
Extra component tests initially failed before their own dependencies were installed;
README now lists explicit per-component npm ci prerequisites. These were not
converted to skips or claimed as test passes.

Descartes final mechanical merge review of6f88ea54: APPROVED. All17 adaptation
records and all non-conflict lane source blobs preserved; package scripts union
correct. Parent159 API tests passed in the backend worktree before merge, whose
source blobs match the integrated branch.

Fresh API/web/contracts installs in the isolated clone then failed with ENOSPC.
C: reported0.64GB free after failure. Automatic cleanup of the three newly created
partial node_modules was rejected by the tool policy; no removal was performed.
Do not repeat installs until adequate free disk space exists. Full component
clean-install/build acceptance remains BLOCKED, not PASS. Root portable37-test
check completed successfully before these installs. This blocks the broader
reproducible product baseline, not preservation of the reviewed source branch in
a private repository. No CI or production success is inferred from publication.

Publication confirmed: pushed only HEAD:refs/heads/main with followTags=false.
git ls-remote --heads origin returned only main at
5a9bba32b99dd39cc7d6fc3bf4d5a40ea020de2d (tree02e30b5561bb6abc6a754ea7ba63f2b767904f0f).
Follow-up documentation commits update the checkpoint but not the reviewed source.
GitHub remains private. Original repositories and preserved history unchanged.
Next static contract gate:47 declared routes,5/7 required entrypoints present;
auth/wallet/challenge and auth/wallet/verify remain absent. Gate exit1 is recorded
as unfinished P2 work, not hidden or converted to a success.
