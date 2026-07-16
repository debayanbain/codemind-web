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
