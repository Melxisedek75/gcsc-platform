import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { client, run } from '../client.js';

export function registerFinancingTools(server: McpServer) {
  server.registerTool(
    'gcsc_create_financing_precheck',
    {
      title: 'Create financing precheck (demo only)',
      description:
        'Save a demo/MVP financing readiness precheck for admin review. This is NOT a loan application and moves no money. Products: escrow_advance, token_credit, claimbridge, working_capital.',
      inputSchema: {
        product_type: z.enum(['escrow_advance', 'token_credit', 'claimbridge', 'working_capital']),
        state: z.string().optional().describe('US state code, e.g. WA'),
        context: z.record(z.unknown()).optional().describe('Free-form context for the reviewer'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ product_type, state, context }) =>
      run(() =>
        client.request('/financing/prechecks', {
          method: 'POST',
          body: { productType: product_type, state, context, safetyAcknowledged: true },
        })
      )
  );

  server.registerTool(
    'gcsc_list_financing_prechecks',
    {
      title: 'List my financing prechecks',
      description: 'List demo financing prechecks created by the authenticated user.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => run(() => client.request('/financing/prechecks'))
  );
}
