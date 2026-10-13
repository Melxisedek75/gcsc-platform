# Account role handoff and registration identity review

Date: 2026-09-30. Checklist scope: L05, L18d, L20 and focused L23 regression.
This record does not approve integration or production.

## Commits and ownership

- Worktree: `C:/gcsc-platform/.worktrees/october-web`.
- Branch: `codex/october-web-20260928`.
- Role hint base: `8310c5ec40af86a9aa032533a126439eb290524c`.
- Initial role candidate: `2409c780fc098965f5b50b0e1f4d98f53d4edfd8`.
- Repair: `74e5618d058f4d360c22053b292d34fa9564568e`.
- Independent RIVIERA context: `01a0f0fd-0955-72e0-aa60-0caf8a412362`.
- Receiving publication application code remains `5166e59f17587a27a7ebd924cacfc9b5df1f55b0`.

RIVIERA is a separate read-only Codex execution, not the author. Parent edits and
fixtures were excluded from the initial review by inspecting pinned Git objects.
No API, mobile, wallet, dependency, provider or production configuration changed.

## Initial independent findings

Initial review verdict: `AI_REVIEW_GATE=CHANGES_REQUIRED`.

### Medium: query hint changes the identity of a pending registration

At `2409c780`, `apps/web/src/pages/dashboard/AccountAccess.tsx:24` updates `role`
from the URL while keeping the old `verificationPending` object. Resend at line
102 uses the current draft role. Reproduce: follow the homeowner CTA, submit an
owner registration, retain the mounted component and change the query to
`role=contractor`, then select "Send code again". The second request submits
contractor/email instead of homeowner/SMS. A query change while the first request
is in flight has the same effect. The server can replace the email's pending
registration with the unintended role. This query-induced change is new in the
initial role candidate; the same query probe does not change the role on its base.

Safe repair: snapshot the attempt and resend the original identity. Ignore URL
hints during an active request or pending verification instead of silently
restarting registration.

### Medium: editable draft during an in-flight registration

At `2409c780`, role buttons at `AccountAccess.tsx:229` and form inputs from line
263 remain editable while submitting. Delay the registration response, change
role or contact fields, finish the request, then resend. The first response binds
the original attempt, but resend reads the edited draft. RIVIERA also reproduced
the manual role race on the base, so this is an inherited defect, not a regression
introduced by URL hints.

Safe repair: disable editing during requests and use the pending attempt snapshot
for all resend fields, not just the role.

## Initial independent commands and results

From `october-web/apps/web`:

- `node scripts/validate-auth-channel-verification-ui.mjs`: exit 0, passed.
- `node scripts/validate-auth-registration-feedback.mjs`: exit 0, passed.
- `node --check scripts/validate-auth-channel-verification-ui.mjs`: exit 0.
- All 25 validator inputs were compared with the pinned Git candidate first.

From `october-web`:

- `git --no-optional-locks diff --check 8310c5ec40af86a9aa032533a126439eb290524c 2409c780fc098965f5b50b0e1f4d98f53d4edfd8`: exit 0.
- In-memory `node -e` Git-source probes: query 12/12, server role normalization
  7/7, registration/resend and authenticated/expired-session probes exit 0.
  Two initial session-probe runs exited 1 because the mock-profile wait was too
  short; only the probe wait was corrected. These are not browser or server tests.

Areas without findings in the initial diff: primary owner CTA selects owner;
absent/invalid role selects contractor; duplicate role uses the first value;
ordinary rerender preserves manual selection; URL hints do not elevate an
authenticated account's role. The static validators did not detect the races.

## Repair and parent browser evidence

`74e5618d` stores full name, password, email, phone, role and verification channel
in the in-memory pending attempt. Resend uses this snapshot and clears the old
OTP after a successful resend. A previous-hint ref prevents URL changes from
replacing active registration state. Form fields and role controls are disabled
while submitting; the selected role has `aria-pressed`. No password persistence
or logging was added; the existing form already held it in component memory.

The same commit adds a documented browser harness and synthetic API fixture.
Actual React, HashRouter, Dashboard and AccountAccess are bundled; the API and
authenticated downstream panels are substituted. Every unexpected request is
aborted and fails the case. No server starts and no email, SMS or wallet call is
sent. Styles are not bundled; this is interaction, not visual acceptance.

Environment: Node 25.9.0, installed Edge 154.0.4258.37, React/ReactDOM 19.2.3,
react-router 7.15.1, esbuild 0.27.2. Installed package versions match the lockfile.
Playwright is the existing bundled runtime; no package/browser was downloaded.

From `october-web/apps/web`:

```powershell
$env:NODE_PATH='C:\Users\rivne\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:GCSC_BROWSER_CHANNEL='msedge'
node scripts\verify-account-role-browser.cjs 74e5618d058f4d360c22053b292d34fa9564568e
```

