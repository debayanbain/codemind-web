import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import {
  ApiError,
  analyzeRepo,
  createShareLink,
  getJob,
  getMe,
  getShareLink,
  getSharedReport,
  listRepos,
  retryJob,
  revokeShareLink,
  stopAndRetryJob,
} from './api';
import type { Job, Me, Repo, ShareLink, SharedReport } from './types';

export function useMeQuery() {
  // Gate on Clerk being hydrated. Firing getMe before `window.Clerk` loads
  // sends no Bearer token → 401 → this query caches `null` (looks signed out),
  // and with retry:false + staleTime:Infinity it never re-runs, stranding a
  // valid session on the landing page. `enabled: isLoaded` waits for the token.
  const { isLoaded } = useAuth();
  return useQuery<Me | null>({
    queryKey: ['me'],
    enabled: isLoaded,
    // 401 is resolved to `null` in queryFn (terminal — signed out), so anything
    // that throws to react-query here is transient (network / DB blip / 5xx).
    // Retry a few times so a momentary Supabase hiccup doesn't throw a
    // signed-in user back to the landing page.
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: Infinity,
    queryFn: async () => {
      try {
        return await getMe();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
  });
}

export function useReposQuery(enabled: boolean) {
  return useQuery<Repo[]>({
    queryKey: ['repos'],
    queryFn: listRepos,
    enabled,
    staleTime: 60_000,
  });
}

export function useAnalyzeRepoMutation() {
  return useMutation<{ jobId: string; status: string }, ApiError, string>({
    mutationFn: analyzeRepo,
  });
}

export function useJobQuery(jobId: string) {
  return useQuery<Job>({
    queryKey: ['job', jobId],
    queryFn: () => getJob(jobId),
    // Socket events are the fast path, but they can be missed outright — the
    // orchestrator can emit 'job:status running' before this page's socket
    // subscribe lands (typical right after analyze / stop-and-retry
    // navigation). Poll as a fallback until the job settles WITH its report,
    // so a missed event degrades to a ~3s delay instead of a frozen page.
    refetchInterval: (query) => {
      const job = query.state.data;
      if (job?.status === 'failed') return false;
      if (job?.status === 'done' && job.report) return false;
      return 3000;
    },
  });
}

/** Call after a `job:complete`/`job:status` socket event to pull the fresh row. */
export function useInvalidateJob() {
  const queryClient = useQueryClient();
  return (jobId: string) =>
    queryClient.invalidateQueries({ queryKey: ['job', jobId] });
}

export function useRetryJobMutation() {
  const queryClient = useQueryClient();
  return useMutation<{ jobId: string; status: string }, ApiError, string>({
    mutationFn: retryJob,
    onSuccess: (_, jobId) =>
      queryClient.invalidateQueries({ queryKey: ['job', jobId] }),
  });
}

/** Force-stop a stuck (pending/running) job and re-run it from scratch. */
export function useStopAndRetryJobMutation() {
  const queryClient = useQueryClient();
  return useMutation<{ jobId: string; status: string }, ApiError, string>({
    mutationFn: stopAndRetryJob,
    onSuccess: (_, jobId) =>
      queryClient.invalidateQueries({ queryKey: ['job', jobId] }),
  });
}

/** Only fetched once the share sheet is opened — an unshared job has no link. */
export function useShareLinkQuery(jobId: string, enabled: boolean) {
  return useQuery<ShareLink | null>({
    queryKey: ['share', jobId],
    queryFn: () => getShareLink(jobId),
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateShareLinkMutation(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation<ShareLink, ApiError, void>({
    mutationFn: () => createShareLink(jobId),
    onSuccess: (link) => queryClient.setQueryData(['share', jobId], link),
  });
}

export function useRevokeShareLinkMutation(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: () => revokeShareLink(jobId),
    onSuccess: () => queryClient.setQueryData(['share', jobId], null),
  });
}

/**
 * A 401 is meaningful here — it means "not signed in", and the page turns it
 * into a login redirect — so it must not be retried away or swallowed.
 */
export function useSharedReportQuery(token: string) {
  return useQuery<SharedReport, ApiError>({
    queryKey: ['shared-report', token],
    queryFn: () => getSharedReport(token),
    retry: false,
  });
}
