import type { Job, Me, Repo, ShareLink, SharedReport } from './types';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Machine-readable code from the API body, e.g. `github_not_connected`. */
    public code?: string,
  ) {
    super(message);
  }
}

/**
 * A fresh Clerk session token for the Authorization header.
 *
 * ClerkProvider loads `window.Clerk` globally; `getToken()` always returns a
 * valid short-lived JWT (Clerk refreshes it under the hood — no manual refresh
 * dance anymore) or null when signed out. Signed-out requests go through
 * unauthenticated and the API answers 401, which the app reads as "not signed
 * in". Cross-origin (3001 → 3000) rules out cookie auth, so it's Bearer only.
 */
async function authHeader(): Promise<Record<string, string>> {
  if (typeof window === 'undefined') return {};
  const clerk = (
    window as unknown as {
      Clerk?: { session?: { getToken?: () => Promise<string | null> } | null };
    }
  ).Clerk;
  const token = await clerk?.session?.getToken?.();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function rawFetch(path: string, init?: RequestInit): Promise<Response> {
  const auth = await authHeader();
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...auth, ...init?.headers },
  });
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await rawFetch(path, init);

  if (!res.ok) {
    // Surface the API's machine-readable error code (e.g. github_not_connected)
    // when present, so callers branch on `code` instead of matching strings.
    let code: string | undefined;
    try {
      const body = (await res.clone().json()) as { code?: string };
      code = body.code;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(
      res.status,
      `${init?.method ?? 'GET'} ${path} failed: ${res.status}`,
      code,
    );
  }

  if (res.status === 204) return undefined as T;

  // Nest answers a handler that returned `null` with 200 and an empty body —
  // `res.json()` on that throws. GET /jobs/:id/share does exactly this.
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
 * Force-stop a job wedged in `pending`/`running` and re-run it from scratch —
 * retryJob() refuses in-progress jobs, this is the escape hatch. Server bumps
 * the run epoch to fence any stale in-flight agent work.
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
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/share/${token}`;
}

/**
 * Download an export. The export route is auth-guarded and cross-origin, so a
 * plain `<a href>` can't carry the Bearer token — fetch it with auth, then
 * trigger the download from the blob.
 */
export async function downloadExport(
  jobId: string,
  format: 'md' | 'pdf',
  filename: string,
): Promise<void> {
  const res = await rawFetch(`/jobs/${jobId}/export?format=${format}`);
  if (!res.ok) {
    throw new ApiError(res.status, `Export failed: ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export { ApiError };
