#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAuthTools } from './tools/auth.js';
import { registerProjectTools } from './tools/projects.js';
import { registerBidTools } from './tools/bids.js';
import { registerEscrowTools } from './tools/escrow.js';
import { registerAdminTools } from './tools/admin.js';
import { registerFinancingTools } from './tools/financing.js';
import { registerTokenTools } from './tools/token.js';

const server = new McpServer({
  name: 'gcsc-mcp-server',
  version: '0.1.0',
});

registerAuthTools(server);
registerProjectTools(server);
registerBidTools(server);
registerEscrowTools(server);
registerAdminTools(server);
registerFinancingTools(server);
registerTokenTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio transport: never log to stdout, it would corrupt the protocol stream
  console.error('gcsc-mcp-server running on stdio');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
