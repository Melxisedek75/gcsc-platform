# XPR Testnet project access and bidding: plan

1. Reconcile existing payment verifier, entitlement schema, mobile journal, and current Testnet SDK behavior. DONE.
2. Add server and mobile tests for project-specific quote, verified grant, replay/pending/closed states, and bid eligibility. DONE for JSON and mobile; PostgreSQL integration remains.
3. Implement the narrow API payment route and atomic entitlement persistence without weakening existing payment or bid checks. DONE in code; PostgreSQL runtime test remains.
4. Connect the access-required screen to the project quote/payment/confirmation flow. Preserve no-double-spend journal behavior and fail closed on ambiguity. DONE in code and unit tests.
5. Run mandatory checks and independent payment/security review. Repair findings; build and verify an APK. DONE for code, focused tests, migration checks and APK. The follow-up reviewer found both earlier High findings closed; PostgreSQL runtime test remains unavailable.
6. Test the non-paying mobile path on Pixel 8. Only after the owner confirms exact Testnet terms, perform one wallet-approved transfer and verify the chain, entitlement, bid, and owner view. Record evidence and limitations in REPORT.md. IN PROGRESS: the owner confirmed the access-required screen and unlock button in 0.1.12. One 50 XPR Testnet transfer for project 1 is independently verified and the local entitlement is paid. Awaiting the owner's confirmation that the bid form opened, then test bid submission and owner view; do not pay again.
