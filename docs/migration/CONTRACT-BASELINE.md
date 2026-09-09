# Local contract baseline - 2026-09-09

Status: LOCAL_BASELINE_PASS. No independent approval or integration.

Worktree: C:/gcsc-platform/.worktrees/qa, branch codex/qa-integration.

Implemented local runner and shared harness for five suites. Each run retains a
unique scratch directory. No shell/npx/deletion in suite execution. Child environment
is allowlisted; HTTP, fetch, TCP, TLS and UDP sends are blocked by a local preloader.
This is an accidental-network guard, not an OS security sandbox.

Installed locked dependencies with `npm ci --ignore-scripts --no-audit --no-fund`
(659 packages, success). Existing dependency deprecation warnings remain.
Node is v25.9.0; proton-tsc 0.3.58 and proton-asc 0.2.150.

Checks:
- `node --test tests/contract-runner.test.mjs tests/migration.test.mjs`: 14/14 PASS.
- `npm run test:contracts`: not passing. Initial loader failures exposed direct
  Node invocation missing the upstream ts-node-transpile-only shebang behavior.
  Added explicit compiler-only registration and disabled native type stripping;
  contract type checking still belongs to AssemblyScript, suite checking to ts-node.
- Latest attempt reached the first compiler's 120-second timeout. Remaining run
  was stopped to avoid repeating the same costly failure. Raw output is preserved
  in `.tmp-contract-results.log`; generated scratch artifacts remain untouched.

Next: isolate a single compiler invocation, inspect timeout/artifacts and compare
against a supported pinned Node runtime before changing contract code or limits.
Do not claim compiled contracts, passing Vert tests, APK readiness or wallet repair.

Follow-up: isolated Node 24.19.0 probe also timed out at 60 seconds, with no
compiler output (`.tmp-node24-probe.log`: PROBE ETIMEDOUT SIGTERM). Merely switching
from Node 25 is not a demonstrated fix. Next instrument compiler module loading
and transform registration to locate the stall before repeating whole suites.

Resolution (2026-09-09 heartbeat): compiler registration inherited project allowJs
while skipIgnore enabled dependency processing. Explicit skipProject and allowJs:false
keep large JavaScript dependencies out of transpilation while loading TS transforms.
The isolated compiler completed and generated ABI/WASM. Added a regression proving
binaryen JS is ignored and proton-asc TS is processed by the registered loader.

Final evidence on Node 25.9.0:
- `node --test tests/contract-runner.test.mjs`: 8/8 PASS.
- `npm run test:contracts`: 31/31 PASS across five suites (2 minutes), exit 0.
- `node --test tests/migration.test.mjs`: 7/7 PASS before final documentation only.
- `git diff --check`: PASS.
Earlier failures above are retained as diagnostic history, not current failures.
Next: independent review of candidate when reviewer availability is confirmed;
do not integrate without the migration review gate. Continue other dependency-ready
local requirements while reviewer capacity remains unavailable.
