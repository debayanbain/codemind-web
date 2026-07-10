import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  analyzeRepo,
  getJob,
  getMe,
  listRepos,
  logout,
  retryJob,
  stopAndRetryJob,
} from './api';
import type { Job, Me, Repo } from './types';

export function useMeQuery() {
  return useQuery<Me | null>({
    queryKey: ['me'],
    retry: false,
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

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(['me'], null);
      queryClient.removeQueries({ queryKey: ['repos'] });
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
