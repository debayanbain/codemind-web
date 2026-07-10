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

export interface AgentResultSummary {
  agentType: string;
  status: AgentResultStatus;
  error: string | null;
}

export interface Job {
  id: string;
  userId: string;
  repoFullName: string;
  status: JobStatus;
  createdAt: string;
  completedAt: string | null;
  report: { markdownContent: string } | null;
  agentResults: AgentResultSummary[];
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
