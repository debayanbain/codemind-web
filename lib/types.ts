export interface Me {
  id: string;
  githubUsername: string | null;
  avatarUrl: string | null;
}

export interface LanguageStat {
  name: string;
  percent: number; // 0-100, one decimal
  color: string | null; // GitHub's canonical language color
  bytes: number;
}

export interface Repo {
  id: number;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
  language: string | null;
  languages: LanguageStat[];
  htmlUrl: string;
  lastJobId: string | null;
  lastJobStatus: JobStatus | null;
}

export type JobStatus = 'pending' | 'running' | 'done' | 'failed';

export type AgentResultStatus = 'success' | 'failed';

export type AgentType =
  | 'architecture'
  | 'security'
  | 'dependency'
  | 'quality'
  | 'docs';

export interface AgentResultSummary {
  agentType: string;
  status: AgentResultStatus;
  error: string | null;
  /** The agent's JSON output, or null when the run failed. */
  rawOutput: unknown;
  tokensUsed: { input: number; output: number };
  durationMs: number | null;
}

/* ── Agent output shapes (mirror libs/common/src/types/agent-outputs.types.ts).
   Every field is optional: the backend only JSON.parses the LLM's reply, it
   never schema-checks it, so any key can legitimately be missing. ────────── */

export interface ModuleDependency {
  from: string;
  to: string;
  label?: string;
}

export interface RequestFlow {
  name: string;
  steps: string[];
  description?: string;
}

export interface ModuleResponsibility {
  module: string;
  responsibility: string;
}

export interface ArchitectureOutput {
  framework?: string;
  language?: string;
  architecture_pattern?: string;
  entry_points?: string[];
  modules?: string[];
  module_dependencies?: ModuleDependency[];
  module_responsibilities?: ModuleResponsibility[];
  services?: string[];
  request_flows?: RequestFlow[];
  design_patterns?: string[];
  summary?: string;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface SensitiveEndpoint {
  path: string;
  method: string;
  risk: 'high' | 'medium' | 'low';
  reason: string;
}

export interface Vulnerability {
  type: string;
  location: string;
  severity: Severity;
  description: string;
}

export interface SecurityOutput {
  auth_mechanism?: string | null;
  auth_flow_steps?: string[];
  sensitive_endpoints?: SensitiveEndpoint[];
  vulnerabilities?: Vulnerability[];
  missing_protections?: string[];
  secrets_exposure_risk?: boolean;
  summary?: string;
}

export interface OutdatedRisk {
  package: string;
  reason: string;
}

export interface DependencyOutput {
  runtime_dependencies?: string[];
  dev_dependencies?: string[];
  critical_deps?: string[];
  outdated_risks?: OutdatedRisk[];
  license_concerns?: string[];
  version_conflicts?: string[];
  summary?: string;
}

export type QualityCategory =
  | 'error_handling'
  | 'type_safety'
  | 'duplication'
  | 'complexity'
  | 'tests';

export interface QualityIssue {
  category: QualityCategory;
  location: string;
  description: string;
}

export type QualityScore = 'good' | 'partial' | 'poor';

export interface QualityOutput {
  error_handling_score?: QualityScore;
  type_safety_score?: QualityScore;
  test_coverage_signal?: 'present' | 'minimal' | 'absent';
  issues?: QualityIssue[];
  positive_patterns?: string[];
  complexity_hotspots?: string[];
  summary?: string;
}

export interface DocsOutput {
  readme_quality?: 'excellent' | 'good' | 'minimal' | 'missing';
  api_documented?: boolean;
  public_exports?: string[];
  undocumented_public_apis?: string[];
  has_contribution_guide?: boolean;
  has_changelog?: boolean;
  inline_comment_density?: 'high' | 'medium' | 'low';
  doc_score?: number;
  summary?: string;
}

export interface AgentOutputs {
  architecture?: ArchitectureOutput;
  security?: SecurityOutput;
  dependency?: DependencyOutput;
  quality?: QualityOutput;
  docs?: DocsOutput;
}

export interface Synthesis {
  executiveSummary: string;
  recommendations: string[];
  overallHealthScore: number;
}

/**
 * A diagram the synthesizer already rendered to SVG. The browser embeds the
 * string — no diagram library runs client-side.
 */
export interface RenderedDiagram {
  slug: string;
  title: string;
  kind: 'd2' | 'chart';
  source: string;
  svg: string;
  degraded?: boolean;
}

export interface ReportPayload {
  markdownContent: string;
  diagrams: RenderedDiagram[];
  /** Null on reports generated before synthesis was persisted structurally. */
  synthesis: Synthesis | null;
  totalTokens: number;
}

export interface Job {
  id: string;
  userId: string;
  repoFullName: string;
  status: JobStatus;
  createdAt: string;
  completedAt: string | null;
  report: ReportPayload | null;
  agentResults: AgentResultSummary[];
}

/** What a share-link viewer gets: the report, and who shared it. Nothing else. */
export interface SharedReport {
  repoFullName: string;
  status: JobStatus;
  createdAt: string;
  completedAt: string | null;
  sharedBy: { githubUsername: string | null; avatarUrl: string | null };
  report: ReportPayload;
  agentResults: AgentResultSummary[];
}

export interface ShareLink {
  token: string;
  createdAt: string;
}

export type JobEvent =
  | { type: 'job:status'; jobId: string; status: string }
  | {
      type: 'job:progress';
      jobId: string;
      agentType: string;
      done: number;
      total: number;
    }
  | { type: 'job:complete'; jobId: string }
  | { type: 'job:failed'; jobId: string; reason: string };
