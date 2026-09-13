# Local recovery and disk cleanup

Base monorepo: `1ac9644d6988895bf0f6b79229d94c813dd2e121`.
Source snapshots and the following comparison were captured on 2026-09-13.
Original working trees were not modified. This record does not approve activating
historical implementations or deleting a source repository.

## Reconciled source state

| Source | Local HEAD | Dirty files | Result |
| --- | --- | --- | --- |
| gcsc-smart-contractor | 7a2d7ab353fe28132f9e0528da7561bdbb8658b1 | 11 | Renovation candidates absent from active monorepo; runtime itself has evolved |
| gcsc-store | 2f023068cb7b5a08a481f7fb0a503d3a5f0f6248 | 1 | Root vercel.json absent; needs deployment-root adaptation |
| gcsc-website | b7b767c3d0cccec9b5024b34a1bd9323faebe508 | 0 | Clean historical checkout, not the latest remote main |

Read-only `git ls-remote --heads origin main api-backend` confirmed remote main:
backend `f793bfb0cd19562c908a31ec4e1469ea56d849b7`, store
`45b457dfbec69a14f6f2c46ded5f4bf8ee9b3750`, website
`b55217ec9c177a732a726ba3c193956036c39aa1`. Store api-backend matches its local HEAD.
Monorepo remote main matched the base above. Branch labels alone are not backups
of staged/untracked data or proof of equivalence.

Independent read-only comparison: agent Harvey (`01a0998c-62ea-7f10-ad0b-10e8b40c6d90`).
The old staged backend file has SHA-256
`ecc3a0a6aaa8e351505becc4cd57fc5eaf0d68cf2fcc1963ee83e7769ff21ae2`;
the active monorepo runtime has
`81852557dcc26816fc177ce0a72e5c7a4901b10b075ca9f8ca12904cc3457f2e`.
The difference includes newer payment endpoints, wallet challenge, mandatory
account ownership/threshold checks and verified-wallet gates. Do not overwrite it.

All 12 dirty files are now preserved byte-for-byte under
`archive/legacy-local-20260913/`, with SHA-256, byte counts and original HEADs.
This is an archival addition, not a feature integration. Existing import provenance
and runtime adaptations have not been redefined.

Selective integration queue within the existing checklist:
- Reconcile renovation services and six candidate routes with advisory-only v1.4.
  Resolve SQL CHECK-constraint differences and add actual renovation tests first.
- Assess the older Resend changes against current email behavior before porting.
- Keep the superseded no-op SQL migration only in the archive.
- Adapt the founder packet test to real package/workflow commands; the packet
  document itself already matches, SHA-256
  `828a2ea44ebe4659658e5c7137aeed5c744eb31240d189e5ee8e1a055786e4de`.
- Adapt Vercel configuration only for a chosen root; no deployment was performed.

## Google Drive backups

