'use client';

import type { ReactNode } from 'react';
import { GitBranch } from 'lucide-react';
import type { JobStatus, Synthesis } from '../../lib/types';
import { healthBand } from '../../lib/report';
import { Chip } from './primitives';

/**
 * Sticky, and deliberately shallow: repo identity, the one number that matters,
 * and the actions. Everything a reader needs to know they're in the right
 * report while scrolled 3000px into it.
 */
export function ReportHeader({
  repoFullName,
  status,
  createdAt,
  synthesis,
  actions,
  eyebrow,
}: {
  repoFullName: string;
  status: JobStatus;
  createdAt: string;
  synthesis: Synthesis | null;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  const score = synthesis?.overallHealthScore;
  const band = score === undefined ? null : healthBand(score);

  return (
    <header className="sticky top-0 z-30 -mx-4 sm:-mx-6 md:-mx-8 mb-6 border-b border-line bg-bg/85 px-4 sm:px-6 md:px-8 py-3.5 backdrop-blur-xl transition-all">
      {eyebrow}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2/80 text-glow-blue sm:inline-flex"
            aria-hidden="true"
          >
            <GitBranch size={17} />
          </span>
          <div className="min-w-0">
            <h1 className="m-0 truncate text-lg font-semibold tracking-tight text-fg md:text-xl font-poppins">
              {repoFullName}
            </h1>
            <p className="m-0 truncate font-mono text-xs text-muted">
              {new Date(createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {band && score !== undefined && (
            <Chip tone={band.tone} className="tabular-nums font-poppins font-medium">
              {score}/100 · {band.label}
            </Chip>
          )}
          <span className={`badge badge-${status}`}>{status}</span>
          {actions}
        </div>
      </div>
    </header>
  );
}
