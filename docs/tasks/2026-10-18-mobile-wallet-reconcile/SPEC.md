# Spec

1. Logout and fresh pairing clear both the application wallet metadata and the pinned Proton Link SDK `user-auth` identity before another signer can be restored.
2. SDK writes and removals, including unawaited calls, cannot apply after a newer session revision or erase a new pairing. Native persistence cannot report a successful wallet save before AsyncStorage completes.
3. A timed-out pairing cannot install a signer or persist its late result. Transfer during wallet cleanup is rejected before restore or broadcast.
4. A pairing succeeds only when the selected actor and permission match the saved SDK identity. Existing server-side ownership verification remains mandatory for wallet binding.
5. Verify actual-source race tests, wallet regression suite, TypeScript, repository checks, API tests, Android bundle, APK metadata, and physical device behavior separately. Mocked tests do not prove WebAuth callback or real XPR authority.
