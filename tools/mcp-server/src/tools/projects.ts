import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { client, run } from '../client.js';

export function registerProjectTools(server: McpServer) {
  server.registerTool(
    'gcsc_list_projects',
    {
      title: 'List projects',
      description: 'List construction projects. Filter by status (open, in_progress, completed, cancelled).',
      inputSchema: {
        status: z.enum(['open', 'pending', 'in_progress', 'active', 'disputed', 'completed', 'cancelled']).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ status }) => run(() => client.request('/projects', { query: { status } }))
  );

  server.registerTool(
    'gcsc_get_project',
    {
      title: 'Get project details',
      description: 'Get one project with its contractor bids (each bid includes contractor info and verification status).',
      inputSchema: { project_id: z.number().int().positive() },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ project_id }) => run(() => client.request(`/projects/${project_id}`))
  );

  server.registerTool(
    'gcsc_list_my_projects',
    {
      title: 'List my projects',
      description: 'List projects belonging to the authenticated user (homeowner: posted projects; contractor: projects they bid on/won).',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => run(() => client.request('/projects/my/projects'))
  );

  server.registerTool(
    'gcsc_create_project',
    {
      title: 'Create project',
      description: 'Post a new homeowner construction project so contractors can bid. Requires a homeowner account.',
      inputSchema: {
        title: z.string().min(3),
        description: z.string().min(10),
        category: z.string().optional().describe('e.g. Kitchen Remodel, Roofing, Plumbing'),
        budget_min: z.number().nonnegative().optional(),
        budget_max: z.number().nonnegative().optional(),
        location: z.string().optional(),
        timeline_days: z.number().int().positive().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (body) => run(() => client.request('/projects', { method: 'POST', body }))
  );

  server.registerTool(
    'gcsc_get_contractor_public_profile',
    {
      title: 'Get public contractor profile',
      description: 'Get the public profile of a contractor by id, including verification/compliance summary.',
      inputSchema: { contractor_id: z.number().int().positive() },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ contractor_id }) => run(() => client.request(`/contractors/${contractor_id}/public`))
  );
}
