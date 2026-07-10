'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, exportUrl } from '../../../lib/api';
import { getSocket } from '../../../lib/socket';
import type { Job, JobEvent } from '../../../lib/types';
import {
  useInvalidateJob,
  useJobQuery,
  useRetryJobMutation,
  useStopAndRetryJobMutation,
} from '../../../lib/queries';
import { useJobProgressStore } from '../../../lib/stores/job-progress-store';
import { ReportView } from '../../../components/ReportView';
import { JobPipeline } from '../../../components/JobPipeline';
import { motion, useReducedMotion } from 'framer-motion';
import { Spotlight } from '../../../components/ui/spotlight';
import { ShootingStars } from '../../../components/ui/shooting-stars';
import { StarsBackground } from '../../../components/ui/stars-background';
import {
  ArrowLeft,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Terminal,
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
  const markPendingAsRunning = useJobProgressStore((s) => s.markPendingAsRunning);
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
  // execution. Each agent flips to 'completed' individually via its own
  // job:progress socket event (see onEvent below) — we do NOT derive per-agent
  // status from the done *count* by array index, because the five agents run in
  // parallel and don't finish in a fixed order.
  useEffect(() => {
    if (job?.status !== 'running') return;
    markPendingAsRunning();
  }, [job?.status, progress, markPendingAsRunning]);

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
          <a href="/" className="btn btn-secondary w-full">
            <ArrowLeft size={16} /> Return to Dashboard
          </a>
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

  // Active status description helper
  const getStatusDescription = () => {
    if (job.status === 'pending') return 'Waiting in queue...';
    if (job.status === 'failed') return 'Analysis failed';
    if (job.status === 'done') return 'Analysis complete';

    if (!progress) return 'Cloning and indexing repository...';
    const running = Object.values(agentStatuses).filter((s) => s === 'running').length;
    if (progress.done >= progress.total) return 'Synthesizing report...';
    return `Analyzing — ${running} agent${running === 1 ? '' : 's'} running (${progress.done}/${progress.total} done)...`;
  };

  return (
    <div className="relative min-h-screen w-full bg-bg overflow-hidden">
      {/* Background patterns */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-size-[28px_28px] mask-[radial-gradient(ellipse_60%_55%_at_50%_35%,black,transparent)]"
        aria-hidden="true"
      />
      <StarsBackground
        className="pointer-events-none"
        starDensity={0.00015}
        allStarsTwinkle={!reduceMotion}
        twinkleProbability={reduceMotion ? 0 : 0.6}
      />
      {!reduceMotion && (
        <>
          <ShootingStars
            className="pointer-events-none"
            starColor="#5b8def"
            trailColor="#8b5cf6"
            minDelay={2200}
            maxDelay={5500}
          />
        </>
      )}
      <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" fill="#5b8def" />

      {/* Main Container */}
      <div className="relative z-10 mx-auto max-w-275 px-6 py-10">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg transition-colors"
          >
            <ArrowLeft size={16} /> Back to Repositories
          </a>
          <span className="font-mono text-xs text-muted">ID: {job.id.substring(0, 8)}</span>
        </div>

        {/* Repository Header */}
        <div className="mb-8 border border-white/5 bg-surface/50 backdrop-blur-md rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-semibold m-0 text-white tracking-tight">
                {job.repoFullName}
              </h1>
              <span className={`badge badge-${job.status}`}>{job.status}</span>
            </div>
            <p className="m-0 mt-1 text-sm text-muted">
              Triggered on {new Date(job.createdAt).toLocaleDateString()} at{' '}
              {new Date(job.createdAt).toLocaleTimeString()}
            </p>
          </div>

          {job.status === 'done' && job.report && (
            <a
              className="btn btn-secondary text-sm"
              href={exportUrl(job.id, 'md')}
              download={`${job.repoFullName.replace('/', '_')}_report.md`}
            >
              <Download size={15} /> Export Markdown
            </a>
          )}
        </div>

        {/* Dynamic Pipeline Graph */}
        <div className="mb-8 border border-white/5 bg-surface/30 backdrop-blur-md rounded-3xl p-6 md:p-8">
          <JobPipeline agentStatuses={agentStatuses} jobStatus={job.status} />

          {/* Progress Logs */}
          <div className="mt-8 border-t border-white/5 pt-6 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/5 bg-surface-2">
                {job.status === 'running' ? (
                  <Activity className="text-glow-blue animate-pulse" size={16} />
                ) : job.status === 'done' ? (
                  <CheckCircle2 className="text-glow-green" size={16} />
                ) : (
                  <AlertTriangle className="text-glow-amber" size={16} />
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{getStatusDescription()}</div>
                <div className="text-xs text-muted font-mono">
                  {progress
                    ? `${progress.done}/${progress.total} tasks completed`
                    : job.status === 'done'
                    ? 'All agents completed successfully'
                    : 'Awaiting execution pipeline'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Micro Progress Bar */}
              {job.status === 'running' && (
                <div className="flex-1 max-w-70 md:max-w-50">
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
            <p
              className="mt-3 mb-0 text-xs text-red-300/90 font-mono"
              aria-live="polite"
            >
              Stop &amp; retry failed: {stopRetryMutation.error.message}
            </p>
          )}
        </div>

        {/* Failed State Card */}
        {job.status === 'failed' && (
          <div className="border border-red-500/20 bg-red-950/10 backdrop-blur-md rounded-2xl p-6 mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-red-500 font-semibold m-0 mb-2 flex items-center gap-2">
                  <AlertTriangle size={18} /> Analysis Failed
                </h3>
                <p className="m-0 text-sm text-red-200/80 leading-relaxed font-mono">
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
              <p className="mt-3 mb-0 text-xs text-red-300/90 font-mono" aria-live="polite">
                Retry failed: {retryMutation.error.message}
              </p>
            )}
          </div>
        )}

        {/* Partial Failure Banner (job completed, but some agents failed) */}
        {job.status === 'done' && failedAgentTypes.length > 0 && (
          <div className="border border-amber-500/20 bg-amber-950/10 backdrop-blur-md rounded-2xl p-6 mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-glow-amber font-semibold m-0 mb-2 flex items-center gap-2">
                  <AlertTriangle size={18} /> {failedAgentTypes.length} Agent
                  {failedAgentTypes.length > 1 ? 's' : ''} Failed
                </h3>
                <p className="m-0 text-sm text-muted leading-relaxed font-mono">
                  {failedAgentTypes.join(', ')} — report below is generated from the
                  agents that did succeed.
                </p>
              </div>
              <RetryButton
                label={`Retry ${failedAgentTypes.length} failed`}
                onClick={() => retryMutation.mutate(job.id)}
                pending={retryMutation.isPending}
              />
            </div>
            {retryMutation.isError && (
              <p className="mt-3 mb-0 text-xs text-red-300/90 font-mono" aria-live="polite">
                Retry failed: {retryMutation.error.message}
              </p>
            )}
          </div>
        )}

        {/* Done / Report View */}
        {job.status === 'done' && job.report && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="border border-white/5 bg-surface/20 backdrop-blur-sm rounded-3xl p-6 md:p-10"
          >
            <div className="mb-6 flex justify-between items-center border-b border-white/5 pb-4">
              <h2 className="text-xl font-semibold m-0 text-white flex items-center gap-2">
                <FileText size={18} className="text-glow-blue" /> Generated Analysis Report
              </h2>
              <span className="text-xs font-mono text-muted">Format: GitHub Flavored Markdown</span>
            </div>
            <ReportView markdown={job.report.markdownContent} />
          </motion.div>
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

