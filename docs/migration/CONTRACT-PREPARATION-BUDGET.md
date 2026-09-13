# Contract preparation deadline correction

Base: `6878cbdf9e918103cfb25cbba03a196171f2d240`.
Scope: local contract-test preparation only; no deployed contract or API changes.

## Reproduced cause

Clean clone at 1ac9644d completed 23 contract tests, but the escrow suite's before
hook exceeded 120000 ms. Both token and escrow WASM/ABI outputs existed afterward:
token WASM at 07:41:50 UTC and escrow WASM at 07:43:01 UTC on 2026-09-13.
The token ABI was already written at 07:40:56 UTC, more than two minutes before
the final WASM. This is completed preparation exceeding the outer hook deadline,
not a missing artifact or an assertion failure in the escrow contract.

The hook invokes two synchronous compiler subprocesses sequentially. Each child
already has a 120000 ms limit, but the hook inherited the same single 120000 ms
limit from the suite. Thus two individually valid compilations can prevent all
eight escrow behavior tests from starting on a slow Windows runner.

## Narrow correction

- Name/export the existing compiler timeout without changing its value.
- Set only the escrow before-hook deadline to two compiler budgets plus 30000 ms
  for preparation/artifact IO: 270000 ms. It remains below the 900000 ms runner cap.
- Keep the suite/test deadline at 120000 ms. Keep all assertions, child process
  termination, offline network guard and environment isolation unchanged.
- Use a normal function so Mocha supplies the before-hook context.
- Update the existing provenance adaptation for the exact changed test bytes.

## Evidence

The new regression parses the actual TypeScript before-hook and invokes it with
a captured Mocha timeout context and stubbed artifact construction. Before the
fix it failed with `120000 !== 270000`. After the fix all nine contract-runner
checks passed. This short regression does not claim to compile a contract;
the full offline compiler/Vert suite remains the acceptance check.

Root `npm run check` passed 24 + 4 + 11 checks, API syntax and static web checks.
The first corrected full contract run printed `31 passing (6m)` but its terminal
wrapper reported exit -1. That is not recorded as a successful command exit. A
control run without the Tee pipeline, with an explicit numeric exit receipt, is
required before acceptance. No source correction is inferred from this wrapper
result, and no assertions or exit codes are overridden.

Control run at candidate `6a352f46ff8c6aca76f6a137703eebf2ad76d957`:
`npm run test:contracts` printed `31 passing (3m)` and `CONTRACT_TEST_EXIT=0`;
the terminal completion field was also 0. A generated receipt in
`.tmp/contract-preparation-control-20260913.json` records the exact commit,
2026-09-13T08:00:42Z start, 08:03:55Z finish and numeric exit 0. This control run
omitted the Tee pipeline; the earlier wrapper -1 remains recorded above rather
than retroactively treated as success. Its precise cause was not established.

Node.js v25.9.0. Contract dependencies match the lock's installed metadata: 659
entries; one platform-optional and two explicitly extraneous entries are absent.
No mandatory version/resolved/integrity mismatches. No dependency versions or
application/financial contract source changed.

## Independent review

Harvey, separate Sol/high context `01a0998c-62ea-7f10-ad0b-10e8b40c6d90`, APPROVED
exact candidate `6a352f46ff8c6aca76f6a137703eebf2ad76d957` against 6878cbdf with no
findings. Reviewer reran the nine runner checks (exit 0), verified adaptation SHA,
unchanged assertions/compiler/suite limits/offline guard/lockfile, and checked the
exact-commit exit receipt. The 31-test compiler run was accepted from the recorded
parent evidence, not claimed as independently rerun. `git diff --check` passed.

Final checkpoint and baseline-result documentation written after the candidate
are author-verified evidence updates, not a further independent source review.
Approval covers this preparation correction only, not finance, wallet/device,
deployment or production readiness.
