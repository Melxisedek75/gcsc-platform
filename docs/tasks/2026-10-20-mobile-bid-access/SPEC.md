# Mobile bid access: specification

1. When opening a published Contractor job, request its authenticated details endpoint. A 200 response permits the bid form; a 404 while the public preview exists shows an access-required state before bid entry. Network and authentication errors remain distinct from access denial.
2. POST /api/bids remains the final authority. If its response is `project_access_required`, replace the form with the access-required state. Other errors retain their existing alert behavior.
3. Remove the generic 50 XPR purchase action from the mobile Bids tab. Preserve existing on-device lead receipt history, but label it as historical and explicitly not project-specific access.
4. Do not mint a grant, change the server's paid-access check, sign a wallet request, or start a transfer. A project-specific checkout remains separate future work.
5. Add a focused regression test for the access probe and source invariants; run mobile TypeScript, mobile-design, API access tests, and the repository check. A rebuilt APK/device test is needed before calling this visible on the phone.
