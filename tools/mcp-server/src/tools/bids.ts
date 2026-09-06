import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { client, run } from '../client.js';

export function registerBidTools(server: McpServer) {
  server.registerTool(
    'gcsc_list_my_bids',
    {
      title: 'List my bids',
      description: 'List bids submitted by the authenticated contractor with status (pending/accepted/rejected).',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => run(() => client.request('/bids/my/bids'))
  );

  server.registerTool(
    'gcsc_submit_bid',
    {
      title: 'Submit bid',
      description: 'Submit a contractor bid on an open project. Requires a contractor account.',
      inputSchema: {
        project_id: z.number().int().positive(),
        amount: z.number().positive().describe('Bid amount in USD'),
        proposed_timeline_days: z.number().int().positive().optional(),
        message: z.string().optional().describe('Scope, materials approach, milestone plan'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (body) => run(() => client.request('/bids', { method: 'POST', body }))
  );

  server.registerTool(
    'gcsc_accept_bid',
    {
      title: 'Accept bid (creates escrow)',
      description:
        'Accept a contractor bid as the project homeowner. This creates the escrow record and moves the project to in_progress. The contractor must be verified (ready_for_bids).',
      inputSchema: { bid_id: z.number().int().positive() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ bid_id }) => run(() => client.request(`/bids/${bid_id}/accept`, { method: 'POST' }))
  );
}
