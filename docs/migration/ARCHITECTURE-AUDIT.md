# GCSC migration source-of-truth audit

Date: 2026-09-06. Evidence: local Git objects, fresh upstream refs and static checks.
This is the first bounded migration audit, not a full security certification.

## A. Executive summary
Three repositories represent one product, but a monorepo alone cannot fix incompatible
wallet protocols. Consolidate sources first, then test shared contracts across clients.
No source repository or production service is changed in this phase.

## B. Repository inventory
| Source | Selected upstream | Role |
| --- | --- | --- |
| gcsc-website | main b55217ec9c177a732a726ba3c193956036c39aa1 | native mobile, marketing, XPR contracts, local domain models |
| gcsc-smart-contractor | main f793bfb0cd19562c908a31ec4e1469ea56d849b7 | application API and database |
| gcsc-store | api-backend 2f023068cb7b5a08a481f7fb0a503d3a5f0f6248 | React web app, MCP bridge |

Store main is 45b457dfbec69a14f6f2c46ded5f4bf8ee9b3750, not its local tracking
ref. The api-backend branch is selected by actual application/deploy declarations.
Whitepaper-only source: local website commit 1300761b26576a8513c5808af119b2e138e04b97.
Mobile recovery 3bd60239 and backend wallet 1d27d55 are unreviewed candidates, not
automatic replacements for upstream components. Local dirty renovation code is backed up.

## C. Capability provenance matrix
The attached specification requires 60 rows. Frontend evidence is being recorded
separately; unresolved backend/security/AI evidence must stay UNVERIFIED. The file
provenance manifest will give exact repository/commit/path/blob mapping, not test claims.

## D. Duplicate implementation map
- Backend pure-server versus old Express server/routes/middleware.
- Store api/server.js versus separately hosted application API.
- construction-ai Express application/Capacitor UI versus native mobile and store UI.
- Website smartcontractor-mobile versus mobile/smartcontractor.
- Wallet profile metadata binding versus cryptographically verified binding/sign-in.
- Multiple static dashboards/public pages versus the routed React application.

## E. Source-of-truth decisions
Use services/api/v3/pure-server.js as the sole application API candidate. Latest
backend AGENTS.md describes v3/server.js, but Railway startCommand selects pure-server
and Docker CMD selects start-with-admin.js. This contradictory instruction is not
runtime evidence. Retain the wrapper for review; local launcher will use pure-server.
Keep v3 layout to avoid silently breaking tests and SQL/script relative paths.
Do not activate old Express endpoints or the store API merely to fill missing routes.

## F. Target architecture
apps/web, apps/mobile, apps/marketing; services/api/v3; contracts;
packages/domain-simulation; tools/mcp-server; docs/whitepaper; tests; scripts.
Shared auth/config/API-schema packages follow verified contracts, not empty scaffolds.

## G. Migration mapping
Store src/public/scripts/config -> apps/web. Store mcp-server -> tools/mcp-server.
Website mobile/smartcontractor -> apps/mobile; selected public HTML/CSS -> apps/marketing;
contracts -> contracts; pure smart-contract domain modules -> packages/domain-simulation.
Backend selected v3 runtime/tests/scripts/SQL -> services/api/v3; supporting root
documentation stays adjacent for relative-path compatibility. Original deploy configs
are preserved as evidence but not enabled at monorepo root.

## H. Git history preservation
All three local --all bundles are verified; upstream mirrors retain branch/tag history.
The new repository will retain namespaced archive branches and selected candidate refs.
The imported tree uses unchanged source blobs with a manifest. Mapping to the original
path enables git show/log on the source ref without rewriting original commits.
Local backups and historical refs are not cleared for public push.

## I. Dependency strategy
Preserve each package lockfile; no React/Expo/toolchain upgrades during relocation.
Use root npm orchestration with isolated package installs. React web and native have
different versions; do not force a hoisted dependency tree before compatibility tests.
No new paid orchestrator or plugin is needed for three git worktrees and subagents.

## J. Database plan
One application database owner: API. Inventory SQL migrations before combining;
preserve current PostgreSQL/JSON-mode behavior, run isolated fixtures, then a separate
PostgreSQL restore/migration drill. Never apply live SQL during repository migration.

## K. Wallet plan
Current upstream API lacks mobile /api/auth/wallet/challenge and /verify. Existing
/api/wallet/challenge and /connect need an existing JWT and use another proof format.
Define one protocol first; distinguish app JWT, verified wallet binding and SDK signing
session. Audit ownership/permission thresholds and anti-replay before accepting local
wallet candidate commits. Test desktop and native cancellation/return separately.

## L. Payment plan
Retain idempotency/reconciliation/audit/dispute protections. Test amount, sender,
recipient, asset precision, network, project and receipt association. A successful
mock or static validator is not payment or wallet evidence. No broadcast in this phase.

## M. Smart contracts and v1.4
Preserve XPR/proton-tsc sources; do not substitute Solidity. Generated WASM/build
output is historical evidence, not proof that current sources compile. Internal
v1.4 valuation/evidence/draw/package agents are advisory. gcscrenovate remains a
no-transfer design, not implemented finance. Public whitepaper.html remains unchanged.

## N. CI/CD
Classify source workflows before root activation. New root CI must be checks-only,
include cross-client API compatibility and preserve separate native/web test surfaces.
No imported workflow may implicitly deploy or access production secrets.

## O. Security findings and limits
Confirmed: mismatched API routes, conflicting startup declarations, web/native
production API fallbacks, real broadcast paths in web settlement adapter. Potential
wallet-candidate ownership bypass needs independent review; do not treat it as proven
or repaired. Full secret scan, threshold/permission review and dependency audit remain.
Independent backend reviewer failed at account usage limit; no approval exists.

## P. Archive candidates
Old Express server/routes, store/api, duplicate static/native wrappers, generated
output, obsolete deployment definitions and unrelated xprclaw stay outside the active
tree with explicit exclusion records and original history. Do not delete originals.

## Q. Phases
Snapshot -> inventory -> selected import -> entrypoint/contract alignment -> isolated
build/tests -> independent review -> preview/device acceptance -> cutover -> archive.

## R. Rollback
Before cutover: discard only the new candidate after preserving its useful commits;
original repositories/deployments remain authoritative. Bundles restore original refs;
dirty-file copies and manifests restore eligible local work. Ignored/secrets/collected
projects are not backed up by this procedure and remain untouched in the originals.
After cutover: rollback requires the separately tested hosting/database plan.

## S. Risk matrix
CRITICAL: unverified wallet ownership and money movement. HIGH: API incompatibility,
deployment root/privacy changes, SQL migration, full-history secrets. MEDIUM: moved
relative paths, mixed React/Expo dependency versions. LOW: internal documentation.

## T. Parallel lanes
Backend/integrator owns services and shared contracts. Frontend worker owns web,
marketing and native UX. QA/CLI worker owns reproducible checks and independent review.
Each gets a separate branch/worktree; CLI is an execution interface, not a distinct
intelligence or permission boundary. No agent writes into another lane's worktree.

## U. First five safe tasks
1. Verify import manifests and reachability of every retained source ref.
2. Correct local API package entrypoint without activating obsolete endpoints.
3. Establish shared environment and API-route inventories with failing regression tests.
4. Restore web/native build baselines in isolated installs.
5. Independently audit wallet candidates, then implement the agreed protocol.
