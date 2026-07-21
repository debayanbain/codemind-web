'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { AgentResultSummary, ReportPayload } from '../../lib/types';
import { agentOutputs } from '../../lib/report';
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
  /** Optional right-rail (the repo chat). Sticky beside the report on wide
      screens; stacked as a bounded panel below it otherwise. */
  chat,
}: {
  report: ReportPayload;
  agentResults: AgentResultSummary[];
  banner?: ReactNode;
  chat?: ReactNode;
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

      {/* KPI row spans the full width so the five tiles never get squeezed by
          the chat rail. */}
      <motion.div {...reveal(0)}>
        <KpiRow outputs={outputs} synthesis={report.synthesis} />
      </motion.div>

      {/* Report (nav + sections) on the left; chat rail on the right at ≥xl,
          stacked below on narrower screens. One shared grid keeps every column
          aligned to the same baseline. */}
      <div
        className={
          chat
            ? 'grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start'
            : 'grid gap-6'
        }
      >
        <div className="grid min-w-0 gap-6 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:items-start">
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
          </div>
        </div>

        {chat && (
          <aside className="h-[600px] min-w-0 xl:sticky xl:top-20 xl:h-[calc(100vh-6.5rem)]">
            {chat}
          </aside>
        )}
      </div>
    </div>
  );
}

