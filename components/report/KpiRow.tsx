'use client';

import type { ReactNode } from 'react';
import {
  BookText,
  Boxes,
  Gauge,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import type { AgentOutputs, Synthesis } from '../../lib/types';
import { healthBand } from '../../lib/report';
import { cn } from '../../lib/utils';

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'neutral';

const TONE_STYLES: Record<Tone, { icon: string; value: string }> = {
  green: { icon: 'text-glow-green bg-glow-green/10', value: 'text-glow-green' },
  amber: { icon: 'text-glow-amber bg-glow-amber/10', value: 'text-glow-amber' },
  red: { icon: 'text-accent bg-accent/10', value: 'text-accent' },
  blue: { icon: 'text-glow-blue bg-glow-blue/10', value: 'text-glow-blue' },
  neutral: { icon: 'text-muted bg-white/5', value: 'text-fg' },
};

function Kpi({
  icon,
  label,
  value,
  detail,
  tone = 'neutral',
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: Tone;
  href?: string;
}) {
  const styles = TONE_STYLES[tone];

  const body = (
    <>
      <span
        className={cn(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          styles.icon,
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs text-muted">{label}</span>
        <span
          className={cn(
            'block text-xl font-semibold tabular-nums leading-tight',
            styles.value,
          )}
        >
          {value}
        </span>
        <span className="block truncate text-xs text-muted">{detail}</span>
      </span>
    </>
  );

  const className =
    'flex items-center gap-3 rounded-2xl border border-line bg-surface/50 p-4 backdrop-blur-sm transition-colors';

  return href ? (
    <a
      href={href}
      className={cn(className, 'no-underline hover:border-line-strong')}
    >
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}

/**
 * The one screenful a reader is guaranteed to see. Every tile is a count the
 * agents actually produced — nothing is scraped from the rendered Markdown —
 * and each links to the section that explains it.
 */
export function KpiRow({
  outputs,
  synthesis,
}: {
  outputs: AgentOutputs;
  synthesis: Synthesis | null;
}) {
  const vulnerabilities = outputs.security?.vulnerabilities ?? [];
  const severe = vulnerabilities.filter(
    (v) => v.severity === 'critical' || v.severity === 'high',
  ).length;

  const qualityIssues = outputs.quality?.issues ?? [];
  const outdated = outputs.dependency?.outdated_risks ?? [];
  const runtimeDeps = outputs.dependency?.runtime_dependencies ?? [];
  const docScore = outputs.docs?.doc_score;

  const score = synthesis?.overallHealthScore;
  const band = score === undefined ? null : healthBand(score);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Kpi
        icon={<Gauge size={17} />}
        label="Health score"
        value={score === undefined ? '—' : `${score}`}
        detail={band?.label ?? 'Not scored'}
        tone={band?.tone ?? 'neutral'}
        href="#summary"
      />
      <Kpi
        icon={<ShieldAlert size={17} />}
        label="Critical + high vulns"
        value={`${severe}`}
        detail={`${vulnerabilities.length} total findings`}
        tone={severe > 0 ? 'red' : 'green'}
        href="#security"
      />
      <Kpi
        icon={<SlidersHorizontal size={17} />}
        label="Quality issues"
        value={`${qualityIssues.length}`}
        detail={`${outputs.quality?.complexity_hotspots?.length ?? 0} hotspots`}
        tone={qualityIssues.length > 5 ? 'amber' : 'neutral'}
        href="#quality"
      />
      <Kpi
        icon={<Boxes size={17} />}
        label="Outdated deps"
        value={`${outdated.length}`}
        detail={`${runtimeDeps.length} runtime deps`}
        tone={outdated.length > 0 ? 'amber' : 'green'}
        href="#dependencies"
      />
      <Kpi
        icon={<BookText size={17} />}
        label="Docs score"
        value={docScore === undefined ? '—' : `${docScore}`}
        detail={outputs.docs?.readme_quality ?? 'No README signal'}
        tone="blue"
        href="#docs"
      />
    </div>
  );
}
