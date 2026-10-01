# Marketplace validation — 2026-10-01

## Candidate and scope

Repository: Melxisedek75/gcsc-platform.
Draft PR: https://github.com/Melxisedek75/gcsc-platform/pull/1
Branch: codex/lead-marketplace-mvp-20261001.
Initial head: 5bb322f045aa505d25ca918931364c962bf623c4.

The private-repository connector supplied files pinned to that exact head.
Validation used an isolated local snapshot of the contract sources, contract tests,
locked dependencies and existing offline harness. It was not a complete application
checkout; no backend, frontend, device, database or deployment result is implied.

Environment: Linux, Node 24.19.0, npm 11.9.0.
Dependencies: npm ci --ignore-scripts --no-audit --no-fund in contracts/gcsc-core.

## Confirmed initial failures

- npm run test:contracts stopped before executing any suite because the new test's
  recursive find helper had implicit-any/type-inference errors.
- After correcting those types: 33 tests passed, 1 failed. The marketplace WASM
  failed to compile because finalize(lead_id) collided with the compiler's
  zero-argument lifecycle call. Renamed the implementation method finalizeAuction;
  the public action remains finalize.
- Real balance checks exposed rejection of the initial inline debit from a user
  in the installed simulator. That is local evidence, not a claim about live XPR.
  The candidate now receives an explicitly signed token transfer notification.
- Source review identified mutable refund/treasury/auction terms, unchecked
  claim-window overrides and overflowing refund multiplication. Added assertions
  for the expected behavior and corrected the candidate.

## Final local checks

| Check | Result |
|---|---|
| Existing offline contract test runner | 73 passing, 0 failing |
| Marketplace checks within that run | 42 passing |
| Existing five contract suites | 31 passing |
| Fresh compilation of all unchanged contract sources | 14/14 ABI + WASM pairs generated |
| Network access during compiler/tests | Disabled by existing offline.cjs |
| User account code delegation in market fixture | None |
| Independent financial/security review | Not performed |
| XPR testnet/mainnet transactions | Not performed |
| Full application or device E2E | Not performed |

Test command from the repository root:

~~~sh
npm run test:contracts
~~~

The clean build used the existing offline compiler harness rather than npx
or the legacy package build aliases. Reproduce from the repository root:

~~~js
const fs = require('node:fs'), path = require('node:path');
const core = path.resolve('contracts/gcsc-core');
const {createScratchDirectory, runProtonAsc} = require(path.join(core, 'test/harness.cjs'));
const scratch = createScratchDirectory(core, 'full-build');
const sources = fs.readdirSync(core).filter(n => n.endsWith('.contract.ts')).sort();
for (const name of sources) {
  const dir = path.join(scratch, name.slice(0, -'.contract.ts'.length));
  fs.mkdirSync(dir);
  const source = path.join(dir, name);
  fs.copyFileSync(path.join(core, name), source);
  runProtonAsc(source);
  const walk = d => fs.readdirSync(d, {withFileTypes: true})
    .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const files = walk(path.join(dir, 'target'));
  for (const suffix of ['.abi', '.wasm']) {
    if (!files.some(p => p.endsWith(name.replace('.ts', suffix)))) {
      throw new Error('Missing ' + suffix + ' for ' + name);
    }
  }
  console.log('PASS ' + name);
}
console.log('Compiled ' + sources.length + ' contracts');
~~~

Save this snippet as a temporary script or pipe it to node. The market source
is compiled without transformations. Like the existing escrow suite, the market
suite changes the token fixture's transfer decorator from notify to normal action
dispatch so the token can originate transfers in the simulator. This fixture is
not evidence that gcsctoken111 is a production settlement implementation.
The unmodified gcsctoken111 source was also included in the 14-source compile check.

## Behavior covered

Fixed reservation, duplicate claims, insufficient funds/rollback, authentication,
opening bid/increments, outbid and self-outbid balance conservation, auction deadline,
no-bid rejection, conversion, late-conversion rejection, partial refunds, double refunds,
repeated claims after relisting, auction reopening, listing-policy snapshots,
settlement-asset immutability, 0%/100% refund boundaries, rounding, large-value overflow,
pause/refund behavior, wrong symbols, false token notifications, malformed memos,
incorrect fixed payments, and absence of unfunded public payment actions.

No PII fields exist in the serialized table schemas; enforcing that an opaque
reference itself contains no PII remains a server responsibility.

## Next checkpoint

Status: IMPLEMENTED / LOCAL_TESTED / NOT_INDEPENDENTLY_REVIEWED / NOT_DEPLOYED.
Keep PR draft. Do not merge or deploy based on these local results.
Review the exact resulting commit, especially transfer-notification trust, permissions,
frozen settlement terms, refunds, ABI/schema migration and settlement-provider selection.
Then implement the server/UI consumers using claim:<id> and bid:<id> token-transfer
memos and verified transaction receipts. Real settlement and deployment require their
separate evidence-backed gates.
