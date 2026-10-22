# November MVP: acceptance-to-work map

This map narrows the historical `docs/migration/CHECKLIST.md` without erasing
it. The old L-item checkbox remains open until exact candidate evidence meets
the new acceptance gate. A green unit test or a screenshot from another branch
is supporting evidence, not completion.

| Gate | Historical items | Candidate owner | Required proof and present gap |
| --- | --- | --- | --- |
| A1 Baseline | L01-L04 | Integrator + independent reviewer | Exact candidate SHA, source provenance, clean scoped diff and independently reviewed integration. Current 15 modified files are not yet a reviewed candidate. |
| A2 Identity | L05 | API + web/mobile + QA | Two fresh roles; real email confirmation/reset; unauthorized access, stale JWT and restart tests on PostgreSQL. `npm run test:api`, `npm run check:web`, mobile type check support but do not replace mail/device E2E. |
| A3 Marketplace | L06-L09 | API + web/mobile + QA | One owner and one contractor using same PostgreSQL, publication/catalog/bid/owner decision, cross-owner denial, duplicate bid and close-race checks. Existing JSON project-access tests are partial. |
| A4 Verification | L05a, L23 | API + operator/web/mobile + QA | Real private files and human review; rejected/pending/test-only deny selection. QA sample PDF is not genuine proof. |
| A5 Wallet | L05, L08, L23 | Mobile/web wallet + independent reviewer | Exact APK/web client, selected-account signature, switch/cancel/restart and backend binding; no silent payment. Existing Pixel contractor result is partial. |
| A6 Payments | L08, L10-L13 | API + QA | Free public pilot: verify there is no real-charge path or false promise. Separately retain the one confirmed 50 XPR Testnet receipt as QA evidence; don't broadcast again. Paid web checkout is deferred pending D1 and provider/legal decisions. |
| A7 Sites | L18-L21 | Web/marketing + product reviewer | Real domain navigation, delivered Contact request, actual privacy/terms, accessibility and claims ledger on same SHA. Contact fake success and footer links are open P0. |
| A8 Operations | L22-L23 | QA/release + operator | Isolated PostgreSQL migration/backup/restore and concurrency; secrets audit, monitoring, recovery, rollback and support rehearsals. |
| A9 Release | L01, L22-L24 | Independent reviewers + founder | Full preview E2E, risk closure, formal review record and explicit production go/no-go. Local Testnet/APK do not satisfy this. |
| A10 Traction | L20, L25 | Dot/product + founder | Funnel excludes fixtures/staff; record real interviews, jobs, contractors, bids and owner responses. No guaranteed customer count. |

## Historical item triage

- **Required for the limited pilot:** L01-L09, L18, L20-L24, with the scope
  restrictions above. L05a applies only to real document review, never QA
  placeholders. L19 creative/video is optional unless used in public claims.
- **Deferred behind new decisions:** L10-L13 paid provider/checkout/refunds;
  L14-L17 voice/AI; escrow, lending, investment, tokens, Mainnet and automated
  settlement. Keep their defects recorded, but do not build or advertise them
  as part of the free first pilot.
- **Investor materials:** L25 requires truthful numbers and an approved
  narrative after technical evidence exists; it cannot make A1-A9 pass.

## Run order for a candidate

1. Focused tests for changed modules; syntax, typecheck and `git diff --check`.
2. Full mandatory repo checks on exact source; do not weaken failed tests.
3. Disposable PostgreSQL negative/concurrency suite and browser E2E.
4. Real-device selected-wallet/cancel/restart checks on a named APK hash.
5. Independent diff review and formal gate; fix, rerun affected checks.
6. Staging deployment/rollback rehearsal; founder decision before live cutover.

Each result goes in REPORT.md with command, exit code, SHA, environment,
observed user journey, reviewer and limitations. Keep a separate decision
record for D1-D7 rather than rewriting tests to match a preferred answer.
