import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { client, run } from '../client.js';

export function registerEscrowTools(server: McpServer) {
  server.registerTool(
    'gcsc_get_escrow',
    {
      title: 'Get escrow with milestones',
      description: 'Get an escrow record and its milestones (including any recorded on-chain transactions).',
      inputSchema: { escrow_id: z.number().int().positive() },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ escrow_id }) => run(() => client.request(`/escrow/${escrow_id}`))
  );

  server.registerTool(
    'gcsc_create_milestone',
    {
      title: 'Create milestone',
      description: 'Add a payment milestone to an escrow. Homeowner only; escrow must not be disputed or completed.',
      inputSchema: {
        escrow_id: z.number().int().positive(),
        title: z.string().min(3),
        amount: z.number().positive(),
        description: z.string().optional().describe('Acceptance criteria'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ escrow_id, ...body }) => run(() => client.request(`/escrow/${escrow_id}/milestones`, { method: 'POST', body }))
  );

  server.registerTool(
    'gcsc_milestone_action',
    {
      title: 'Run milestone action',
      description:
        'Advance a milestone through its lifecycle: submit (contractor marks work done), approve (homeowner accepts), release (homeowner releases payment), dispute (either side flags a problem). Role and current status determine which actions are allowed.',
      inputSchema: {
        milestone_id: z.number().int().positive(),
        action: z.enum(['submit', 'approve', 'release', 'dispute']),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ milestone_id, action }) => run(() => client.request(`/milestones/${milestone_id}/${action}`, { method: 'POST' }))
  );

  server.registerTool(
    'gcsc_verify_milestone_chain_tx',
    {
      title: 'Verify milestone chain transaction',
      description:
        'Verify a previously recorded XPR testnet transaction for a milestone against the chain (Hyperion lookup). Updates its status to confirmed or failed.',
      inputSchema: {
        milestone_id: z.number().int().positive(),
        tx_id: z.string().min(8).describe('Transaction id recorded on the milestone'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ milestone_id, tx_id }) =>
      run(() => client.request(`/milestones/${milestone_id}/chain-txs/${tx_id}/verify`, { method: 'POST' }))
  );
}
