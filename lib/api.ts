import type { Job, Me, Repo } from './types';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function rawFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
}

/** One in-flight refresh shared across concurrent 401s, so we refresh once. */
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= rawFetch('/auth/refresh', { method: 'POST' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  retry = true,
): Promise<T> {
  let res = await rawFetch(path, init);

  // Access token expired — swap it for a fresh one via the refresh cookie,
  // then replay the original request once.
  if (res.status === 401 && retry) {
    const refreshed = await refreshSession();
    if (refreshed) res = await rawFetch(path, init);
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      `${init?.method ?? 'GET'} ${path} failed: ${res.status}`,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function getMe(): Promise<Me> {
  return apiFetch<Me>('/auth/me');
}

export function listRepos(): Promise<Repo[]> {
  return apiFetch<Repo[]>('/repos');
}

export function analyzeRepo(
  repoFullName: string,
): Promise<{ jobId: string; status: string }> {
  return apiFetch(`/analyze/${encodeURIComponent(repoFullName)}`, {
    method: 'POST',
  });
}

export function getJob(jobId: string): Promise<Job> {
  return apiFetch<Job>(`/jobs/${jobId}`);
}

export function retryJob(
  jobId: string,
): Promise<{ jobId: string; status: string }> {
  return apiFetch(`/jobs/${jobId}/retry`, { method: 'POST' });
}

/**
 * Force-stop a job wedged in `pending`/`running` (worker died mid-run, message
 * lost) and re-run it from scratch — retryJob() refuses in-progress jobs, this
 * is the escape hatch. Server bumps the run epoch to fence any stale in-flight
 * agent work.
 */
export function stopAndRetryJob(
  jobId: string,
): Promise<{ jobId: string; status: string }> {
  return apiFetch(`/jobs/${jobId}/stop-retry`, { method: 'POST' });
}

export function logout(): Promise<void> {
  return apiFetch('/auth/logout', { method: 'POST' }, false);
}

export function githubLoginUrl(): string {
  return `${API_URL}/auth/github`;
}

export function googleLoginUrl(): string {
  return `${API_URL}/auth/google`;
}

export function exportUrl(jobId: string, format: 'md' | 'pdf'): string {
  return `${API_URL}/jobs/${jobId}/export?format=${format}`;
}

export { ApiError };
