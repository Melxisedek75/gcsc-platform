# Mobile bid access: intent

The Pixel 8 0.1.10 Contractor can view an open project and enter a bid, but POST /api/bids returns `project_access_required`. The local test database has one published project, zero project access entitlements, zero bids, and zero lead tokens. Mobile also offers a generic 50 XPR Lead Token payment that does not grant entitlement for a specific project. This is misleading and could trigger a payment without enabling a bid.

Goal: make the mobile UI state the project-specific access requirement before bid entry, preserve the server's paid-access enforcement, and prevent the generic lead payment button from suggesting it unlocks this project. No payment, entitlement, account, or production behavior is to be fabricated.
