'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { RenderedDiagram, Severity } from '../../lib/types';
import { cn } from '../../lib/utils';

/* ── Card ────────────────────────────────────────────────────────────────── */

export function ReportCard({
  id,
  title,
  icon,
  meta,
  children,
}: {
  id?: string;
  title: string;
  icon?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    // scroll-mt clears the sticky header so an anchored section isn't hidden
    // under it when the section nav jumps to it.
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-line bg-surface/50 backdrop-blur-md overflow-hidden transition-all"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2/30 px-5 py-4 md:px-6">
        <h2 className="m-0 flex items-center gap-2.5 text-base font-semibold font-poppins tracking-tight text-fg">
          {icon}
          {title}
        </h2>
        {meta}
      </header>
      <div className="px-5 py-5 md:px-6 md:py-6">{children}</div>
    </section>
  );
}

/* ── Chips & badges ──────────────────────────────────────────────────────── */

export function Chip({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue';
  className?: string;
}) {
  const tones = {
    neutral: 'border-line text-muted',
    green: 'border-glow-green/30 bg-glow-green/10 text-glow-green',
    amber: 'border-glow-amber/30 bg-glow-amber/10 text-glow-amber',
    red: 'border-accent/30 bg-accent/10 text-accent',
    blue: 'border-glow-blue/30 bg-glow-blue/10 text-glow-blue',
  } as const;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-poppins text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const SEVERITY_TONE: Record<Severity, 'red' | 'amber' | 'blue' | 'neutral'> = {
  critical: 'red',
  high: 'red',
  medium: 'amber',
  low: 'blue',
};

/**
 * Severity is spelled out, never encoded in colour alone — the palette has to
 * survive colourblind viewers and greyscale printing, same rule the backend's
 * diagram builders follow.
 */
export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Chip tone={SEVERITY_TONE[severity]} className="uppercase tracking-wide">
      {(severity === 'critical' || severity === 'high') && (
        <AlertTriangle size={11} aria-hidden="true" />
      )}
      {severity}
    </Chip>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm font-poppins text-muted">
      {children}
    </p>
  );
}

/* ── Key/value list ──────────────────────────────────────────────────────── */

export function FactRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/60 py-2.5 last:border-0">
      <dt className="text-sm font-poppins text-muted">{label}</dt>
      <dd className="m-0 text-right font-mono text-sm text-fg">{children}</dd>
    </div>
  );
}

/* ── Diagram ─────────────────────────────────────────────────────────────── */

/**
 * The SVG is produced entirely server-side by the synthesizer and arrives inert:
 * D2 output goes through `sanitizeSvg()` (strips <script>, <foreignObject>,
 * on* handlers, javascript: URIs), and the hand-built charts XML-escape every
 * interpolated label. Diagram labels originate in LLM output, so that scrubbing
 * is load-bearing — a repo really can contain a symbol named `<script>`.
 *
 * Nothing executes here and no diagram library ships to the client: the browser
 * embeds a string. If this ever renders SVG from a source other than our own
 * synthesizer, it needs client-side DOMPurify instead.
 */
export function DiagramFigure({
  diagram,
  className,
}: {
  diagram: RenderedDiagram | undefined;
  className?: string;
}) {
  if (!diagram) return null;

  if (diagram.degraded) {
    return (
      <EmptyState>
        &ldquo;{diagram.title}&rdquo; failed to render. The underlying analysis
        is intact — see the section data below.
      </EmptyState>
    );
  }

  return (
    <figure className={cn('m-0 w-full', className)}>
      <div
        className="cm-diagram w-full overflow-hidden rounded-xl border border-line bg-surface-2/40 p-4 sm:p-5 flex items-center justify-center"
        // eslint-disable-next-line react/no-danger -- inert, server-rendered, server-sanitized SVG
        dangerouslySetInnerHTML={{ __html: diagram.svg }}
      />
      <figcaption className="mt-2 text-center text-xs font-poppins text-muted">
        {diagram.title}
      </figcaption>
    </figure>
  );
}
