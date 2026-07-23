'use client';

import {
  Activity,
  ClipboardList,
  Gauge,
  Route as RouteIcon,
  Terminal,
} from 'lucide-react';
import type { AgentOutputs, ReportPayload } from '../../lib/types';
import { buildFindings, findDiagram, healthBand } from '../../lib/report';
import {
  Chip,
  DataTable,
  DiagramFigure,
  EmptyState,
  ReportCard,
  SeverityBadge,
  Td,
} from './primitives';

/**
 * The sections that render **measured** ground truth rather than agent output.
 *
 * These exist because the dashboard and the Markdown export had drifted apart in
 * the worst possible direction: the `.md` quoted the AST's module table, real
 * routes and measured complexity, while this screen — the richer surface, the
 * one people actually look at — rendered the agents' guessed versions of the
 * same things. `report.facts` closes that, and everything below reads from it.
 *
 * All of it degrades to null rather than an error state: a report generated
 * before the facts column existed simply doesn't show these cards.
 */

function CodeChip({ children }: { children: string }) {
  return (
    <code className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-xs text-fg">
      {children}
    </code>
  );
}

/** `owner/path/file.ts:12` — the part that matters is the end, so clamp the front. */
function Location({ value }: { value: string }) {
  return (
    <span className="font-mono text-xs break-all text-muted">{value}</span>
  );
}

/* ── At a glance ─────────────────────────────────────────────────────────── */

