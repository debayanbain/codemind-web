'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Eye, Loader2 } from 'lucide-react';
import { ApiError } from '../../../lib/api';
import { useSharedReportQuery } from '../../../lib/queries';
import { ReportDashboard } from '../../../components/report/ReportDashboard';
import { ReportHeader } from '../../../components/report/ReportHeader';
import { ReportSkeleton } from '../../../components/report/ReportSkeleton';
import { StarsBackground } from '../../../components/ui/stars-background';

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { data, error, isLoading } = useSharedReportQuery(token);

  // A 401 here means "no CodeMind session", not "bad link". Bounce through
  // login carrying this page as `next`, so the visitor lands back on the report
  // they were sent rather than on someone else's dashboard.
  const unauthenticated = error instanceof ApiError && error.status === 401;
  useEffect(() => {
    if (!unauthenticated) return;
    router.replace(`/login?next=${encodeURIComponent(`/share/${token}`)}`);
  }, [unauthenticated, router, token]);

  if (unauthenticated) {
    return (
      <div className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-bg p-6">
        <Loader2 className="animate-spin text-glow-blue" size={32} />
        <p className="font-mono text-sm text-muted">
          Redirecting to sign in...
        </p>
      </div>
    );
  }

  if (isLoading) {
    // Mirror the report silhouette while it loads instead of a bare spinner.
    return (
      <div className="relative min-h-dvh w-full bg-bg">
        <div className="relative z-10 mx-auto max-w-350 px-6 pt-6 pb-16">
          <ReportSkeleton />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-bg p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-red-950/15 p-6 text-center backdrop-blur-md">
          <AlertTriangle className="mx-auto mb-4 text-red-500" size={40} />
          <h2 className="mb-2 text-xl font-semibold text-fg">
            This link isn&apos;t available
          </h2>
          <p className="mb-6 text-sm text-muted">
            It may have been revoked by its owner, or it never existed.
          </p>
          <a href="/" className="btn btn-secondary w-full">
            <ArrowLeft size={16} /> Go to CodeMind
          </a>
        </div>
      </div>
    );
  }

  const sharedBy = data.sharedBy.githubUsername ?? 'a CodeMind user';

  return (
    <div className="relative min-h-dvh w-full bg-bg">
      {/* Fixed to the viewport so the star field follows the reader down the
          whole report, not just the first screenful. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-size-[28px_28px] mask-[radial-gradient(ellipse_60%_55%_at_50%_35%,black,transparent)]" />
        <StarsBackground starDensity={0.00012} />
      </div>

      <div className="relative z-10 mx-auto max-w-350 px-6 pb-16">
        <ReportHeader
          repoFullName={data.repoFullName}
          status={data.status}
          createdAt={data.createdAt}
          synthesis={data.report.synthesis}
          eyebrow={
            // No export, no retry, no share-of-a-share: a viewer can read this
            // report and nothing else. Say so, rather than showing them
            // controls that would 404 against an ownership check.
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-sm text-muted">
                <Eye size={15} className="text-glow-blue" />
                Shared by{' '}
                <strong className="font-medium text-fg">{sharedBy}</strong>
                <span className="rounded-full border border-line px-2 py-0.5 font-mono text-xs">
                  view only
                </span>
              </span>
              <a
                href="/"
                className="text-sm text-muted no-underline hover:text-fg"
              >
                Analyze your own repo →
              </a>
            </div>
          }
        />

        <ReportDashboard
          report={data.report}
          agentResults={data.agentResults}
        />
      </div>
    </div>
  );
}
