# Specification

R1→A1: use current f91c3cb wallet modules, API entrypoint services/api/v3/pure-server.js, apps/web and apps/mobile. Pin original blobs and dependency locks; do not assume source declaration proves deployment.

R2→A2: immutable identical .arena/task.md, unique strategy cards, fresh contexts,5workers; run .arena/wallet-current-20261017 with installed arena-codex bracket.py. Coordinator serializes state; proposals read source and write only assigned paths. No production,liveRPC,signatures or payment.

R3→A3: verify current proof bytes, authority and durable challenge contracts; preserve existing K1/R1 support and fail closed on unsupported proof. Client metadata/JWT/liveSDK session are distinct. Repaired retries must never duplicate broadcasts; reads/reconciliation may retry safely.

R4→A3,A4: targeted real-function regressions, scoped API tests, existing wallet tests, web build and native types; isolated fixture data and sanitized environment. Broaden only for changed behavior. Record baseline failures without weakening tests. Check current consumer contracts and separate web/native verification.

R5→A5: independent review of exact patch; provenance adaptation receipts updated only for actual scoped changes, preserving unrelated source. Publish changes on a branch based on current candidate with private PR; no broad current→main integration or production cutover.

Evidence: .arena/baseline-summary.md. Current baseline API335/335,wallet55/55,route7/7,build/typesPASS; three narrow signing/reconciliation assertions FAIL. Historical Pixel8 proof is not current device acceptance.