export function MeasuredSection({
  outputs,
  report,
  index,
}: {
  outputs: AgentOutputs;
  report: ReportPayload;
  index?: number;
}) {
  const facts = report.facts;
  if (!facts) return null;

  const { findings } = buildFindings(outputs);
  const score = report.synthesis?.overallHealthScore ?? 0;
  const band = healthBand(score);
  const gauge = findDiagram(report, 'health-gauge');

  const measured: [string, string][] = [
    ['Files indexed', facts.stats.files.toLocaleString()],
    ['Lines of code', facts.stats.linesOfCode.toLocaleString()],
    [
      'Graph nodes / edges',
      `${facts.stats.nodes.toLocaleString()} / ${facts.stats.edges.toLocaleString()}`,
    ],
    ['Routes', String(facts.totalRoutes)],
    ['Modules', String(facts.modules?.length ?? 0)],
    ['Test files', String(facts.testFiles ?? 0)],
    ['Doc files', String(facts.docFiles ?? 0)],
    ['Declared dependencies', String(facts.dependencies?.length ?? 0)],
    ['Import cycles', String(facts.circularDependencies?.length ?? 0)],
  ];

  const critical = findings.filter(
    (f) => f.severity === 'critical' || f.severity === 'high',
  ).length;

  return (
    <ReportCard
      id={SECTION_IDS_MEASURED.measured}
      index={index}
      title="At a glance"
      icon={<Gauge size={17} className="text-glow-blue" />}
      meta={
        <Chip
          tone={band.tone}
        >{`${score}/100 · ${band.label}`}</Chip>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0 grid gap-5">
          <dl className="m-0 grid gap-x-8 gap-y-0 sm:grid-cols-2">
            {measured.map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-3 border-b border-line/50 py-2"
              >
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="m-0 font-mono text-sm tabular-nums text-fg">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap items-center gap-2">
            {facts.frameworks?.slice(0, 3).map((f) => (
              <Chip key={f} tone="blue">
                {f}
              </Chip>
            ))}
            {facts.languages?.slice(0, 4).map((l) => (
              <Chip key={l.language} tone="neutral">
                {l.language} · {l.files}
              </Chip>
            ))}
            <Chip tone={critical > 0 ? 'red' : 'green'}>
              {critical} critical/high finding{critical === 1 ? '' : 's'}
            </Chip>
          </div>

          <p className="m-0 text-xs leading-relaxed text-muted">
            Every figure above came from parsing the repository — no model
            produced any of it, so none of it can be wrong the way a model can be
            wrong.
          </p>

          {facts.degraded?.length ? (
            <p className="m-0 rounded-xl border border-dashed border-line px-4 py-3 text-xs text-muted">
              <strong className="text-fg">Partial:</strong>{' '}
              {facts.degraded.join('; ')}.
            </p>
          ) : null}
        </div>

        {gauge && (
          <DiagramFigure diagram={gauge} className="w-full shrink-0 lg:w-72" />
        )}
      </div>
    </ReportCard>
  );
}

/* ── How it runs + system flow ───────────────────────────────────────────── */

export function SystemFlowSection({
  report,
  index,
}: {
  report: ReportPayload;
  index?: number;
}) {
  const facts = report.facts;
  const flow = findDiagram(report, 'system-flow');
  const chain = [...(facts?.callChains ?? [])].sort(
    (a, b) => b.steps.length - a.steps.length,
  )[0];
  const commands = (facts?.entryPoints ?? []).filter(
    (e) => e.kind === 'script' || e.kind === 'bin' || e.kind === 'main',
  );

  if (!chain && commands.length === 0) return null;

  return (
    <ReportCard
      id={SECTION_IDS_MEASURED.systemFlow}
      index={index}
      title="How it runs"
      icon={<Terminal size={17} className="text-glow-green" />}
      meta={
        chain ? <Chip tone="neutral">{chain.steps.length} hops traced</Chip> : undefined
      }
    >
      <div className="grid gap-6">
        {commands.length > 0 && (
          <div>
            <h3 className="mb-3 mt-0 text-sm font-medium text-fg">Commands</h3>
            <DataTable columns={[{ label: 'Command' }, { label: 'Runs' }]}>
              {commands.map((e) => (
                <tr key={`${e.kind}-${e.name}`}>
                  <Td>
                    <CodeChip>{e.name}</CodeChip>
                  </Td>
                  <Td>
                    <Location value={e.detail} />
                  </Td>
                </tr>
              ))}
            </DataTable>
          </div>
        )}

        {chain && (
          <div className="grid gap-3">
            <div>
              <h3 className="mb-1 mt-0 text-sm font-medium text-fg">
                End-to-end path
              </h3>
              <p className="m-0 text-xs leading-relaxed text-muted">
                One real path through the system. Every arrow is a call edge in
                the graph — this is a trace, not a summary.
              </p>
            </div>

            {flow && <DiagramFigure diagram={flow} />}

            <DataTable
              minWidth="min-w-100"
              columns={[
                { label: '#', align: 'right' },
                { label: 'Symbol' },
                { label: 'Defined at' },
              ]}
            >
              {chain.steps.map((step, i) => (
                <tr key={`${step.file}-${step.symbol}-${i}`}>
                  <Td num>{i + 1}</Td>
                  <Td>
                    <CodeChip>{step.symbol}</CodeChip>
                  </Td>
                  <Td>
                    <Location value={`${step.file}:${step.line}`} />
                  </Td>
                </tr>
              ))}
            </DataTable>
          </div>
        )}
      </div>
    </ReportCard>
  );
}

/* ── API surface ─────────────────────────────────────────────────────────── */

/**
 * Compare two route strings written by different sources. The graph reports
 * `GET /jobs/:id`; an agent writes `/jobs/:jobId`. Same endpoint — matching them
 * literally would flag every route as unverified.
 */
function normalizeRoute(url: string): string {
  return String(url ?? '')
    .replace(/^[A-Z]+\s+/, '')
    .replace(/:[^/]+/g, ':p')
    .replace(/\/+$/, '')
    .toLowerCase();
}

export function ApiSurfaceSection({
  outputs,
  report,
  index,
}: {
  outputs: AgentOutputs;
  report: ReportPayload;
  index?: number;
}) {
  const routes = report.facts?.routes ?? [];
  if (routes.length === 0) return null;

  // The security agent's assessment rides along on the real route list rather
  // than publishing an endpoint table of its own — which is how a previous
  // report came to list `/api/queries`, a route that does not exist.
  const flagged = new Map(
    (outputs.security?.sensitive_endpoints ?? []).map((e) => [
      normalizeRoute(e.path),
      e,
    ]),
  );
  const matched = new Set<string>();
  for (const r of routes) {
    const key = normalizeRoute(r.url);
    if (flagged.has(key)) matched.add(key);
  }
  const dropped = flagged.size - matched.size;

  return (
    <ReportCard
      id={SECTION_IDS_MEASURED.api}
      index={index}
      title="API surface"
      icon={<RouteIcon size={17} className="text-glow-blue" />}
      meta={
        <Chip tone="neutral">
          {report.facts?.totalRoutes ?? routes.length} routes
        </Chip>
      }
    >
      <div className="grid gap-4">
        <DataTable
          columns={[
            { label: 'Route' },
            { label: 'Handler' },
            { label: 'Defined at' },
            { label: 'Flagged' },
          ]}
        >
          {routes.slice(0, 40).map((r) => {
            const hit = flagged.get(normalizeRoute(r.url));
            return (
              <tr key={`${r.url}-${r.file}-${r.line}`}>
                <Td>
                  <CodeChip>{r.url}</CodeChip>
                </Td>
                <Td>
                  <span className="font-mono text-xs">{r.handler}</span>
                </Td>
                <Td>
                  <Location value={`${r.file}:${r.line}`} />
                </Td>
                <Td>
                  {hit ? (
                    <span className="flex flex-col gap-1">
                      <SeverityBadge severity={hit.risk} />
                      <span className="text-xs text-muted">{hit.reason}</span>
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>
              </tr>
            );
          })}
        </DataTable>

        {dropped > 0 && (
          <p className="m-0 text-xs leading-relaxed text-muted">
            {dropped} endpoint{dropped === 1 ? '' : 's'} the security agent
            flagged {dropped === 1 ? 'does' : 'do'} not appear in the route graph
            and {dropped === 1 ? 'was' : 'were'} dropped. The graph is the
            authority on what exists.
          </p>
        )}
      </div>
    </ReportCard>
  );
}

/* ── Findings register ───────────────────────────────────────────────────── */

export function FindingsRegisterSection({
  outputs,
  index,
}: {
  outputs: AgentOutputs;
  index?: number;
}) {
  const { findings, unanchored } = buildFindings(outputs);

  return (
    <ReportCard
      id={SECTION_IDS_MEASURED.findings}
      index={index}
      title="Findings register"
      icon={<ClipboardList size={17} className="text-glow-amber" />}
      meta={<Chip tone="neutral">{findings.length} located</Chip>}
    >
      <div className="grid gap-4">
        {findings.length === 0 ? (
          <EmptyState>
            No findings were reported with a location that could be verified.
          </EmptyState>
        ) : (
          <DataTable
            columns={[
              { label: 'ID' },
              { label: 'Severity' },
              { label: 'Area' },
              { label: 'Finding' },
              { label: 'Location' },
            ]}
          >
            {findings.map((f) => (
              <tr key={f.id}>
                <Td>
                  <span className="font-mono text-xs font-semibold text-fg">
                    {f.id}
                  </span>
                </Td>
                <Td>
                  <SeverityBadge severity={f.severity} />
                </Td>
                <Td>{f.area}</Td>
                <Td className="text-fg">
                  <span className="block capitalize">{f.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {f.detail}
                  </span>
                </Td>
                <Td>
                  <Location value={f.location} />
                </Td>
              </tr>
            ))}
          </DataTable>
        )}

        {unanchored > 0 && (
          <p className="m-0 text-xs leading-relaxed text-muted">
            {unanchored} reported item{unanchored === 1 ? '' : 's'} had no file
            or symbol attached and {unanchored === 1 ? 'was' : 'were'} dropped. A
            claim that can&rsquo;t be pointed at is a claim this report
            can&rsquo;t make.
          </p>
        )}
      </div>
    </ReportCard>
  );
}

/* ── Run record ──────────────────────────────────────────────────────────── */

export function RunRecordSection({
  report,
  agentRuns,
  index,
}: {
  report: ReportPayload;
  agentRuns: {
    agentType: string;
    status: string;
    totalTokens: number;
    durationMs: number | null;
  }[];
  index?: number;
}) {
  if (agentRuns.length === 0) return null;

  return (
    <ReportCard
      id={SECTION_IDS_MEASURED.runRecord}
      index={index}
      title="Run record"
      icon={<Activity size={17} className="text-glow-purple" />}
      meta={
        report.estimatedCostLabel ? (
          <Chip tone="neutral">{report.estimatedCostLabel}</Chip>
        ) : undefined
      }
    >
      <div className="grid gap-4">
        <DataTable
          minWidth="min-w-100"
          columns={[
            { label: 'Agent' },
            { label: 'Status' },
            { label: 'Tokens', align: 'right' },
            { label: 'Duration', align: 'right' },
          ]}
        >
          {agentRuns.map((r) => (
            <tr key={r.agentType}>
              <Td className="text-fg">{r.agentType}</Td>
              <Td>
                <Chip tone={r.status === 'success' ? 'green' : 'red'}>
                  {r.status}
                </Chip>
              </Td>
              <Td num>{r.totalTokens.toLocaleString()}</Td>
              <Td num>
                {r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : '—'}
              </Td>
            </tr>
          ))}
          <tr>
            <Td className="font-medium text-fg">total</Td>
            <Td>—</Td>
            <Td num>{report.totalTokens.toLocaleString()}</Td>
            <Td num>—</Td>
          </tr>
        </DataTable>

        <p className="m-0 text-xs leading-relaxed text-muted">
          Per-agent usage is recorded in <code>agent_results</code>
          {report.model ? (
            <>
              {' '}
              and priced against <code>{report.model}</code>
            </>
          ) : null}
          . The cost is queryable, not asserted.
        </p>
      </div>
    </ReportCard>
  );
}

/** Anchors for the sections in this file. Merged into SECTION_IDS by the nav. */
export const SECTION_IDS_MEASURED = {
  measured: 'measured',
  systemFlow: 'system-flow',
  api: 'api-surface',
  findings: 'findings',
  runRecord: 'run-record',
} as const;
