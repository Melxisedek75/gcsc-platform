import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { client, run, jsonResult, errorResult } from '../client.js';

export function registerAuthTools(server: McpServer) {
  server.registerTool(
    'gcsc_login',
    {
      title: 'Log in to GCSC',
      description:
        'Authenticate with email and password. Stores the JWT in this server process for all subsequent calls. Returns the user profile (token is not echoed back).',
      inputSchema: {
        email: z.string().email().describe('Account email'),
        password: z.string().min(8).describe('Account password'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ email, password }) => {
      try {
        const data = (await client.request('/auth/login', { method: 'POST', body: { email, password } })) as {
          token?: string;
          user?: unknown;
        };
        if (!data.token) return errorResult('Login succeeded but no token was returned.');
        client.setToken(data.token);
        return jsonResult({ logged_in: true, user: data.user });
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    'gcsc_get_profile',
    {
      title: 'Get my profile',
      description: 'Get the authenticated user: role, profile fields, completion %, wallet, verification status.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => run(() => client.request('/auth/profile'))
  );

  server.registerTool(
    'gcsc_update_profile',
    {
      title: 'Update my profile',
      description:
        'Update profile fields of the authenticated user. Only provided fields change. Contractor fields: companyName, ein, licenseNumber, serviceArea, specialties, yearsInBusiness. Homeowner fields: propertyAddress, propertyType, budgetRange, projectNeeds.',
      inputSchema: {
        fullName: z.string().optional(),
        phone: z.string().optional(),
        companyName: z.string().optional(),
        ein: z.string().optional(),
        licenseNumber: z.string().optional(),
        serviceArea: z.string().optional(),
        specialties: z.array(z.string()).optional(),
        yearsInBusiness: z.string().optional(),
        propertyAddress: z.string().optional(),
        propertyType: z.string().optional(),
        budgetRange: z.string().optional(),
        projectNeeds: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        website: z.string().optional(),
        bio: z.string().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (body) => run(() => client.request('/auth/profile', { method: 'PUT', body }))
  );

  server.registerTool(
    'gcsc_get_compliance',
    {
      title: 'Get my compliance status',
      description:
        'Get contractor verification status: overall_status, profile completion, required documents, wallet connection, ready_for_bids flag, checklist.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => run(() => client.request('/auth/compliance'))
  );
}
