'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, FileCode2 } from 'lucide-react';
import type { AgentResultSummary, ReportPayload } from '../../lib/types';
import { agentOutputs, estimatedCost } from '../../lib/report';
import { ReportView } from '../ReportView';
import { KpiRow } from './KpiRow';
import { SectionNav, type NavSection } from './SectionNav';
import {
  ArchitectureSection,
  DependencySection,
  DocsSection,
  QualitySection,
  RecommendationsSection,
  SECTION_IDS,
  SecuritySection,
  SummarySection,
} from './sections';

export function ReportDashboard({
  report,
  agentResults,
  /** Rendered above the KPI row — partial-failure banners, live pipeline, etc. */
  banner,
}: {
  report: ReportPayload;
  agentResults: AgentResultSummary[];
  banner?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const outputs = useMemo(() => agentOutputs(agentResults), [agentResults]);

  const sections: NavSection[] = useMemo(() => {
    const vulns = outputs.security?.vulnerabilities?.length ?? 0;
    const issues = outputs.quality?.issues?.length ?? 0;
    const outdated = outputs.dependency?.outdated_risks?.length ?? 0;
    return [
      { id: SECTION_IDS.summary, label: 'Summary' },
      { id: SECTION_IDS.architecture, label: 'Architecture' },
      {
        id: SECTION_IDS.security,
        label: 'Security',
        badge: vulns ? `${vulns}` : undefined,
      },
      {
        id: SECTION_IDS.dependencies,
        label: 'Dependencies',
        badge: outdated ? `${outdated}` : undefined,
      },
      {
        id: SECTION_IDS.quality,
        label: 'Quality',
        badge: issues ? `${issues}` : undefined,
      },
      { id: SECTION_IDS.docs, label: 'Docs' },
      { id: SECTION_IDS.recommendations, label: 'Recommendations' },
    ];
  }, [outputs]);

  // Sections resolve from blur one after another (capped so below-the-fold
  // content isn't held hostage to a long stagger queue).
  const reveal = (order: number) => ({
    initial: reduceMotion
      ? false
      : { opacity: 0, y: 14, filter: 'blur(10px)' as const },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' as const },
    transition: { duration: 0.45, delay: Math.min(order, 5) * 0.09 },
  });

  return (
    <div className="grid gap-6">
      {banner}

      <motion.div {...reveal(0)}>
        <KpiRow outputs={outputs} synthesis={report.synthesis} />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
        {/* Nav stays outside the reveal wrappers — a transform/filter ancestor
            would break its lg:sticky positioning. */}
        <SectionNav sections={sections} />

        <div className="grid min-w-0 gap-6">
          <motion.div {...reveal(1)}>
            <SummarySection outputs={outputs} report={report} />
          </motion.div>
          <motion.div {...reveal(2)}>
            <ArchitectureSection outputs={outputs} report={report} />
          </motion.div>
          <motion.div {...reveal(3)}>
            <SecuritySection outputs={outputs} report={report} />
          </motion.div>
          <motion.div {...reveal(4)}>
            <DependencySection outputs={outputs} report={report} />
          </motion.div>
          <motion.div {...reveal(5)}>
            <QualitySection outputs={outputs} report={report} />
          </motion.div>
          <motion.div {...reveal(6)}>
            <DocsSection outputs={outputs} />
          </motion.div>
          <motion.div {...reveal(7)}>
            <RecommendationsSection report={report} />
          </motion.div>
          <motion.div {...reveal(8)}>
            <RawMarkdownPanel report={report} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/**
 * The Markdown the exporter serves, verbatim. Collapsed by default: it is the
 * same information the sections above already render, and it is also the only
 * complete view for reports written before synthesis was stored structurally.
 */
function RawMarkdownPanel({ report }: { report: ReportPayload }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-line bg-surface/40 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 bg-transparent px-5 py-4 text-left md:px-6"
      >
        <span className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-fg">
          <FileCode2 size={17} className="text-muted" />
          Full Markdown report
        </span>
        <span className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-muted">
            {estimatedCost(report.totalTokens)} ·{' '}
            {report.totalTokens.toLocaleString()} tokens
          </span>
          <ChevronDown
            size={16}
            className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </span>
      </button>

      {open && (
        <div className="border-t border-line px-5 py-5 md:px-6 md:py-6">
          <ReportView
            markdown={report.markdownContent}
            diagrams={report.diagrams}
          />
        </div>
      )}
    </section>
  );
}
