'use client';

import {
  BookText,
  Boxes,
  Check,
  FileWarning,
  Layers,
  ListChecks,
  Lock,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  AgentOutputs,
  ReportPayload,
  Severity,
  Vulnerability,
} from '../../lib/types';
import {
  QUALITY_CATEGORY_LABELS,
  SEVERITY_ORDER,
  findDiagram,
  matchingDiagrams,
} from '../../lib/report';
import {
  Chip,
  DiagramFigure,
  EmptyState,
  FactRow,
  ReportCard,
  SeverityBadge,
} from './primitives';

/** Section ids double as the scroll anchors the nav and the KPI tiles link to. */
export const SECTION_IDS = {
  summary: 'summary',
  architecture: 'architecture',
  security: 'security',
  dependencies: 'dependencies',
  quality: 'quality',
  docs: 'docs',
  recommendations: 'recommendations',
} as const;

function CodeChip({ children }: { children: string }) {
  return (
    <code className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-xs text-fg">
      {children}
    </code>
  );
}

function BoolFact({ value }: { value: boolean | undefined }) {
  if (value === undefined) return <span className="text-muted">unknown</span>;
  return value ? (
    <span className="inline-flex items-center gap-1.5 text-glow-green">
      <Check size={13} aria-hidden="true" /> yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <X size={13} aria-hidden="true" /> no
    </span>
  );
}

/* ── Executive summary ───────────────────────────────────────────────────── */

