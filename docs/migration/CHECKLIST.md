# GCSC: migration completion checklist

Status: LOCAL PREPARATION. Last verified: 2026-09-06.

## Sources and safety
- [x] Founder confirmed exactly three repositories.
- [x] Local status and exact upstream heads recorded.
- [x] Three all-ref local bundles created and verified.
- [x] Three upstream mirrors created; originals left untouched.
- [x] 529 eligible dirty files copied; excluded/ignored files remain in originals.
- [x] Web/marketing audit returned; three source validators passed (not E2E).
- [ ] Independent backend/security review: first reviewer hit usage limit.
- [ ] Supplementary backend wallet-candidate bundle verified.

## Controlled consolidation
- [x] Source-of-truth audit and explicit exclusions written.
- [ ] Selected source trees imported with per-file blob provenance.
- [ ] Original histories reachable through namespaced archive branches.
- [ ] Whitepaper v1.4 and approved design retained as internal documents.
- [ ] Single API startup and isolated package commands verified.
- [ ] Three separate worktrees created and ownership recorded.
- [ ] Import verification and local component baselines run.

## Integration, not yet complete
- [ ] Complete all 60 capability rows with executable evidence; unknown is not done.
- [ ] One shared wallet-auth protocol and verified ownership-binding migration.
- [ ] Remove client production URL fallbacks through reviewed environment contracts.
- [ ] Web/native API types and request/response contracts agree.
- [ ] Mobile sign-in, restore, cancel, timeout, account/network switch tested on device.
- [ ] Lead purchase, duplicate callbacks, idempotency and reconciliation tested locally.
- [ ] Domain/AI simulation extracted from the competing construction-ai application.
- [ ] Typecheck/build/lint, API/DB tests, contract builds and E2E pass reproducibly.
- [ ] Root CI covers integration; no auto-deploy workflow.
- [ ] Independent security/migration review approved exact candidate commit.

## Publication and archival
- [ ] Full history/content secret and license review before push.
- [ ] Hosting origins, service roots, GitHub App/Pages access, DNS and rollback audited.
- [ ] New remote created and reviewed migration published without exposing private data.
- [ ] Preview and real device acceptance completed; rollback drill recorded.
- [ ] Production cutover separately authorized and verified.
- [ ] Old repositories archived read-only after cutover, never deleted.
- [ ] Privacy/access change assessed separately from archival.

Next safe task: verified source import and local structural checks.
