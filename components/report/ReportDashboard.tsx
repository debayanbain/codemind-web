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
import {
  ApiSurfaceSection,
  FindingsRegisterSection,
  MeasuredSection,
  RunRecordSection,
  SECTION_IDS_MEASURED,
  SystemFlowSection,
} from './measured';

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

  const hasFacts = !!report.facts;
  const hasRoutes = (report.facts?.routes?.length ?? 0) > 0;
  const hasRunRecord = agentResults.length > 0;

  // One ordered list of every section that will actually render, so the nav,
  // the numbering and the body can't disagree about what section 7 is. Cards
  // that would render null (no facts, no routes) are dropped here too, so their
  // number is never assigned.
  const layout = useMemo(() => {
    const vulns = outputs.security?.vulnerabilities?.length ?? 0;
    const issues = outputs.quality?.issues?.length ?? 0;
    const outdated = outputs.dependency?.outdated_risks?.length ?? 0;
    const findingsCount = vulns + issues + outdated;

    const items: (NavSection & { key: string })[] = [];
    const add = (
      show: boolean,
      key: string,
      id: string,
      label: string,
      badge?: string,
    ) => {
      if (show) items.push({ key, id, label, badge });
    };

    add(hasFacts, 'measured', SECTION_IDS_MEASURED.measured, 'At a glance');
    add(true, 'summary', SECTION_IDS.summary, 'Summary');
    add(hasFacts, 'systemFlow', SECTION_IDS_MEASURED.systemFlow, 'How it runs');
    add(true, 'architecture', SECTION_IDS.architecture, 'Architecture');
    add(hasRoutes, 'api', SECTION_IDS_MEASURED.api, 'API surface');
    add(
      true,
      'security',
      SECTION_IDS.security,
      'Security',
      vulns ? `${vulns}` : undefined,
    );
    add(
      true,
      'dependencies',
      SECTION_IDS.dependencies,
      'Dependencies',
      outdated ? `${outdated}` : undefined,
    );
    add(
      true,
      'quality',
      SECTION_IDS.quality,
      'Quality',
      issues ? `${issues}` : undefined,
    );
    add(true, 'docs', SECTION_IDS.docs, 'Docs');
    add(
      true,
      'findings',
      SECTION_IDS_MEASURED.findings,
      'Findings',
      findingsCount ? `${findingsCount}` : undefined,
    );
    add(
      true,
      'recommendations',
      SECTION_IDS.recommendations,
      'Recommendations',
    );
    add(hasRunRecord, 'runRecord', SECTION_IDS_MEASURED.runRecord, 'Run record');
    return items;
  }, [outputs, hasFacts, hasRoutes, hasRunRecord]);

  const sections: NavSection[] = layout;
  // A section's display number is its position in the rendered layout.
  const numberOf = (key: string): number =>
    layout.findIndex((s) => s.key === key) + 1;

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
            {hasFacts && (
              <motion.div {...reveal(0)}>
                <MeasuredSection
                  outputs={outputs}
                  report={report}
                  index={numberOf('measured')}
                />
              </motion.div>
            )}
            <motion.div {...reveal(1)}>
              <SummarySection
                outputs={outputs}
                report={report}
                index={numberOf('summary')}
              />
            </motion.div>
            {hasFacts && (
              <motion.div {...reveal(2)}>
                <SystemFlowSection
                  report={report}
                  index={numberOf('systemFlow')}
                />
              </motion.div>
            )}
            <motion.div {...reveal(2)}>
              <ArchitectureSection
                outputs={outputs}
                report={report}
                index={numberOf('architecture')}
              />
            </motion.div>
            {hasRoutes && (
              <motion.div {...reveal(3)}>
                <ApiSurfaceSection
                  outputs={outputs}
                  report={report}
                  index={numberOf('api')}
                />
              </motion.div>
            )}
            <motion.div {...reveal(3)}>
              <SecuritySection
                outputs={outputs}
                report={report}
                index={numberOf('security')}
              />
            </motion.div>
            <motion.div {...reveal(4)}>
              <DependencySection
                outputs={outputs}
                report={report}
                index={numberOf('dependencies')}
              />
            </motion.div>
            <motion.div {...reveal(5)}>
              <QualitySection
                outputs={outputs}
                report={report}
                index={numberOf('quality')}
              />
            </motion.div>
            <motion.div {...reveal(6)}>
              <DocsSection outputs={outputs} index={numberOf('docs')} />
            </motion.div>
            <motion.div {...reveal(6)}>
              <FindingsRegisterSection
                outputs={outputs}
                index={numberOf('findings')}
              />
            </motion.div>
            <motion.div {...reveal(7)}>
              <RecommendationsSection
                report={report}
                index={numberOf('recommendations')}
              />
            </motion.div>
            {hasRunRecord && (
              <motion.div {...reveal(7)}>
                <RunRecordSection
                  report={report}
                  agentRuns={agentResults}
                  index={numberOf('runRecord')}
                />
              </motion.div>
            )}
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

