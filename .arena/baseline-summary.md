# Current wallet repair baseline

User authorization: explicit private gcsc-platform read/repair/PR and Arena100 on16October2026 America/Los_Angeles.

Source: codex/mobile-prototype-integration-20261012@f91c3cb8586f453b298aab5074f41436e7db9840, latest published mobile integration candidate,482 commits ahead of main a0834ac. Main-source preliminary Arena produced16 genuine proposals then was superseded before elimination. Those16 do not count toward the new100 and no winner was chosen. New run wallet-current-20261017,seed20261018,100 competitors,7 rounds,595 genuine jobs,5 concurrent workers plus coordinator and root. Fresh Sol/high contexts per monorepo delegated-model policy. State and outputs, not a plan or simulation, determine progress.

Authorized GitHub connector supplied hash-verified current source. Shell clone lacks credentials; no token extraction attempted. Local Git is an analysis snapshot, not original history. Three unrelated large binary assets (marketing hero,mobile dusk,prototype ZIP) unavailable through text connector; no substitutes created. Wallet/runtime code present; pinned root/API/web dependencies reused only after exact lockfile equality; changed mobile lock installed with npm ci --ignore-scripts.

| Command/check | Actual baseline |
|---|---|
| npm run test:api | PASS335/335,16 suites |
| selected restore/proof/login/binding/device-probe/web-login/mobile-restore node tests | PASS55/55 |
| npm run check:integration-contracts | PASS59 declared,7/7required; static only |
| npm run build:web | PASS,chunk-size warning |
| npm run check:mobile-types | PASS |
| coordinator actual-source VM reconciliation regression | FAILexit1: after outage first sweep pending; recovered second sweep makes0lookups and remains pending |
| coordinator actual-function mobile signing regressions | FAILexit1: permission mismatch attempts1broadcast; matching ambiguous-signature error triggers2attempts |

Logs baseline-*.log; repro scripts .arena/scratch/coordinator. The VM fixture was first rejected by the current minimum JWT-secret-length guard; fixture corrected with long synthetic secret, guard unchanged, then behavioral failure reproduced. No claim that setup error was the bug.

Historical device evidence in MOBILE-WALLET-PROBE.md:25September Pixel8 K1 exact490byte sign-only proof, no broadcast. This session has NOT observed a physical phone, actual current signed login, production DB, settlement or deployed artifact. Historical evidence does not close current end-to-end acceptance. App source frozen during tournament.