export function SummarySection({
  outputs,
  report,
}: {
  outputs: AgentOutputs;
  report: ReportPayload;
}) {
  const synthesis = report.synthesis;
  const arch = outputs.architecture ?? {};
  const gauge = findDiagram(report, 'health-gauge');

  return (
    <ReportCard
      id={SECTION_IDS.summary}
      title="Executive summary"
      icon={<Sparkles size={17} className="text-glow-blue" />}
      meta={
        <Chip tone="neutral">
          {report.totalTokens.toLocaleString()} tokens
        </Chip>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <p className="m-0 text-[0.95rem] leading-relaxed text-fg/85">
            {synthesis?.executiveSummary ??
              'This report predates structured synthesis. The full write-up is in the Markdown below.'}
          </p>
          <dl className="mt-5 mb-0">
            <FactRow label="Framework">
              <CodeChip>{arch.framework ?? 'Unknown'}</CodeChip>
            </FactRow>
            <FactRow label="Language">
              <CodeChip>{arch.language ?? 'Unknown'}</CodeChip>
            </FactRow>
            <FactRow label="Architecture pattern">
              <CodeChip>{arch.architecture_pattern ?? 'Unknown'}</CodeChip>
            </FactRow>
          </dl>
        </div>
        {gauge && <DiagramFigure diagram={gauge} className="lg:w-95" />}
      </div>
    </ReportCard>
  );
}

/* ── Architecture ────────────────────────────────────────────────────────── */

export function ArchitectureSection({
  outputs,
  report,
}: {
  outputs: AgentOutputs;
  report: ReportPayload;
}) {
  const arch = outputs.architecture;
  const flows = matchingDiagrams(report, /^request-flow-\d+$/);

  return (
    <ReportCard
      id={SECTION_IDS.architecture}
      title="Architecture"
      icon={<Layers size={17} className="text-glow-purple" />}
      meta={
        arch?.modules?.length ? (
          <Chip tone="neutral">{arch.modules.length} modules</Chip>
        ) : undefined
      }
    >
      {!arch ? (
        <EmptyState>The architecture agent did not produce a result.</EmptyState>
      ) : (
        <div className="grid gap-6">
          {arch.summary && (
            <p className="m-0 text-sm leading-relaxed text-fg/80">
              {arch.summary}
            </p>
          )}

          <DiagramFigure diagram={findDiagram(report, 'architecture-modules')} />

          {arch.module_responsibilities?.length ? (
            <div>
              <h3 className="mb-3 mt-0 text-sm font-medium text-fg">Modules</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-120 border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted">
                      <th className="border-b border-line px-3 py-2 font-medium">
                        Module
                      </th>
                      <th className="border-b border-line px-3 py-2 font-medium">
                        Responsibility
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {arch.module_responsibilities.map((m, i) => (
                      <tr key={`${m.module}-${i}`}>
                        <td className="border-b border-line px-3 py-2.5 align-top">
                          <CodeChip>{m.module}</CodeChip>
                        </td>
                        <td className="border-b border-line px-3 py-2.5 text-fg/80">
                          {m.responsibility}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {arch.entry_points?.length ? (
            <div>
              <h3 className="mb-2 mt-0 text-sm font-medium text-fg">
                Entry points
              </h3>
              <div className="flex flex-wrap gap-2">
                {arch.entry_points.map((e) => (
                  <CodeChip key={e}>{e}</CodeChip>
                ))}
              </div>
            </div>
          ) : null}

          {arch.design_patterns?.length ? (
            <div>
              <h3 className="mb-2 mt-0 text-sm font-medium text-fg">
                Design patterns detected
              </h3>
              <div className="flex flex-wrap gap-2">
                {arch.design_patterns.map((p) => (
                  <Chip key={p} tone="blue">
                    {p}
                  </Chip>
                ))}
              </div>
            </div>
          ) : null}

          {flows.length > 0 && (
            <div>
              <h3 className="mb-3 mt-0 text-sm font-medium text-fg">
                Request flows
              </h3>
              <div className="grid gap-5">
                {flows.map((flow, i) => {
                  // request-flow-1 correlates to request_flows[0].
                  const description = arch.request_flows?.[i]?.description;
                  return (
                    <div key={flow.slug} className="grid gap-2">
                      {description ? (
                        <p className="m-0 text-sm leading-relaxed text-fg/70">
                          {description}
                        </p>
                      ) : null}
                      <DiagramFigure diagram={flow} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </ReportCard>
  );
}

/* ── Security ────────────────────────────────────────────────────────────── */

function bySeverity(a: Vulnerability, b: Vulnerability) {
  return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
}

const RISK_TO_SEVERITY: Record<string, Severity> = {
  high: 'high',
  medium: 'medium',
  low: 'low',
};

export function SecuritySection({
  outputs,
  report,
}: {
  outputs: AgentOutputs;
  report: ReportPayload;
}) {
  const sec = outputs.security;
  // Sorted, not filtered: a reader scanning top-down hits the criticals first.
  const vulns = [...(sec?.vulnerabilities ?? [])].sort(bySeverity);
  const endpoints = sec?.sensitive_endpoints ?? [];

  return (
    <ReportCard
      id={SECTION_IDS.security}
      title="Security"
      icon={<ShieldAlert size={17} className="text-accent" />}
      meta={
        sec?.secrets_exposure_risk ? (
          <Chip tone="red">Secrets exposure risk</Chip>
        ) : undefined
      }
    >
      {!sec ? (
        <EmptyState>The security agent did not produce a result.</EmptyState>
      ) : (
        <div className="grid gap-6">
          {sec.summary && (
            <p className="m-0 text-sm leading-relaxed text-fg/80">
              {sec.summary}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Lock size={14} className="text-muted" aria-hidden="true" />
            <span className="text-sm text-muted">Auth mechanism</span>
            <CodeChip>{sec.auth_mechanism ?? 'None detected'}</CodeChip>
          </div>

          <DiagramFigure diagram={findDiagram(report, 'security-auth-flow')} />

          <div>
            <h3 className="mb-3 mt-0 text-sm font-medium text-fg">
              Vulnerabilities
            </h3>
            {vulns.length === 0 ? (
              <EmptyState>No vulnerabilities reported.</EmptyState>
            ) : (
              <ul className="m-0 grid list-none gap-2 p-0">
                {vulns.map((v, i) => (
                  <li
                    key={`${v.type}-${v.location}-${i}`}
                    className="rounded-xl border border-line bg-surface-2/60 p-3.5"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <SeverityBadge severity={v.severity} />
                      <span className="text-sm font-medium text-fg">
                        {v.type}
                      </span>
                      <CodeChip>{v.location}</CodeChip>
                    </div>
                    <p className="m-0 mt-2 text-sm leading-relaxed text-muted">
                      {v.description}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {endpoints.length > 0 && (
            <div>
              <h3 className="mb-3 mt-0 text-sm font-medium text-fg">
                Sensitive endpoints
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-140 border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted">
                      <th className="border-b border-line px-3 py-2 font-medium">
                        Endpoint
                      </th>
                      <th className="border-b border-line px-3 py-2 font-medium">
                        Method
                      </th>
                      <th className="border-b border-line px-3 py-2 font-medium">
                        Risk
                      </th>
                      <th className="border-b border-line px-3 py-2 font-medium">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoints.map((e, i) => (
                      <tr key={`${e.method}-${e.path}-${i}`}>
                        <td className="border-b border-line px-3 py-2.5">
                          <CodeChip>{e.path}</CodeChip>
                        </td>
                        <td className="border-b border-line px-3 py-2.5 font-mono text-xs text-muted">
                          {e.method}
                        </td>
                        <td className="border-b border-line px-3 py-2.5">
                          <SeverityBadge
                            severity={RISK_TO_SEVERITY[e.risk] ?? 'low'}
                          />
                        </td>
                        <td className="border-b border-line px-3 py-2.5 text-muted">
                          {e.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sec.missing_protections?.length ? (
            <div>
              <h3 className="mb-2 mt-0 text-sm font-medium text-fg">
                Missing protections
              </h3>
              <ul className="m-0 grid list-none gap-1.5 p-0">
                {sec.missing_protections.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-2 text-sm text-muted"
                  >
                    <FileWarning
                      size={14}
                      className="mt-0.5 shrink-0 text-glow-amber"
                      aria-hidden="true"
                    />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </ReportCard>
  );
}

/* ── Dependencies ────────────────────────────────────────────────────────── */

export function DependencySection({
  outputs,
  report,
}: {
  outputs: AgentOutputs;
  report: ReportPayload;
}) {
  const dep = outputs.dependency;
  const outdated = dep?.outdated_risks ?? [];
  const critical = new Set(dep?.critical_deps ?? []);
  const runtime = dep?.runtime_dependencies ?? [];

  return (
    <ReportCard
      id={SECTION_IDS.dependencies}
      title="Dependencies"
      icon={<Boxes size={17} className="text-glow-teal" />}
      meta={
        <Chip tone={outdated.length > 0 ? 'amber' : 'green'}>
          {outdated.length} outdated
        </Chip>
      }
    >
      {!dep ? (
        <EmptyState>The dependency agent did not produce a result.</EmptyState>
      ) : (
        <div className="grid gap-6">
          {dep.summary && (
            <p className="m-0 text-sm leading-relaxed text-fg/80">
              {dep.summary}
            </p>
          )}

          <DiagramFigure diagram={findDiagram(report, 'dependency-graph')} />

          {outdated.length > 0 && (
            <div>
              <h3 className="mb-3 mt-0 text-sm font-medium text-fg">
                Outdated / risky packages
              </h3>
              <ul className="m-0 grid list-none gap-2 p-0">
                {outdated.map((o) => (
                  <li
                    key={o.package}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-line bg-surface-2/60 px-3.5 py-3"
                  >
                    <CodeChip>{o.package}</CodeChip>
                    <span className="text-sm text-muted">{o.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {runtime.length > 0 && (
            <div>
              <h3 className="mb-2 mt-0 text-sm font-medium text-fg">
                Runtime dependencies
                <span className="ml-2 font-normal text-muted">
                  {runtime.length}
                </span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {runtime.map((d) =>
                  critical.has(d) ? (
                    <Chip key={d} tone="blue">
                      {d}
                    </Chip>
                  ) : (
                    <CodeChip key={d}>{d}</CodeChip>
                  ),
                )}
              </div>
              {critical.size > 0 && (
                <p className="mb-0 mt-2.5 text-xs text-muted">
                  Highlighted packages are load-bearing for this codebase.
                </p>
              )}
            </div>
          )}

          {dep.license_concerns?.length ? (
            <div>
              <h3 className="mb-2 mt-0 text-sm font-medium text-fg">
                License concerns
              </h3>
              <ul className="m-0 grid list-none gap-1.5 p-0">
                {dep.license_concerns.map((l) => (
                  <li key={l} className="text-sm text-muted">
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </ReportCard>
  );
}

/* ── Quality ─────────────────────────────────────────────────────────────── */

const SCORE_TONE = {
  good: 'green',
  partial: 'amber',
  poor: 'red',
} as const;

export function QualitySection({
  outputs,
  report,
}: {
  outputs: AgentOutputs;
  report: ReportPayload;
}) {
  const qual = outputs.quality;
  const issues = qual?.issues ?? [];

  return (
    <ReportCard
      id={SECTION_IDS.quality}
      title="Code quality"
      icon={<SlidersHorizontal size={17} className="text-glow-amber" />}
      meta={<Chip tone="neutral">{issues.length} issues</Chip>}
    >
      {!qual ? (
        <EmptyState>The quality agent did not produce a result.</EmptyState>
      ) : (
        <div className="grid gap-6">
          {qual.summary && (
            <p className="m-0 text-sm leading-relaxed text-fg/80">
              {qual.summary}
            </p>
          )}

          <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
            <DiagramFigure
              diagram={findDiagram(report, 'quality-donut')}
              className="lg:w-125"
            />
            <dl className="m-0">
              <FactRow label="Error handling">
                {qual.error_handling_score ? (
                  <Chip tone={SCORE_TONE[qual.error_handling_score]}>
                    {qual.error_handling_score}
                  </Chip>
                ) : (
                  '—'
                )}
              </FactRow>
              <FactRow label="Type safety">
                {qual.type_safety_score ? (
                  <Chip tone={SCORE_TONE[qual.type_safety_score]}>
                    {qual.type_safety_score}
                  </Chip>
                ) : (
                  '—'
                )}
              </FactRow>
              <FactRow label="Test coverage signal">
                {qual.test_coverage_signal ?? '—'}
              </FactRow>
            </dl>
          </div>

          {issues.length > 0 && (
            <div>
              <h3 className="mb-3 mt-0 text-sm font-medium text-fg">Issues</h3>
              <ul className="m-0 grid list-none gap-2 p-0">
                {issues.map((issue, i) => (
                  <li
                    key={`${issue.category}-${issue.location}-${i}`}
                    className="rounded-xl border border-line bg-surface-2/60 p-3.5"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Chip tone="amber">
                        {QUALITY_CATEGORY_LABELS[issue.category] ??
                          issue.category}
                      </Chip>
                      <CodeChip>{issue.location}</CodeChip>
                    </div>
                    <p className="m-0 mt-2 text-sm leading-relaxed text-muted">
                      {issue.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {qual.complexity_hotspots?.length ? (
            <div>
              <h3 className="mb-2 mt-0 text-sm font-medium text-fg">
                Complexity hotspots
              </h3>
              <div className="flex flex-wrap gap-2">
                {qual.complexity_hotspots.map((h) => (
                  <CodeChip key={h}>{h}</CodeChip>
                ))}
              </div>
            </div>
          ) : null}

          {qual.positive_patterns?.length ? (
            <div>
              <h3 className="mb-2 mt-0 text-sm font-medium text-fg">
                What this codebase does well
              </h3>
              <ul className="m-0 grid list-none gap-1.5 p-0">
                {qual.positive_patterns.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-2 text-sm text-muted"
                  >
                    <Check
                      size={14}
                      className="mt-0.5 shrink-0 text-glow-green"
                      aria-hidden="true"
                    />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </ReportCard>
  );
}

/* ── Docs ────────────────────────────────────────────────────────────────── */

export function DocsSection({ outputs }: { outputs: AgentOutputs }) {
  const docs = outputs.docs;
  const undocumented = docs?.undocumented_public_apis ?? [];

  return (
    <ReportCard
      id={SECTION_IDS.docs}
      title="Documentation"
      icon={<BookText size={17} className="text-glow-blue" />}
      meta={
        docs?.doc_score !== undefined ? (
          <Chip tone="neutral">{docs.doc_score}/100</Chip>
        ) : undefined
      }
    >
      {!docs ? (
        <EmptyState>The docs agent did not produce a result.</EmptyState>
      ) : (
        <div className="grid gap-6">
          {docs.summary && (
            <p className="m-0 text-sm leading-relaxed text-fg/80">
              {docs.summary}
            </p>
          )}

          <dl className="m-0">
            <FactRow label="README quality">
              {docs.readme_quality ?? '—'}
            </FactRow>
            <FactRow label="Public API documented">
              <BoolFact value={docs.api_documented} />
            </FactRow>
            <FactRow label="Contribution guide">
              <BoolFact value={docs.has_contribution_guide} />
            </FactRow>
            <FactRow label="Changelog">
              <BoolFact value={docs.has_changelog} />
            </FactRow>
            <FactRow label="Inline comment density">
              {docs.inline_comment_density ?? '—'}
            </FactRow>
          </dl>

          {undocumented.length > 0 && (
            <div>
              <h3 className="mb-2 mt-0 text-sm font-medium text-fg">
                Undocumented public APIs
                <span className="ml-2 font-normal text-muted">
                  {undocumented.length}
                </span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {undocumented.map((api) => (
                  <CodeChip key={api}>{api}</CodeChip>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ReportCard>
  );
}

/* ── Recommendations ─────────────────────────────────────────────────────── */

export function RecommendationsSection({ report }: { report: ReportPayload }) {
  const recommendations = report.synthesis?.recommendations ?? [];

  return (
    <ReportCard
      id={SECTION_IDS.recommendations}
      title="Recommendations"
      icon={<ListChecks size={17} className="text-glow-green" />}
      meta={<Chip tone="neutral">Priority order</Chip>}
    >
      {recommendations.length === 0 ? (
        <EmptyState>No recommendations were produced for this run.</EmptyState>
      ) : (
        <ol className="m-0 grid list-none gap-2.5 p-0">
          {recommendations.map((rec, i) => (
            <li
              key={rec}
              className="flex items-start gap-3 rounded-xl border border-line bg-surface-2/60 p-3.5"
            >
              <span
                className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-glow-green/10 font-mono text-xs text-glow-green"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-fg/85">{rec}</span>
            </li>
          ))}
        </ol>
      )}
    </ReportCard>
  );
}
