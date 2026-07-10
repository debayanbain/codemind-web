import type { Job, Me, Repo, ShareLink, SharedReport } from './types';

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

  // Nest answers a handler that returned `null` with 200 and an empty body, not
  // the string "null" — `res.json()` on that throws. GET /jobs/:id/share does
  // exactly this for a job that was never shared.
  const body = await res.text();
  if (body.length === 0) return null as T;
  return JSON.parse(body) as T;
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

/** The job's live share link, or null if the owner never created one. */
export function getShareLink(jobId: string): Promise<ShareLink | null> {
  return apiFetch<ShareLink | null>(`/jobs/${jobId}/share`);
}

/** Idempotent — an existing live link is returned rather than a second token. */
export function createShareLink(jobId: string): Promise<ShareLink> {
  return apiFetch<ShareLink>(`/jobs/${jobId}/share`, { method: 'POST' });
}

export function revokeShareLink(jobId: string): Promise<void> {
  return apiFetch(`/jobs/${jobId}/share`, { method: 'DELETE' });
}

/**
 * Redeems a share token. Requires *a* CodeMind session, not the owner's — a
 * 401 here means "log in first", which is what /share/[token] acts on.
 */
export function getSharedReport(token: string): Promise<SharedReport> {
  return apiFetch<SharedReport>(`/share/${encodeURIComponent(token)}`);
}

export function shareUrl(token: string): string {
  const origin =
    typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/share/${token}`;
}

export function logout(): Promise<void> {
  return apiFetch('/auth/logout', { method: 'POST' }, false);
}

/**
 * `next` is a same-origin path the API redirects back to after OAuth (it round
 * trips through a short-lived cookie). Used to land a share-link visitor on the
 * report they asked for instead of the dashboard.
 */
export function githubLoginUrl(next?: string): string {
  const url = `${API_URL}/auth/github`;
  return next ? `${url}?next=${encodeURIComponent(next)}` : url;
}

export function googleLoginUrl(next?: string): string {
  const url = `${API_URL}/auth/google`;
  return next ? `${url}?next=${encodeURIComponent(next)}` : url;
}

export function exportUrl(jobId: string, format: 'md' | 'pdf'): string {
  return `${API_URL}/jobs/${jobId}/export?format=${format}`;
}

export { ApiError };
