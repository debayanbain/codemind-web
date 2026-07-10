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
 * Haiku input pricing (~$0.80 / 1M tokens). The same approximation the report
 * renderer prints — kept identical so the dashboard and the Markdown agree.
 */
export function estimatedCost(totalTokens: number): string {
  return `$${((totalTokens / 1_000_000) * 0.8).toFixed(4)}`;
}

export function formatDuration(ms: number | null | undefined): string | null {
  if (!ms || ms <= 0) return null;
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}
