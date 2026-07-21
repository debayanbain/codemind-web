import type {
  AgentResultSummary,
  ArchitectureOutput,
  SecurityOutput,
  DependencyOutput,
  QualityOutput,
  DocsOutput,
  Synthesis,
} from './types';

/**
 * Chat suggestions derived from THIS report's actual findings — never a fixed
 * generic list. A suggestion is only offered when the data backing it exists:
 * no auth mechanism was detected → we don't suggest "how does auth work?",
 * because the honest answer would be "the analysis didn't find any". Each
 * question points at something the graph + report can actually answer.
 */
export function reportSuggestions(
  agentResults: AgentResultSummary[],
  synthesis: Synthesis | null,
): string[] {
  const out = (type: string): unknown => {
    const r = agentResults.find(
      (a) => a.agentType === type && a.status === 'success',
    );
    return r?.rawOutput ?? null;
  };

  const arch = out('architecture') as ArchitectureOutput | null;
  const sec = out('security') as SecurityOutput | null;
  const dep = out('dependency') as DependencyOutput | null;
  const qual = out('quality') as QualityOutput | null;
  const docs = out('docs') as DocsOutput | null;

  // Candidates in rough "most interesting first" order. Only truthy entries
  // survive, so anything the report didn't cover simply never appears.
  const candidates: (string | null | undefined)[] = [
    // Security — auth only if one was actually detected.
    sec?.auth_mechanism
      ? `How does the ${sec.auth_mechanism} authentication flow work?`
      : sec?.auth_flow_steps?.length
        ? 'Walk me through the authentication flow.'
        : null,
    firstVuln(sec),

    // Architecture — prefer a named request flow, then the pattern/framework.
    arch?.request_flows?.[0]?.name
      ? `Walk me through the "${arch.request_flows[0].name}" flow.`
      : null,
    arch?.architecture_pattern
      ? `Why is this a ${arch.architecture_pattern} architecture?`
      : arch?.framework
        ? `How is this ${arch.framework} app structured?`
        : null,

    // Quality — a real hotspot, else the coverage gap.
    qual?.complexity_hotspots?.[0]
      ? `Why is ${short(qual.complexity_hotspots[0])} a complexity hotspot?`
      : null,
    qual?.test_coverage_signal === 'absent' ||
    qual?.test_coverage_signal === 'minimal'
      ? 'What is the test-coverage situation and where are the gaps?'
      : null,

    // Dependencies — a named outdated package, else criticals.
    dep?.outdated_risks?.[0]?.package
      ? `Is it safe to upgrade ${dep.outdated_risks[0].package}?`
      : dep?.critical_deps?.length
        ? 'Which dependencies are most critical to this project?'
        : null,

    // Docs — the undocumented surface.
    docs?.undocumented_public_apis?.length
      ? 'Which public APIs are undocumented?'
      : null,
  ];

  const picked = dedupe(
    candidates.filter((s): s is string => typeof s === 'string' && s.length > 0),
  ).slice(0, 4);

  // Always leave at least a couple of safe, report-wide starters — these hold
  // for any analysis that produced a synthesis.
  if (picked.length < 2 && synthesis) {
    for (const s of [
      'Summarize the biggest risks in this codebase.',
      'What should I fix first?',
    ]) {
      if (picked.length >= 3) break;
      if (!picked.includes(s)) picked.push(s);
    }
  }

  return picked;
}

function firstVuln(sec: SecurityOutput | null): string | null {
  const v = sec?.vulnerabilities?.[0];
  if (!v) return null;
  return `What is the ${v.severity} ${v.type} issue${
    v.location ? ` in ${short(v.location)}` : ''
  }, and how do I fix it?`;
}

/** Keep a file/symbol reference short enough for a chip. */
function short(s: string): string {
  const trimmed = s.trim();
  return trimmed.length > 40 ? `${trimmed.slice(0, 39)}…` : trimmed;
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}
