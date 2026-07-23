export interface Me {
  id: string;
  /** False for a user who signed in with Google and hasn't linked GitHub yet —
   *  gates the repo/analyze flow behind the Connect GitHub card. */
  githubConnected: boolean;
  email: string | null;
  name: string | null;
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

export type JobStatus =
  | 'pending'
  | 'running'
  | 'done'
  | 'failed'
  // User aborted a pending/running job. Terminal; never has a report.
  | 'cancelled';

export type AgentResultStatus = 'success' | 'failed';

export type AgentType =
  | 'architecture'
  | 'security'
  | 'dependency'
  | 'quality'
  | 'docs';

/**
 * Token accounting for one agent run (mirrors libs/common/src/types/token-usage.types.ts).
 *
 * Four classes, not two. `input` is only the **uncached remainder** — with
 * prompt caching on, most of an agent loop's input arrives as `cacheRead`. So
 * `input + output` under-reports real spend, and gets more wrong the better
 * caching works. Read `totalTokens`; don't do the arithmetic here.
 */
export interface TokenUsage {
  input: number;
  output: number;
  cacheCreation?: number;
  cacheRead?: number;
}

export interface AgentResultSummary {
  agentType: string;
  status: AgentResultStatus;
  error: string | null;
  /** The agent's JSON output, or null when the run failed. */
  rawOutput: unknown;
  tokensUsed: TokenUsage;
  /** Total tokens processed by this agent — the number to display. */
  totalTokens: number;
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

/* ── Measured ground truth ────────────────────────────────────────────────── */

/**
 * The AST facts the report was built on. Mirrors `RepoFacts` in `@app/common`.
 *
 * Everything here came from parsing the repository, so none of it can be wrong
 * the way a model can be wrong. The dashboard prefers it over the equivalent
 * agent output wherever both exist — before this arrived, the web view rendered
 * the agents' *guessed* complexity hotspots while the Markdown export rendered
 * the measured ones, which made the richer surface the less trustworthy one.
 *
 * Every array is optional-safe at the call site: a report written by an older
 * synthesizer has some of these absent.
 */
export interface RepoFacts {
  runKey: string;
  stats: {
    files: number;
    nodes: number;
    edges: number;
    linesOfCode: number;
    sizeBytes: number;
  };
  languages: { language: string; files: number }[];
  dominantLanguage: string | null;
  frameworks: string[];
  routes: {
    url: string;
    handler: string;
    file: string;
    line: number;
    kind: string;
  }[];
  totalRoutes: number;
  modules: {
    name: string;
    files: number;
    linesOfCode: number;
    sampleFiles: string[];
    exports: string[];
  }[];
  moduleDependencies: { from: string; to: string; weight: number }[];
  complexityHotspots: {
    symbol: string;
    file: string;
    line: number;
    callers: number;
    callees: number;
    depth: number;
  }[];
  circularDependencies: string[][];
  deadCode: { symbol: string; file: string; line: number; kind: string }[];
  callChains: {
    name: string;
    entryFile: string;
    steps: { symbol: string; file: string; line: number }[];
  }[];
  externalImports: { module: string; package: string; count: number }[];
  dependencies: { name: string; version: string; scope: 'runtime' | 'dev' }[];
  entryPoints: {
    kind: 'script' | 'main' | 'bin' | 'route' | 'component';
    name: string;
    detail: string;
    file?: string;
    line?: number;
  }[];
  testFiles: number;
  docFiles: number;
  largestFiles: { path: string; linesOfCode: number }[];
  degraded: string[];
}

export interface ReportPayload {
  markdownContent: string;
  diagrams: RenderedDiagram[];
  /** Null on reports generated before synthesis was persisted structurally. */
  synthesis: Synthesis | null;
  totalTokens: number;
  /**
   * Cost, computed server-side by the same helper the Markdown report uses, so
   * the dashboard and the report can't disagree about the same job. The client
   * used to recompute this and drifted the moment the backend was corrected.
   *
   * Optional: reports written before the field existed won't carry it.
   */
  estimatedCostUsd?: number;
  /** Pre-formatted (`$0.576`). Prefer this over formatting the number yourself. */
  estimatedCostLabel?: string;
  /** The model `estimatedCostUsd` prices. */
  model?: string;
  /**
   * AST ground truth. Null for reports written before the column existed, and
   * for runs whose facts aged out of Redis before synthesis — so every consumer
   * must still render without it.
   */
  facts?: RepoFacts | null;
}

export interface Job {
  id: string;
  userId: string;
  repoFullName: string;
  status: JobStatus;
  createdAt: string;
  completedAt: string | null;
  /** Persisted failure reason for a `failed` job — survives reload. */
  error: string | null;
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
  /**
   * Heartbeat from inside one agent's evidence loop, once per turn.
   *
   * `job:progress` only fires when an agent *finishes*, and an agent is now a
   * tool loop that can work for minutes — so without this the UI correctly shows
   * five agents running and then sits unchanged long enough to look hung.
   *
   * `activity` is mechanical ("reading auth.guard.ts"), derived from the tool
   * calls — never model prose or reasoning.
   */
  | {
      type: 'job:agent_activity';
      jobId: string;
      agentType: string;
      /** 1-indexed. */
      turn: number;
      maxTurns: number;
      activity: string;
    }
  | { type: 'job:complete'; jobId: string }
  | { type: 'job:failed'; jobId: string; reason: string };
