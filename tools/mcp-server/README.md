# gcsc-mcp-server

MCP server exposing the GCSC SmartContractor backend API (`https://gcsc-backend-production.up.railway.app/api`) as 26 tools for LLM agents: projects, bids, escrow milestones, compliance, admin review, financing prechecks, token/wallet reads.

## Build

```bash
cd mcp-server
npm install
npm run build
```

## Connect (Claude Code)

```bash
claude mcp add gcsc -- node C:/gcsc-store/mcp-server/dist/index.js
```

Or in `.mcp.json` / Claude Desktop config:

```json
{
  "mcpServers": {
    "gcsc": {
      "command": "node",
      "args": ["C:/gcsc-store/mcp-server/dist/index.js"],
      "env": { "GCSC_API_TOKEN": "<jwt, optional>" }
    }
  }
}
```

## Auth

Two options:
- Set `GCSC_API_TOKEN` (JWT from the dashboard's localStorage `gcsc_auth_token`).
- Or call the `gcsc_login` tool with email/password — the token is kept in the server process memory only.

Public reads (`gcsc_list_projects`, `gcsc_get_project`, `gcsc_get_contractor_public_profile`) work without auth. `gcsc_admin_*` tools need an admin account.

## Env

| Var | Default | Purpose |
|-----|---------|---------|
| `GCSC_API_URL` | production Railway URL | Point at a local backend instead |
| `GCSC_API_TOKEN` | — | Pre-set JWT bearer token |

## Tools (26)

- **Auth/profile:** `gcsc_login`, `gcsc_get_profile`, `gcsc_update_profile`, `gcsc_get_compliance`
- **Projects:** `gcsc_list_projects`, `gcsc_get_project`, `gcsc_list_my_projects`, `gcsc_create_project`, `gcsc_get_contractor_public_profile`
- **Bids:** `gcsc_list_my_bids`, `gcsc_submit_bid`, `gcsc_accept_bid`
- **Escrow:** `gcsc_get_escrow`, `gcsc_create_milestone`, `gcsc_milestone_action` (submit/approve/release/dispute), `gcsc_verify_milestone_chain_tx`
- **Admin:** `gcsc_admin_list_documents`, `gcsc_admin_review_document`, `gcsc_admin_list_audit_events`, `gcsc_admin_list_financing_prechecks`
- **Financing (demo only):** `gcsc_create_financing_precheck`, `gcsc_list_financing_prechecks`
- **Token/wallet:** `gcsc_get_token_info`*, `gcsc_get_token_price_history`*, `gcsc_calculate_staking`*, `gcsc_get_wallet_balance`

\* `/token/*` routes returned 404 on the production backend at build time (2026-06-10) — tools are wired for when the backend ships them.

## Test

```bash
npm run check   # builds, then runs a stdio smoke test (handshake + 26 tools + schema check)
```

`SMOKE PASS: 26 tools, handshake + schemas OK` means the server is wired correctly. No network/API calls are made by the smoke test.

## Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| `claude mcp list` shows the server as `✗ Failed to connect` right after adding | First `npx`/`node` start can exceed the health-check timeout while the package resolves. Re-run `claude mcp list` once; if it persists, run `npm run check` to confirm the build is healthy. |
| Tool returns `Not authenticated: set GCSC_API_TOKEN or call gcsc_login first` | The tool needs auth. Set `GCSC_API_TOKEN` in the MCP `env`, or call `gcsc_login` first. Public reads work without it. |
| Tool returns `...role does not allow this action (admin tools need an admin account)` | A `gcsc_admin_*` tool was called with a non-admin token. Log in as an admin. |
| `Not found` on `gcsc_get_token_*` | Backend `/token/*` routes are not deployed yet (see note above), not an MCP error. |
| `built server not found ... run "npm run build"` | Run `npm run build` (or `npm run check`, which builds first). |

## Deliberately not covered

Registration with SMS/email codes, document file upload (base64 payloads), and WebAuth wallet signing are human-interactive flows and stay in the web dashboard.

No live money: financing tools only create demo precheck records per the SETTLEMENT_ENABLED policy.
