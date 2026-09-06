/* Minimal HTTP client for the GCSC backend API.
 * Auth: GCSC_API_TOKEN env var, or a token obtained at runtime via gcsc_login. */

const DEFAULT_API_URL = 'https://gcsc-backend-production.up.railway.app/api';

export class GcscClient {
  private token: string | null;
  readonly baseUrl: string;

  constructor() {
    this.baseUrl = (process.env.GCSC_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
    this.token = process.env.GCSC_API_TOKEN || null;
  }

  setToken(token: string) {
    this.token = token;
  }

  hasToken(): boolean {
    return Boolean(this.token);
  }

  async request(path: string, options: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> } = {}) {
    let url = `${this.baseUrl}${path}`;
    if (options.query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== '') params.set(key, String(value));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = (data as { error?: string }).error || `HTTP ${res.status}`;
      if (res.status === 401) {
        throw new Error(`${detail}. Not authenticated: set GCSC_API_TOKEN or call gcsc_login first.`);
      }
      if (res.status === 403) {
        throw new Error(`${detail}. The current account role does not allow this action (admin tools need an admin account).`);
      }
      throw new Error(detail);
    }
    return data;
  }
}

export const client = new GcscClient();

/* Shared tool-result helpers. */
type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

export function jsonResult(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export function errorResult(err: unknown): ToolResult {
  const message = err instanceof Error ? err.message : String(err);
  return { isError: true, content: [{ type: 'text', text: `Error: ${message}` }] };
}

export async function run(fn: () => Promise<unknown>): Promise<ToolResult> {
  try {
    return jsonResult(await fn());
  } catch (err) {
    return errorResult(err);
  }
}
