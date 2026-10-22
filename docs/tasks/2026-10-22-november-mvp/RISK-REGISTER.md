# November MVP: live risk and decision register

Severity: P0 blocks pilot exposure; P1 blocks release candidate; P2 is
documented debt that may be deferred without misleading users. Evidence is
required to close a risk; code assertions or role voting alone are insufficient.

| Risk | Severity | Current evidence | Discriminating closure check | Owner |
| --- | --- | --- | --- | --- |
| R01 Divergent release baseline | P0 | `origin/main` is 504 commits behind wallet candidate; 15 modified files. | One reviewed exact SHA, green required CI, provenance and rollback. | Integrator + independent reviewer |
| R02 QA documents mistaken for real verification | P0 | Local `test_verified` may quote Testnet payment but cannot be accepted. | UI/API prohibit misleading purchase/selection claims; genuine documents reviewed separately. | API/mobile + reviewer |
| R03 Duplicate/racing bids and paid access | P0 if charging; P1 free pilot | Three pending bids observed; fixes tested in JSON, not PostgreSQL concurrency. | Concurrent PostgreSQL negative tests, uniqueness invariant, journal-loss runbook. | API + QA |
| R04 Wallet identity confusion | P1 | Pixel contractor flow passed, but owner, cancel, second device, API restart and recovery incomplete. | Selected-account, logout/login, cancellation, mismatch and restart on exact APK/API. | Mobile + QA |
| R05 Broken acquisition contact and policy paths | P0 for public ads | `Contact.tsx` can show success without request; footer privacy/terms target Contact. | Publish real policies after review; verified contact delivery and failure UX on live domain. | Web + founder/legal |
| R06 Email and password recovery | P1 | Existing wallet report names `Forgot password?` unfinished; provider delivery not established. | Two fresh accounts receive/confirm email and recover access; logs contain no secrets. | API/web + founder provider choice |
| R07 Owner bid lifecycle | P1 | Bid receipt exists, owner review/decision not accepted; QA contractor cannot accept. | Cross-role E2E, unauthorized-access denials and truthful status after decision. | API/web/mobile + QA |
| R08 False finance/market claims | P0 | Testnet transfer is real but not live-money settlement; no first customers proven. | Claim ledger and site/ad copy reviewed against current functionality; real funnel excludes fixtures. | Product + founder/legal |
| R09 Release operations | P1 | No exact-SHA production-like DB/backup/restore/rollback proof for this candidate. | Rehearsal plus independent review and separate founder deploy decision. | QA/release + founder |

Owner decisions D1-D7 are listed in SPEC.md. Each blocking decision request
must include options, recommendation and safe work continuing. Silence is not
consent. Reviewers can challenge assumptions and add tests but cannot spend,
deploy, sign, or mark their own patch approved.
