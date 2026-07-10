'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../lib/api';
import { getSocket } from '../../../lib/socket';
import type { Job, JobEvent } from '../../../lib/types';
import {
  useInvalidateJob,
  useJobQuery,
  useRetryJobMutation,
  useStopAndRetryJobMutation,
} from '../../../lib/queries';
import { AGENT_IDS, useJobProgressStore } from '../../../lib/stores/job-progress-store';
import { JobPipeline, JobPipelineSkeleton } from '../../../components/JobPipeline';
import { ReportDashboard } from '../../../components/report/ReportDashboard';
import { ReportHeader } from '../../../components/report/ReportHeader';
import { ReportSkeleton } from '../../../components/report/ReportSkeleton';
import { ExportMenu } from '../../../components/report/ExportMenu';
import { ShareDialog } from '../../../components/report/ShareDialog';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '../../../components/ui/button';
import { ShootingStars } from '../../../components/ui/shooting-stars';
import { StarsBackground } from '../../../components/ui/stars-background';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Activity,
  RotateCw,
  OctagonX,
} from 'lucide-react';

export default function JobPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const reduceMotion = useReducedMotion();

  const { data: job, error: jobError } = useJobQuery(jobId);
  const invalidateJob = useInvalidateJob();
  const queryClient = useQueryClient();
  const retryMutation = useRetryJobMutation();
  const stopRetryMutation = useStopAndRetryJobMutation();

  const progress = useJobProgressStore((s) => s.progress);
  const agentStatuses = useJobProgressStore((s) => s.agentStatuses);
  const failureReason = useJobProgressStore((s) => s.failureReason);
  const setProgress = useJobProgressStore((s) => s.setProgress);
  const setAgentStatus = useJobProgressStore((s) => s.setAgentStatus);
  const setAllAgents = useJobProgressStore((s) => s.setAllAgents);
  const markAgentRunningIfPending = useJobProgressStore(
    (s) => s.markAgentRunningIfPending,
  );
  const markStaleRunningAsFailed = useJobProgressStore(
    (s) => s.markStaleRunningAsFailed,
  );
  const setFailureReason = useJobProgressStore((s) => s.setFailureReason);
  const reset = useJobProgressStore((s) => s.reset);

  // Socket-driven state is per-page, not per-query — clear it when the job changes.
  useEffect(() => {
    reset();
  }, [jobId, reset]);

  // Seed agent statuses from the initial fetch (e.g. a hard refresh mid- or
  // post-run) — and reconcile after every refetch. This is authoritative:
  // a live 'job:progress' event fires on both success AND recorded failure,
  // so it always optimistically marks 'completed'; job.agentResults is the
  // real per-agent outcome and overrides that once available.
  useEffect(() => {
    if (!job?.agentResults?.length) return;
    for (const r of job.agentResults) {
      setAgentStatus(r.agentType, r.status === 'success' ? 'completed' : 'failed');
    }
  }, [job?.agentResults, setAgentStatus]);

  const failedAgentTypes = job?.agentResults
    ?.filter((r) => r.status === 'failed')
    .map((r) => r.agentType) ?? [];

  // Once the job is running, show every not-yet-finished agent as 'running'
  // (pulsing) so the pipeline animates continuously through download/index and
  // execution. Agents light up one at a time (staggered timeouts) so the
  // pipeline reads as a sequence of workers spinning up, not a single frame
  // flip. Each agent still flips to 'completed' individually via its own
  // job:progress socket event (see onEvent below) — we do NOT derive per-agent
  // status from the done *count* by array index, because the five agents run in
  // parallel and don't finish in a fixed order.
  useEffect(() => {
    // progress !== null while still 'pending' means we missed the running
    // status event but agent work is demonstrably happening — treat as running.
    const running =
      job?.status === 'running' || (job?.status === 'pending' && progress !== null);
    if (!running) return;
    const timers = AGENT_IDS.map((id, i) =>
      setTimeout(() => markAgentRunningIfPending(id), i * 220),
    );
    return () => timers.forEach(clearTimeout);
  }, [job?.status, progress, markAgentRunningIfPending]);

  // Subscribe to real-time events
  useEffect(() => {
    const socket = getSocket();
    socket.emit('subscribe', { jobId });

    const onEvent = (event: JobEvent) => {
      if (event.jobId !== jobId) return;

      switch (event.type) {
        case 'job:status':
          queryClient.setQueryData<Job>(['job', jobId], (prev) =>
            prev ? { ...prev, status: event.status as Job['status'] } : prev,
          );
          if (event.status === 'done') setAllAgents('completed');
          break;
        case 'job:progress':
          // Progress proves the job is executing — repair a missed
          // 'job:status running' event so the UI can't sit on 'pending'.
          queryClient.setQueryData<Job>(['job', jobId], (prev) =>
            prev && prev.status === 'pending' ? { ...prev, status: 'running' } : prev,
          );
          setProgress({ done: event.done, total: event.total });
          if (event.agentType) {
            const type =
              event.agentType === 'dependencies' ? 'dependency' : event.agentType;
            setAgentStatus(type, 'completed');
          }
          break;
        case 'job:complete':
          setAllAgents('completed');
          void invalidateJob(jobId);
          break;
        case 'job:failed':
          setFailureReason(event.reason);
          markStaleRunningAsFailed();
          queryClient.setQueryData<Job>(['job', jobId], (prev) =>
            prev ? { ...prev, status: 'failed' } : prev,
          );
          break;
      }
    };

    socket.on('job:status', onEvent);
    socket.on('job:progress', onEvent);
    socket.on('job:complete', onEvent);
    socket.on('job:failed', onEvent);

    return () => {
      socket.off('job:status', onEvent);
      socket.off('job:progress', onEvent);
      socket.off('job:complete', onEvent);
      socket.off('job:failed', onEvent);
    };
  }, [
    jobId,
    queryClient,
    invalidateJob,
    setProgress,
    setAgentStatus,
    setAllAgents,
    setFailureReason,
    markStaleRunningAsFailed,
  ]);

  if (jobError) {
    return (
      <div className="relative min-h-screen w-full bg-bg text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full border border-red-500/30 bg-red-950/15 backdrop-blur-md rounded-2xl p-6 text-center">
          <AlertTriangle className="mx-auto text-red-500 mb-4" size={40} />
          <h2 className="text-xl font-semibold mb-2">Error Loading Job</h2>
          <p className="text-muted text-sm mb-6">
            {jobError instanceof ApiError ? jobError.message : 'Job not found'}
          </p>
          <Button href="/" variant="secondary" className="w-full">
            <ArrowLeft size={16} /> Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="relative min-h-screen w-full bg-bg text-white flex flex-col items-center justify-center p-6 gap-4">
        <Loader2 className="animate-spin text-glow-blue" size={32} />
        <p className="text-muted font-mono text-sm">Initializing analysis view...</p>
      </div>
    );
  }

  const percent =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : job.status === 'done'
      ? 100
      : 0;

  const isFinished = job.status === 'done';

  // What the UI treats as the job's status. The DB row can lag reality when
  // the 'job:status running' socket event was missed — but agent progress or
  // settled agent results prove execution, so never render "waiting in queue"
  // (or the queued skeleton) over a job that is visibly doing work.
  const agentsActive = Object.values(agentStatuses).some((s) => s !== 'pending');
  const effectiveStatus: Job['status'] =
    job.status === 'pending' && (progress !== null || agentsActive)
      ? 'running'
      : job.status;

  // Every agent has settled and not one succeeded — there is nothing to
  // synthesize. The synthesizer now fails such jobs itself, but that only fires
  // once completion tracking reaches the expected count; a wedged run can sit
  // here indefinitely, so surface it as stalled and point at Stop & retry
  // rather than showing a hopeful "synthesizing" spinner forever.
  const agentValues = Object.values(agentStatuses);
  const allAgentsFailed =
    effectiveStatus === 'running' &&
    agentValues.length > 0 &&
    agentValues.every((s) => s === 'failed');

  // Active status description helper
  const getStatusDescription = () => {
    if (effectiveStatus === 'pending') return 'Waiting in queue...';
    if (effectiveStatus === 'failed') return 'Analysis failed';
    if (effectiveStatus === 'done') return 'Analysis complete';
    if (allAgentsFailed) return 'All agents failed — nothing to synthesize';

    if (!progress) return 'Cloning and indexing repository...';
    const running = Object.values(agentStatuses).filter((s) => s === 'running').length;
    if (progress.done >= progress.total) return 'Synthesizing report...';
    return `Analyzing — ${running} agent${running === 1 ? '' : 's'} running (${progress.done}/${progress.total} done)...`;
  };

  return (
    <div className="relative min-h-screen w-full bg-bg">
      {/* Background patterns — fixed to the viewport so the star field and
          shooting stars stay behind the content at any scroll depth, instead
          of living only in the first viewport-height of the document. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-size-[28px_28px] mask-[radial-gradient(ellipse_60%_55%_at_50%_35%,black,transparent)]" />
        <StarsBackground
          starDensity={0.00015}
          allStarsTwinkle={!reduceMotion}
          twinkleProbability={reduceMotion ? 0 : 0.6}
        />
        {!reduceMotion && (
          <ShootingStars
            starColor="#5b8def"
            trailColor="#8b5cf6"
            minDelay={2200}
            maxDelay={5500}
          />
        )}
      </div>

      {/* Main Container */}
      <div className="relative z-10 mx-auto max-w-350 px-6 pb-16">
        <ReportHeader
          repoFullName={job.repoFullName}
          status={job.status}
          createdAt={job.createdAt}
          synthesis={job.report?.synthesis ?? null}
          eyebrow={
            <div className="mb-3 flex items-center justify-between">
              <Button href="/" variant="secondary" size="sm">
                <ArrowLeft size={15} /> Back to Repositories
              </Button>
              <span className="font-mono text-xs text-muted">
                ID: {job.id.substring(0, 8)}
              </span>
            </div>
          }
          actions={
            isFinished && job.report ? (
              <>
                <ShareDialog jobId={job.id} />
                <ExportMenu jobId={job.id} repoFullName={job.repoFullName} />
              </>
            ) : null
          }
        />

        {/* The pipeline is a *progress* visual. While the job runs it earns the
            fold; once the report exists it collapses to a one-line strip so the
            findings start above it. */}
        {!isFinished ? (
          <div className="mb-6 rounded-3xl border border-line bg-surface/30 p-6 backdrop-blur-md md:p-8">
            {/* Queued = worker not picked up yet: show the blurred skeleton.
                The moment the job is (effectively) running, cross-fade to the
                real pipeline and let agents light up one by one. */}
            <AnimatePresence mode="wait" initial={false}>
              {effectiveStatus === 'pending' ? (
                <motion.div
                  key="pipeline-skeleton"
                  exit={
                    reduceMotion ? undefined : { opacity: 0, filter: 'blur(6px)' }
                  }
                  transition={{ duration: 0.25 }}
                >
                  <JobPipelineSkeleton />
                </motion.div>
              ) : (
                <motion.div
                  key="pipeline"
                  initial={
                    reduceMotion ? false : { opacity: 0, filter: 'blur(6px)' }
                  }
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  transition={{ duration: 0.4 }}
                >
                  <JobPipeline
                    agentStatuses={agentStatuses}
                    jobStatus={effectiveStatus}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-8 flex flex-col items-stretch justify-between gap-4 border-t border-line pt-6 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-2">
                  {allAgentsFailed ? (
                    <AlertTriangle className="text-red-400" size={16} />
                  ) : effectiveStatus === 'running' ? (
                    <Activity className="text-glow-blue animate-pulse" size={16} />
                  ) : effectiveStatus === 'pending' ? (
                    <Loader2 className="animate-spin text-muted" size={16} />
                  ) : (
                    <AlertTriangle className="text-glow-amber" size={16} />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">
                    {getStatusDescription()}
                  </div>
                  <div className="font-mono text-xs text-muted">
                    {progress
                      ? `${progress.done}/${progress.total} tasks completed`
                      : 'Awaiting execution pipeline'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {effectiveStatus === 'running' && !allAgentsFailed && (
                  <div className="max-w-70 flex-1 md:max-w-50">
                    <div className="progress-bar">
                      <motion.div
                        className="progress-bar-fill"
                        initial={{ width: '0%' }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                )}

                {/* Stuck job escape hatch — abort the current run and re-analyze
                    from scratch. A wedged job looks identical to a healthy one,
                    so this is available throughout pending/running. */}
                {(job.status === 'running' || job.status === 'pending') && (
                  <StopRetryButton
                    pending={stopRetryMutation.isPending}
                    onClick={() => {
                      if (
                        !window.confirm(
                          'Stop this analysis and restart it from scratch? Any in-progress work is discarded.',
                        )
                      )
                        return;
                      reset();
                      stopRetryMutation.mutate(job.id);
                    }}
                  />
                )}
              </div>
            </div>

            {stopRetryMutation.isError && (
              <p className="mt-3 mb-0 font-mono text-xs text-red-300/90" aria-live="polite">
                Stop &amp; retry failed: {stopRetryMutation.error.message}
              </p>
            )}
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-line bg-surface/40 px-4 py-2.5 backdrop-blur-md">
            <CheckCircle2 size={15} className="text-glow-green" />
            <span className="text-sm text-fg">Analysis complete</span>
            <span className="font-mono text-xs text-muted">
              {job.agentResults.length} agents ·{' '}
              {failedAgentTypes.length === 0
                ? 'all succeeded'
                : `${failedAgentTypes.length} failed`}
            </span>
          </div>
        )}

        {/* Failed State Card */}
        {job.status === 'failed' && (
          <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-950/10 p-6 backdrop-blur-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="m-0 mb-2 flex items-center gap-2 font-semibold text-red-500">
                  <AlertTriangle size={18} /> Analysis Failed
                </h3>
                <p className="m-0 font-mono text-sm leading-relaxed text-red-200/80">
                  {failureReason || 'An unknown framework or connection error occurred.'}
                </p>
              </div>
              <RetryButton
                label="Retry"
                onClick={() => retryMutation.mutate(job.id)}
                pending={retryMutation.isPending}
              />
            </div>
            {retryMutation.isError && (
              <p className="mt-3 mb-0 font-mono text-xs text-red-300/90" aria-live="polite">
                Retry failed: {retryMutation.error.message}
              </p>
            )}
          </div>
        )}

        {/* job:complete flips status to 'done' before the refetch carrying the
            report lands — bridge that gap with a skeleton in the report's
            silhouette so the dashboard fades in over it instead of popping. */}
        {isFinished && !job.report && <ReportSkeleton />}

        {isFinished && job.report && (
          <ReportDashboard
            report={job.report}
            agentResults={job.agentResults}
            banner={
              failedAgentTypes.length > 0 ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-6 backdrop-blur-md">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="m-0 mb-2 flex items-center gap-2 font-semibold text-glow-amber">
                        <AlertTriangle size={18} /> {failedAgentTypes.length} Agent
                        {failedAgentTypes.length > 1 ? 's' : ''} Failed
                      </h3>
                      <p className="m-0 font-mono text-sm leading-relaxed text-muted">
                        {failedAgentTypes.join(', ')} — the report below is
                        generated from the agents that did succeed.
                      </p>
                    </div>
                    <RetryButton
                      label={`Retry ${failedAgentTypes.length} failed`}
                      onClick={() => retryMutation.mutate(job.id)}
                      pending={retryMutation.isPending}
                    />
                  </div>
                  {retryMutation.isError && (
                    <p
                      className="mt-3 mb-0 font-mono text-xs text-red-300/90"
                      aria-live="polite"
                    >
                      Retry failed: {retryMutation.error.message}
                    </p>
                  )}
                </div>
              ) : null
            }
          />
        )}
      </div>
    </div>
  );
}

function RetryButton({
  label,
  onClick,
  pending,
}: {
  label: string;
  onClick: () => void;
  pending: boolean;
}) {
  return (
    <button
      type="button"
      className="btn btn-secondary shrink-0 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      onClick={onClick}
      disabled={pending}
      aria-busy={pending}
    >
      <RotateCw size={15} className={pending ? 'animate-spin' : ''} />
      {pending ? 'Retrying...' : label}
    </button>
  );
}

function StopRetryButton({
  onClick,
  pending,
}: {
  onClick: () => void;
  pending: boolean;
}) {
  return (
    <button
      type="button"
      className="btn btn-secondary shrink-0 text-sm border-red-500/30 text-red-200 hover:text-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
      onClick={onClick}
      disabled={pending}
      aria-busy={pending}
      title="Force-stop this run and re-analyze from scratch"
    >
      {pending ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <OctagonX size={15} />
      )}
      {pending ? 'Restarting...' : 'Stop & retry'}
    </button>
  );
}
