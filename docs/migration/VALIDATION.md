# Validation layers

`npm run check`: source hash/provenance tests, selected API syntax and existing web
static validators. Runs without installing application dependencies. This is a
relocation check only, never a release gate by itself.

`npm run check:integration-contracts`: fail-closed inventory of required API
entrypoints. Expected to remain red while wallet-first sign-in is missing. Do not
weaken requirements or add placeholder routes to make it green.

Isolated package installs retain original lockfiles:
`npm --prefix apps/web ci --ignore-scripts` and
`npm --prefix services/api/v3 ci --ignore-scripts`.
No root dependency hoisting or toolchain upgrades during source import.

Package checks: `npm run build:web`, `npm run lint:web`, `npm run test:api`.
Native device tests, PostgreSQL tests, source contract builds, security review,
secret/license scanning and preview acceptance are separate mandatory gates.

Do not run production smoke scripts, MCP mutations, wallet broadcasts, database
operations or deployment commands as part of the local baseline.
