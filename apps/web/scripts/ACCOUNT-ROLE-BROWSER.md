# Account-role browser regression

Run from `apps/web` using already installed local dependencies. No npm install
or browser download is performed. Playwright must be resolvable (for example
through process-local `NODE_PATH` to an existing bundled runtime). Set
`GCSC_BROWSER_CHANNEL=msedge` to use an already installed Edge.

```powershell
node scripts/verify-account-role-browser.cjs
```

An optional Git revision argument reads only `Dashboard.tsx` and
`dashboard/AccountAccess.tsx` from that immutable commit. Other helpers, installed
libraries and test fixture stay at the current checkout. This is a focused
component comparison, not a checkout or full historical build:

```powershell
node scripts/verify-account-role-browser.cjs 2409c780
```

The test bundles the real React, HashRouter, Dashboard and AccountAccess. It
substitutes an in-memory API and authenticated panels. Playwright fulfills the
fixture HTML/script at a loopback URL; no server is started. Every other request
is aborted and fails the case. Wallet calls throw. Only synthetic form values
and session markers are used. Nothing is sent to an API, mail/SMS or provider.

The ten cases cover role hints (owner/contractor/default/invalid/duplicate),
manual selection, an idle query change, original identity across pending-code
resends, fields locked during a delayed registration request, and an existing
authenticated role unaffected by the query. The server, authorization rules,
code delivery and downstream project/payment panels are NOT verified here.
Styles are not bundled: this is DOM/interaction testing, not visual acceptance.

For the combined receiving tree, add `--marketing` (without a Git revision).
Two extra cases load the actual marketing HTML/CSS/image through a closed
loopback route, verify the exact owner/contractor CTA href, then remap only its
origin to the fixture and click the link into the real registration components.
The path and role query are unchanged. The synthetic registration payload must
match the link's role. All12 cases must pass; marketing file hashes and explicit
origin-remapping status are recorded. This is not live-domain, DNS, actual code
delivery or real account-registration acceptance. No external request is sent.

```powershell
node scripts/verify-account-role-browser.cjs --marketing
```

Results are written under the repository's ignored
`.tmp/account-role-browser/<source-prefix>/result.json`; reruns replace that file.
The report includes the source mode, exact component hashes and fixture bundle
hash. A worktree run must not be attributed to clean HEAD without comparing
those inputs. A green fixture is not a live registration, combined acceptance
or approval to merge/deploy.