Destination: [private archive folder](https://drive.google.com/drive/folders/19KfCcaS3T7AOjWfC3oPq8GVBHgRiGgRi).
Owner metadata reports `gcscdao@gmail.com` only, shared=false. Archives contain
tracked/nonignored worktree files, staged/unstaged patches, local refs and file
manifests. Ignored data, dependencies and full Git history are excluded; backend
gitlink `xprnet-repo` is not a regular file and remains in its original repository.
Local complete-history bundles remain in `C:/gcsc-migration-20260906-final`.

| Snapshot | Drive ID | Bytes | Local archive SHA-256 |
| --- | --- | --- | --- |
| backend | 11pXMWyfjZZjy90ZxunCqbkxuNeBvTSlH | 13895121 | 0cfb0eead0b8c63f71da60ec07fd53b9664def54060643c024b2b04b26cdd2b2 |
| store | 1it0FduxrKD0oN7QimeXaXZonJmAicsu0 | 5981393 | 340d87c7c9308a1160f6cc726cc2788b9252a5a5569a87e1bdd423001e804ed8 |
| website | 19sV2a2nKGQ7AaVUQgLi-UwAUtfTORM5P | 2317197 | 728db90142f7b5b443a0dbc4a3bba80054cf63766110d1504d8d87d5f7905c20 |

Verified: local source/snapshot file hashes, unchanged source Git status, readable
tar/gzip listing, Drive metadata sizes/parents/private sharing, and raw downloads
returning the same byte counts. Remote SHA-256 was not exposed by the connector;
this is not a claim of independently re-hashing downloaded bytes.

Gitleaks 8.30.1 source scan: eight findings examined (documented example secrets,
synthetic test passwords, a publishable key and prose false positives). Exit 1
was recorded, not relabeled as a zero-finding scan. No real credential was added
to the dirty-file preservation set.

## Disk work

- Stopped two obsolete read-only full-disk scans from earlier attempts.
- Deleted five already-extracted installer ZIPs in `C:/gcsc/.tools`, 475193883 bytes
  (453.18 MiB). Key extracted files matched SHA-256 before deletion: Java executable,
  sdkmanager launcher, android.jar, aapt2 and adb. Installed tools remain present.
- Deleted one additional unused JDK installer ZIP, 186915383 bytes. It contained
  only the 576 entries of JDK 17.0.20.1+1; the active installed build JDK 17.0.20+8
  remains. This was not claimed to be byte-identical to that installed version.
  Installer SHA-256: `3d9006956fc8af5601cd24ffc4f468bef48279c7ebd8171b9bdf90d0aabfbf1f`.
  Total removed installer bytes: 662109266 (631.44 MiB). These deleted downloads
  are recoverable by downloading the installers again, not via the Recycle Bin.
- Source files, keys, databases, original repos and full-history backups remain.
- Automatic approval rejected recursive deletion of
  `C:/gcsc-w/mobile/smartcontractor/node_modules` with `blocked by policy` and no
  further reason. It was not retried through another mechanism. The previously
  rejected `cleanup-quarantine-20260912` also remains.
- Free space after the installer cleanup was 3.32 GiB, before subsequent QA work.
  Additional cache cleanup is not claimed. APK capacity is not established.

Measured logical sizes (not physical allocated size; no symlink traversal):
old backend 0.23 GiB, store 0.60 GiB, website 0.24 GiB; `C:/gcsc-w` 9.52 GiB;
`C:/gcsc/.tmp` 25.23 GiB; `C:/gcsc/.tools` 18.51 GiB after initial installer cleanup.
The broad inventory was stopped after the relevant groups were measured; this is
not a full-disk accounting. Nested directories must not be added to their parent.

## Verification status

- `npm test`: 24/24 PASS, including two new preservation checks.
- `npm ci --offline --ignore-scripts --no-audit --no-fund` at candidate root:
  one pinned TypeScript package installed from cache, lockfile unchanged.
- `npm run check`: 24 provenance/preservation + 4 mobile build guard + 11 wallet
  restore tests PASS; API syntax and web static checks PASS.
- Pinned SDK characterization and payload experiment: 43/43 PASS, network blocked.
- `npm run check:integration-contracts`: FAIL as expected, 47 routes, 5/7 required;
  wallet-first routes remain absent. No integration-ready claim is made.
- `node --check` on the preserved old runtime: PASS.
- Initial staged `git diff --check` rejected the old runtime's preserved CRLF and
  existing trailing whitespace. The two frozen archive subtrees are explicitly
  binary diff inputs (`-text -diff`); this avoids rewriting their original bytes.
  SHA-256 tests and Gitleaks inspect their complete contents. Active-source diff
  checks remain enabled. Final staged diff check is recorded with candidate review.

Independent reviewer Harvey APPROVED candidate
`e8188048699dbf86331f54328cda5044943ad5c8` after correcting two overstated web
consumers in the diagnostic table. Exact evidence: LEGACY-PRESERVATION-REVIEW.md.
Reviewer independently matched original source bytes, manifest and Git blobs,
reproduced source status hashes and reran the root/SDK checks. No runtime changed.

Separate QA worker Heisenberg (`01a0999b-9fd6-7d13-8aff-436607bc4532`) verified
the isolated clean clone at base 1ac9644d: root and API offline installs PASS;
root check 22 + 4 + 11 PASS; five API suites 159/159 PASS. Worktree remained clean,
lockfiles unchanged, free C: 3.208 GiB. This refreshes the previously blocked
root/API baseline with current evidence.

Final web verification in that clone: `npm run build:web` exit 0, 2977 modules;
`npm run lint:web` exit 0, zero errors and one existing exhaustive-deps warning in
DecryptText.tsx:112; `npm run test:api-config` exit 0, 15/15 PASS. Bundle-size
warnings above 500 kB remain. These checks do not prove actual wallet behavior.

Initial web installation did not expose a final exit code through the terminal
bridge; it is not claimed as a confirmed successful npm-ci command. The first
build encountered missing declaration files before installation completion was
established. Subsequent direct resolution found all three declarations. The final
installed lock metadata matched: 558 entries, 73 absent platform-optional entries,
zero mandatory missing packages or version/resolved/integrity mismatches. A
partial-install race is the supported inference, not a demonstrated source defect.
The healthy-tree build passed without changing source, lockfiles or reinstalling.

Clean contract dependency installation passed (659 packages). Initial tests:
23 PASS, escrow before-hook timeout. The bounded preparation correction is tracked
in CONTRACT-PREPARATION-BUDGET.md. Its control run on candidate 6a352f46 completed
31/31 PASS with explicit command/terminal exit 0. Installed contract lock metadata
matches; one optional platform package and two explicitly extraneous entries are
correctly absent. No mandatory version/resolved/integrity mismatches remain.

Parent API-config attempt in the archive worktree lacked web/esbuild dependencies
and failed before executing tests. It was not counted as PASS; the successful
15-test run above used the already-installed clean clone instead of another copy.

Local host: Node.js v25.9.0, not a claim of GitHub CI on its Node20 matrix. Final
measured free C: 2.487 GiB. Both original dirty-source status hashes still match.
APK, physical-device, real PostgreSQL and full release acceptance remain open.

Private main was independently read back at
`6878cbdf9e918103cfb25cbba03a196171f2d240` after fast-forwarding the reviewed archive.
The source archives are included there without activating old application code.
