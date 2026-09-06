import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { client, run } from '../client.js';

export function registerTokenTools(server: McpServer) {
  server.registerTool(
    'gcsc_get_token_info',
    {
      title: 'Get GCSC token info',
      description: 'Get GCSC token stats: supply, price, staking APY, burn data.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => run(() => client.request('/token/info'))
  );

  server.registerTool(
    'gcsc_get_token_price_history',
    {
      title: 'Get token price history',
      description: 'Get GCSC token price history series.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => run(() => client.request('/token/price-history'))
  );

  server.registerTool(
    'gcsc_calculate_staking',
    {
      title: 'Calculate staking returns',
      description: 'Calculate projected GCSC staking rewards for an amount and duration (days).',
      inputSchema: {
        amount: z.number().positive().describe('GCSC amount to stake'),
        duration: z.number().int().positive().describe('Staking duration in days'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (body) => run(() => client.request('/token/staking/calculate', { method: 'POST', body }))
  );

  server.registerTool(
    'gcsc_get_wallet_balance',
    {
      title: 'Get XPR wallet balance',
      description: 'Get on-chain balance for an XPR Network account name (testnet).',
      inputSchema: { account: z.string().min(1).max(12).describe('XPR account name, e.g. gcsctoken111') },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ account }) => run(() => client.request(`/wallet/balance/${account}`))
  );
}
