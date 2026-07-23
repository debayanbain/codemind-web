import type {
  AgentOutputs,
  AgentResultSummary,
  QualityCategory,
  RenderedDiagram,
  ReportPayload,
  Severity,
} from './types';

/**
 * Collapses the agent result rows into one keyed object of typed outputs.
 * Failed agents carry `rawOutput: null` and are simply absent from the result —
 * every section renders defensively against its own key being missing.
 */
export function agentOutputs(results: AgentResultSummary[]): AgentOutputs {
  const out: Record<string, unknown> = {};
  for (const r of results) {
    if (r.status === 'success' && r.rawOutput) out[r.agentType] = r.rawOutput;
  }
  return out as AgentOutputs;
}

export function findDiagram(
  report: ReportPayload,
  slug: string,
): RenderedDiagram | undefined {
  return report.diagrams.find((d) => d.slug === slug);
}

export function matchingDiagrams(
  report: ReportPayload,
  pattern: RegExp,
): RenderedDiagram[] {
  return report.diagrams.filter((d) => pattern.test(d.slug));
}

/* ── Findings register ────────────────────────────────────────────────────── */

export interface Finding {
  id: string;
  severity: Severity;
  area: 'Security' | 'Quality' | 'Dependencies';
  title: string;
  location: string;
  detail: string;
}

/**
 * Collapse every agent's findings into one ranked register with stable ids.
 *
 * **The reference implementation is `ReportRenderer#buildFindings` in the
 * synthesizer** — this is deliberately the same algorithm so `SEC-01` on screen
 * is `SEC-01` in the exported Markdown and in whatever recommendation cites it.
 * Both read the same `agent_results` rows, so the ids agree as long as the two
 * functions do; change one and change the other.
 *
 * The drop rule is the load-bearing part: a finding with no location cannot be
 * checked, and an unverifiable row next to verifiable ones lowers the
 * credibility of both.
 */
export function buildFindings(outputs: AgentOutputs): {
  findings: Finding[];
  unanchored: number;
} {
  const findings: Finding[] = [];
  let unanchored = 0;

  const loc = (raw: string | undefined | null): string | null => {
    const trimmed = String(raw ?? '').trim();
    return trimmed && trimmed.toLowerCase() !== 'unknown' ? trimmed : null;
  };
  const nextId = (prefix: string): string =>
    `${prefix}-${String(
      findings.filter((f) => f.id.startsWith(prefix)).length + 1,
    ).padStart(2, '0')}`;

  for (const v of outputs.security?.vulnerabilities ?? []) {
    const location = loc(v.location);
    if (!location) {
      unanchored++;
      continue;
    }
    findings.push({
      id: nextId('SEC'),
      severity: v.severity,
      area: 'Security',
      title: v.type,
      location,
      detail: v.description,
    });
  }

  for (const issue of outputs.quality?.issues ?? []) {
    const location = loc(issue.location);
    if (!location) {
      unanchored++;
      continue;
    }
    findings.push({
      id: nextId('QUA'),
      // The quality agent grades nothing, so severity comes from what the
      // category costs: a swallowed error bites in production, a duplicated
      // helper bites a maintainer.
      severity:
        issue.category === 'error_handling' || issue.category === 'tests'
          ? 'medium'
          : 'low',
      area: 'Quality',
      title: issue.category.replace(/_/g, ' '),
      location,
      detail: issue.description,
    });
  }

  for (const risk of outputs.dependency?.outdated_risks ?? []) {
    const location = loc(risk.package);
    if (!location) {
      unanchored++;
      continue;
    }
    findings.push({
      id: nextId('DEP'),
      severity: 'medium',
      area: 'Dependencies',
      title: 'At-risk package',
      location,
      detail: risk.reason,
    });
  }

  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return { findings, unanchored };
}

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const QUALITY_CATEGORY_LABELS: Record<QualityCategory, string> = {
  error_handling: 'Error handling',
  type_safety: 'Type safety',
  duplication: 'Duplication',
  complexity: 'Complexity',
  tests: 'Tests',
};

export interface HealthBand {
  label: string;
  /** Token name, not a hex — the section components map it to a CSS variable. */
  tone: 'green' | 'amber' | 'red';
}

export function healthBand(score: number): HealthBand {
  if (score >= 80) return { label: 'Healthy', tone: 'green' };
  if (score >= 60) return { label: 'Needs attention', tone: 'amber' };
  return { label: 'At risk', tone: 'red' };
}

/**
 * What a job cost, as reported by the API.
 *
 * This used to recompute it: `(totalTokens / 1e6) * 0.8`, commented "kept
 * identical so the dashboard and the Markdown agree". It wasn't identical, and
 * it couldn't stay identical — the backend fixed its own copy and the two
 * instantly disagreed on screen for the same job. It was also wrong in three
 * ways at once: an input-only rate, for a model that wasn't running, applied to
 * input+output combined.
 *
 * The server computes it now (`libs/common/src/llm/pricing.ts`) and serves it on
 * the report payload, so there is nothing here to drift.
 *
 * The fallback is for reports rendered before the field existed — showing
 * nothing beats showing a number we know is wrong.
 */
export function estimatedCost(report: {
  estimatedCostLabel?: string | null;
}): string | null {
  return report.estimatedCostLabel ?? null;
}

export function formatDuration(ms: number | null | undefined): string | null {
  if (!ms || ms <= 0) return null;
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}
