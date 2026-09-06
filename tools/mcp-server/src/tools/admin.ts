import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { client, run } from '../client.js';

export function registerAdminTools(server: McpServer) {
  server.registerTool(
    'gcsc_admin_list_documents',
    {
      title: 'Admin: list submitted documents',
      description: 'List contractor verification documents in the review queue. Admin account required.',
      inputSchema: {
        status: z.enum(['submitted', 'approved', 'rejected']).optional().describe('Omit for all'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ status }) => run(() => client.request('/admin/documents', { query: { status } }))
  );

  server.registerTool(
    'gcsc_admin_review_document',
    {
      title: 'Admin: review document',
      description:
        'Approve or reject a submitted contractor document. A review note is required when rejecting. Admin account required.',
      inputSchema: {
        document_id: z.number().int().positive(),
        status: z.enum(['approved', 'rejected']),
        review_note: z.string().optional().describe('Required when rejecting'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ document_id, status, review_note }) =>
      run(() =>
        client.request(`/admin/documents/${document_id}/review`, {
          method: 'PUT',
          body: { status, reviewNote: review_note },
        })
      )
  );

  server.registerTool(
    'gcsc_admin_list_audit_events',
    {
      title: 'Admin: list audit events',
      description:
        'List trust audit events (profile.updated, document.submitted/reviewed, wallet.connected, project.created, bid.submitted/accepted, escrow.milestone.*, escrow.chain_tx.*, financing.precheck.created, payment.intent.created). Admin account required.',
      inputSchema: {
        action: z.string().optional().describe('Exact action filter, e.g. escrow.milestone.released'),
        actor_id: z.number().int().optional(),
        target_user_id: z.number().int().optional(),
        limit: z.number().int().min(1).max(500).optional().describe('Default 100'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ action, actor_id, target_user_id, limit }) =>
      run(() => client.request('/admin/audit-events', { query: { action, actor_id, target_user_id, limit: limit ?? 100 } }))
  );

  server.registerTool(
    'gcsc_admin_list_financing_prechecks',
    {
      title: 'Admin: list financing prechecks',
      description: 'List demo/MVP financing precheck records awaiting admin review. Admin account required.',
      inputSchema: {
        status: z.string().optional().describe("Default 'demo_precheck'; empty string for all"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ status }) => run(() => client.request('/admin/financing-prechecks', { query: { status: status ?? 'demo_precheck' } }))
  );
}