Exact committed run: exit 0, **10/10 PASS**, no page errors or unexpected network
requests. The final repair also passed twice before commit. Original candidate:
exit 1, **8/10 PASS, 2 FAIL** (pending query changes resend identity; request
fields remain editable). Retained local evidence:

- `.tmp/account-role-browser/2409c780/before-fix.json` (red).
- `.tmp/account-role-browser/74e5618d/result.json` (green).

The final harness was also rerun against pinned `2409c780`: exit 1, 8/10 PASS.
Its strengthened pending-code case stops at the 15-second wait for the old OTP
to clear (old code does not clear it); the delayed-request case again finds
editable fields. This result is `2409c780/result.json`, separate from the
original red artifact that directly asserted the wrong resend role. It is not
a new green result or an infrastructure failure. Old AccountAccess SHA-256:
`a42da71d670d9eec22a6f66a4bb24e4199340f65b88077d209050fe513129a4f`.

These paths are relative to `october-web`; artifacts are ignored, not committed.
The optional revision pins only the two components, not a full historical build.
Harness documentation: `apps/web/scripts/ACCOUNT-ROLE-BROWSER.md` in the repair.

| Input | SHA-256 |
| --- | --- |
| Dashboard.tsx | `0e434b8abace1a98d89e115e8f25a7cfccc2fb76a28bbf230d2caaa8b6b50a4f` |
| AccountAccess.tsx | `1211beb63bd838ba47585fccd28d96960832475d8078cdbd25072bc2ff21dbab` |
| Fixture bundle | `1acab2b7921ea71a0f31d42ea73742a8ba524dbce7e0645ae9baf79a230121eb` |

The ten cases cover owner, contractor, absent, invalid and duplicate role hints;
manual selection; idle query changes; pending-code resend with identical complete
payload, cleared old code and synthetic owner completion; delayed request field
locks with query changes; authenticated role unaffected by a URL hint.

Additional parent checks on the identical final repair source, all exit 0:

- `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit`.
- `node node_modules/eslint/bin/eslint.js src/pages/Dashboard.tsx src/pages/dashboard/AccountAccess.tsx scripts/fixtures/account-role-api.ts`.
- `node node_modules/typescript/bin/tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck scripts/fixtures/account-role-api.ts`.
- `node scripts/validate-auth-registration-feedback.mjs`.
- `node scripts/validate-auth-channel-verification-ui.mjs`.
- `node --check scripts/verify-account-role-browser.cjs`.
- `git diff --check` and staged diff check before committing.

## Independent repair review

RIVIERA reviewed exact `2409c780..74e5618d`, all four changed files, and confirmed
clean HEAD/worktree before and after. Both previous Medium findings are closed;
no new confirmed defect was found in this narrow repair. The reviewer confirmed
the full immutable resend payload, hint lifecycle (including no delayed hint
after failure/reset), disabled role/mode/form/OTP controls, selected-role state,
and successful-resend OTP clearing while a failed resend preserves the code.

Independent commands from `october-web/apps/web`, all exit 0:

- `node scripts/validate-auth-channel-verification-ui.mjs`: passed.
- `node scripts/validate-auth-registration-feedback.mjs`: passed.
- `node --check scripts/verify-account-role-browser.cjs`.
- `node --check scripts/validate-auth-channel-verification-ui.mjs`.
- `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --incremental false`.
- `node node_modules/typescript/bin/tsc scripts/fixtures/account-role-api.ts --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution bundler`.

From the worktree root:

- `git --no-optional-locks diff --check 2409c780fc098965f5b50b0e1f4d98f53d4edfd8 74e5618d058f4d360c22053b292d34fa9564568e`: exit 0.
- Independent in-memory `node -e` probes of pinned sources: 13/13, exit 0.
  Both original defects were reproduced on the base again. These probes use
  mock hooks/API/storage, not real React or a server.
- All 111 check inputs were compared with the candidate before execution.

Reviewer did not run the browser harness and did not count parent evidence as
independent. Fixture isolation from production imports and two-component pinning
limitations were reviewed. Verdict: `SOURCE_REPAIR_VERDICT=APPROVED`.
No merge, push, release approval or deployment is implied.

## Remaining gates

- Receiving publication still lacks the reviewed role change. A separate branch
  does not fix its owner CTA. The existing target privacy disclosure also remains.
- No actual API, database, SMS/email provider, password reset or whole registration
  E2E was exercised by this browser fixture. It cannot prove delivery or security
  enforcement by the server. L05/L20/L22/L23 are not complete.
- No CSS/screenshots, screen-reader, mobile device, wallet or payment acceptance
  is claimed. Final reviewed backend/client integration and combined journey
  testing remain required before reconsidering the overall marketing gate.
