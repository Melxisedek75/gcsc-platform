# Intent: mobile wallet account switching

The owner observed that connecting a different XPR Network Testnet account can restore the prior homeowner signer on a contractor login. The same installed app must not silently carry wallet authority across application accounts, logout, cancellation, or a timed-out WebAuth pairing.

This is an isolated follow-up to draft PR #3 at `490bd6fc`, not a winner or completion of Arena100. Preserve its canonical ownership proof, backend binding, payment journal, and no-automatic-rebroadcast behavior. Build a local test APK only; no live signing, payment, merge, deploy, or production release.
