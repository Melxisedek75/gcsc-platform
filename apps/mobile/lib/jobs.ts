// Server-backed projects are the source of truth for new jobs. The older local
// store remains readable for existing on-device data but is not used to publish.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './api';

const JOBS_KEY = '@gcsc/jobs/local';

// P0-2: the backend job-posting payment requires an existing project_id owned
// by the caller. Create the backend project before charging so the retry can
// send { project_id } in its body.
export interface CreateProjectInput {
  title: string;
  description: string;
  category?: string;
  location?: string;
  budget_min: number;
  budget_max: number;
}

export function parseBudgetRange(input: string): { budget_min: number; budget_max: number } {
  const match = /^\s*\$?\s*(\d[\d,]*)\s*(?:[-–—]\s*\$?\s*(\d[\d,]*))?\s*$/.exec(input);
  if (!match) throw new Error('Enter a budget in dollars, such as $3,000 - $6,000');
  const min = Number(match[1].replaceAll(',', ''));
  const max = Number((match[2] || match[1]).replaceAll(',', ''));
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min <= 0 || max < min) {
    throw new Error('Enter a valid budget range in dollars');
  }
  return { budget_min: min, budget_max: max };
}

export async function createBackendProject(input: CreateProjectInput): Promise<number> {
  const res = await apiRequest<{ project?: { id: number } }>('/api/projects', {
    method: 'POST',
    body: {
      title: input.title,
      description: input.description,
      category: input.category,
      location: input.location,
      budget_min: input.budget_min,
      budget_max: input.budget_max,
    },
  });
  const id = res.project?.id;
  if (typeof id !== 'number') {
    throw new Error('Backend did not return a project id');
  }
  return id;
}

export async function publishBackendProject(id: number): Promise<BackendProject> {
  const res = await apiRequest<{ project: BackendProject }>(`/api/projects/${id}/publish`, {
    method: 'POST',
  });
  return res.project;
}

// ---- Backend project feed (the contractor's job board) ----

export interface BackendProject {
  id: number;
  homeowner_id: number;
  title: string;
  description: string;
  category: string;
  budget_min: number;
  budget_max: number;
  location: string;
  timeline_days: number;
  status: string;
  published: boolean;
  published_at: string | null;
  escrow_id: number | null;
  created_at: string;
  updated_at: string;
}

export async function listBackendProjects(status?: string): Promise<BackendProject[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await apiRequest<{ projects?: BackendProject[] }>(`/api/projects${query}`);
  return res.projects ?? [];
}

export async function getBackendProject(
  id: number | string,
): Promise<{ project: BackendProject; bids: unknown[] } | null> {
  try {
    return await apiRequest<{ project: BackendProject; bids: unknown[] }>(`/api/projects/${id}`);
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

export async function hasBackendProjectAccess(id: number | string): Promise<boolean> {
  try {
    await apiRequest(`/api/projects/${encodeURIComponent(String(id))}/details`);
    return true;
  } catch (err) {
    if ((err as { status?: number }).status === 404) return false;
    throw err;
  }
}

export async function listMyBackendProjects(): Promise<BackendProject[]> {
  const res = await apiRequest<{ projects?: BackendProject[] }>('/api/projects/my/projects');
  return res.projects ?? [];
}

export function formatBudget(project: Pick<BackendProject, 'budget_min' | 'budget_max'>): string {
  const { budget_min: min, budget_max: max } = project;
  if (!min && !max) return 'Budget not set';
  if (min && max && min !== max) return `$${min.toLocaleString()}–$${max.toLocaleString()}`;
  return `$${(max || min).toLocaleString()}`;
}

export function timeAgoIso(iso: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

export function publicProjectAge(project: Pick<BackendProject, 'published_at'>): string | null {
  const publishedAt = project.published_at;
  if (!publishedAt || !Number.isFinite(Date.parse(publishedAt))) return null;
  return `${timeAgoIso(publishedAt)} ago`;
}

export interface LocalJob {
  id: string;
  title: string;
  category: string;
  zip: string;
  budget: string;
  description: string;
  publishTxHash: string;
  publishedAt: number;
  status: 'published' | 'bidding' | 'in_progress' | 'completed';
}

export async function getJob(id: string): Promise<LocalJob | null> {
  const all = await listJobs();
  return all.find((j) => j.id === id) ?? null;
}

export async function listJobs(): Promise<LocalJob[]> {
  const raw = await AsyncStorage.getItem(JOBS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalJob[]) : [];
  } catch {
    return [];
  }
}

export async function addJob(job: Omit<LocalJob, 'id' | 'publishedAt' | 'status'>): Promise<LocalJob> {
  const created: LocalJob = {
    ...job,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    publishedAt: Date.now(),
    status: 'published',
  };
  const existing = await listJobs();
  const next = [created, ...existing];
  await AsyncStorage.setItem(JOBS_KEY, JSON.stringify(next));
  return created;
}

export async function clearJobs(): Promise<void> {
  await AsyncStorage.removeItem(JOBS_KEY);
}
