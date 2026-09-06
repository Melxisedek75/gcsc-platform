#!/usr/bin/env node
/* Smoke test for gcsc-mcp-server.
 * Spawns the built server over stdio, runs the MCP handshake, lists tools, and
 * asserts every tool is well-formed (name + description + object inputSchema).
 * Exits 0 on success, 1 on any failure. No network/API calls are made. */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(here, '..', 'dist', 'index.js');

const EXPECTED_TOOLS = [
  'gcsc_login', 'gcsc_get_profile', 'gcsc_update_profile', 'gcsc_get_compliance',
  'gcsc_list_projects', 'gcsc_get_project', 'gcsc_list_my_projects', 'gcsc_create_project',
  'gcsc_get_contractor_public_profile',
  'gcsc_list_my_bids', 'gcsc_submit_bid', 'gcsc_accept_bid',
  'gcsc_get_escrow', 'gcsc_create_milestone', 'gcsc_milestone_action', 'gcsc_verify_milestone_chain_tx',
  'gcsc_admin_list_documents', 'gcsc_admin_review_document', 'gcsc_admin_list_audit_events',
  'gcsc_admin_list_financing_prechecks',
  'gcsc_create_financing_precheck', 'gcsc_list_financing_prechecks',
  'gcsc_get_token_info', 'gcsc_get_token_price_history', 'gcsc_calculate_staking', 'gcsc_get_wallet_balance',
];

function fail(msg) {
  console.error(`SMOKE FAIL: ${msg}`);
  process.exit(1);
}

if (!existsSync(serverPath)) fail(`built server not found at ${serverPath} — run "npm run build" first`);

const child = spawn(process.execPath, [serverPath], { stdio: ['pipe', 'pipe', 'inherit'] });
let buf = '';
const pending = new Map();

child.stdout.on('data', (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id != null && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});
child.on('error', (e) => fail(`spawn error: ${e.message}`));

function send(obj, expectReply) {
  return new Promise((res) => {
    if (expectReply) pending.set(obj.id, res);
    child.stdin.write(JSON.stringify(obj) + '\n');
    if (!expectReply) res();
  });
}

const timeout = setTimeout(() => fail('timed out waiting for server responses'), 15000);

try {
  const init = await send({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } },
  }, true);
  if (!init.result?.serverInfo?.name) fail('initialize returned no serverInfo');

  await send({ jsonrpc: '2.0', method: 'notifications/initialized' }, false);

  const list = await send({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, true);
  const tools = list.result?.tools;
  if (!Array.isArray(tools)) fail('tools/list did not return an array');

  const names = tools.map((t) => t.name).sort();
  const expected = [...EXPECTED_TOOLS].sort();
  if (names.length !== expected.length) fail(`expected ${expected.length} tools, got ${names.length}`);
  for (const n of expected) if (!names.includes(n)) fail(`missing expected tool: ${n}`);

  for (const t of tools) {
    if (!t.name) fail('a tool has no name');
    if (!t.description || t.description.length < 10) fail(`tool ${t.name} has a too-short description`);
    if (!t.inputSchema || t.inputSchema.type !== 'object') fail(`tool ${t.name} has no object inputSchema`);
  }

  clearTimeout(timeout);
  console.log(`SMOKE PASS: ${tools.length} tools, handshake + schemas OK (${init.result.serverInfo.name})`);
  child.kill();
  process.exit(0);
} catch (e) {
  fail(e.message || String(e));
}
