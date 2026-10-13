# Paid project browser regressions

This runs the real React ProjectsPanel and ApiClient against synthetic HTTP
responses intercepted inside Playwright. It does not use an API mock module.
All requests outside the synthetic loopback origin are blocked. No backend,
database, payment provider or wallet is contacted, and no server port is bound.
It is not whole-journey or visual acceptance; CSS is not bundled.

From `apps/web`, use the already installed runtime and Edge on this workstation:

```powershell
$env:NODE_PATH='C:\Users\rivne\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:GCSC_BROWSER_CHANNEL='msedge'
node scripts/verify-paid-project-browser.cjs
```

No package/browser installation is performed. An unavailable dependency fails
the run. `GCSC_BROWSER_TEST` optionally selects a test-name substring for diagnosis;
release evidence must leave it unset and record the complete result count.

Report: `.tmp/paid-project-browser/result.json` at repository root, with exact
source and bundle hashes, browser version, filter, per-case pass/fail and boundary.
The report contains only synthetic project/account data.

Coverage: nine-field paid brief with no access-status field; JWT transport and
no-store; desktop/mobile proposal POST; HTTP denial and network failure; malformed
or mismatched response; unexpected fields and HTML-like text; forged preview
metadata; revocation on reread and bid submission; uncertain submission without
automatic retry; out-of-order selection; account/role changes; late bid failure;
owner draft and accepted in-progress/completed project regressions with escrow
actions disabled (including loss of read permission). The server remains the authorization authority on every
read and write. Previously disclosed information cannot be recalled by a client;
revocation is detected on the next server read/write, not pushed in real time.
