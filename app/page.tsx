'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FolderGit2, CheckCircle2, Loader2 } from 'lucide-react';
import { ApiError } from '../lib/api';
import {
  useAnalyzeRepoMutation,
  useLogoutMutation,
  useMeQuery,
  useReposQuery,
} from '../lib/queries';
import { DashboardNav } from '../components/dashboard/DashboardNav';
import { RepoBackground } from '../components/dashboard/RepoBackground';
import { RepoLanguages } from '../components/dashboard/RepoLanguages';
import { Nav } from '../components/landing/Nav';
import { Hero } from '../components/landing/Hero';
import { AgentsGrid } from '../components/landing/AgentsGrid';
import { FeatureSplit } from '../components/landing/FeatureSplit';
import { ReportPreview } from '../components/landing/ReportPreview';
import {
  ExportVisual,
  LiveProgressVisual,
  SecurityVisual,
} from '../components/landing/FeatureVisuals';
import { HowItWorks } from '../components/landing/HowItWorks';
import { FinalCta } from '../components/landing/FinalCta';
import { Footer } from '../components/landing/Footer';

export default function HomePage() {
  const router = useRouter();
  const { data: me, isLoading: meLoading } = useMeQuery();
  const { data: repos, isLoading: reposLoading } = useReposQuery(!!me);
  const analyzeMutation = useAnalyzeRepoMutation();
  const logoutMutation = useLogoutMutation();
  const [query, setQuery] = useState('');

  const stats = useMemo(() => {
    const list = repos ?? [];
    return {
      total: list.length,
      analyzed: list.filter((r) => r.lastJobStatus === 'done').length,
      running: list.filter(
        (r) => r.lastJobStatus === 'pending' || r.lastJobStatus === 'running',
      ).length,
    };
  }, [repos]);

  const filteredRepos = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos ?? [];
    return (repos ?? []).filter((r) => r.fullName.toLowerCase().includes(q));
  }, [repos, query]);

  function handleAnalyze(repoFullName: string) {
    analyzeMutation.mutate(repoFullName, {
      onSuccess: ({ jobId }) => router.push(`/jobs/${jobId}`),
    });
  }

  function handleViewJob(jobId: string) {
    router.push(`/jobs/${jobId}`);
  }

  if (meLoading) return <p className="page">Loading…</p>;

  if (!me) {
    return (
      <>
        <Nav loginUrl="/login" />
        <Hero loginUrl="/login" />
        <AgentsGrid />
        <FeatureSplit
          id="reports"
          eyebrow="One combined report"
          title="Every finding, one document — diagrams included."
          description="No juggling five tool outputs. CodeMind merges every agent's findings into a single markdown report with architecture diagrams, ranked findings, and code references."
          bullets={[
            'Mermaid diagrams generated from the real dependency graph',
            'Findings ranked by severity, linked to file and line',
            'Exportable as markdown for PRs, wikis, or Slack',
          ]}
          visual={<ReportPreview />}
        />
        <FeatureSplit
          eyebrow="Real-time"
          title="Watch each agent work, live."
          description="Jobs stream progress over a socket as each agent finishes — no refreshing, no polling the wrong tab."
          bullets={[
            'Per-agent status as it happens',
            'Failures surface immediately with a reason',
          ]}
          visual={<LiveProgressVisual />}
          accent="teal"
          reverse
        />
        <FeatureSplit
          eyebrow="Portable"
          title="Take the report with you."
          description="Every analysis exports to clean markdown — diagrams and all — so it can live in a PR, a wiki page, or a Slack thread."
          bullets={['One-click markdown export', 'Diagrams included as Mermaid source']}
          visual={<ExportVisual />}
        />
        <FeatureSplit
          eyebrow="Access"
          title="You control what CodeMind can see."
          description="CodeMind connects through GitHub OAuth. You choose which repositories to grant access to, and can revoke it at any time from GitHub."
          bullets={['Standard GitHub OAuth, nothing custom', 'Per-repo access, revocable anytime']}
          visual={<SecurityVisual />}
          accent="red-purple"
          reverse
        />
        <HowItWorks />
        <FinalCta loginUrl="/login" />
        <Footer />
      </>
    );
  }

  const username = me.githubUsername ?? 'there';

  return (
    <div className="dash">
      <DashboardNav
        me={me}
        loggingOut={logoutMutation.isPending}
        onLogout={() => logoutMutation.mutate()}
      />

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1 className="dash-title">Welcome back, {username}</h1>
            <p className="dash-subtitle">
              Pick a repository to run a multi-agent analysis.
            </p>
          </div>
        </div>

        <div className="dash-stats">
          <StatCard
            icon={<FolderGit2 size={18} aria-hidden="true" />}
            label="Repositories"
            value={stats.total}
            tone="blue"
          />
          <StatCard
            icon={<CheckCircle2 size={18} aria-hidden="true" />}
            label="Analyzed"
            value={stats.analyzed}
            tone="green"
          />
          <StatCard
            icon={<Loader2 size={18} aria-hidden="true" />}
            label="In progress"
            value={stats.running}
            tone="amber"
          />
        </div>

        {analyzeMutation.isError && (
          <div className="error-box">
            {analyzeMutation.error instanceof ApiError
              ? analyzeMutation.error.message
              : 'Failed to start analysis'}
          </div>
        )}

        <div className="dash-list-head">
          <h2 className="dash-section-title">Your repositories</h2>
          <div className="dash-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="text"
              placeholder="Search repositories…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search repositories"
            />
          </div>
        </div>

        {reposLoading ? (
          <p className="dash-empty">Loading repositories…</p>
        ) : filteredRepos.length === 0 ? (
          <p className="dash-empty">
            {query ? 'No repositories match your search.' : 'No repositories found.'}
          </p>
        ) : (
          <ul className="repo-list">
            {filteredRepos.map((repo) => {
              const [owner, name] = repo.fullName.split('/');
              return (
                <li className="repo-card" key={repo.id}>
                  <div className="repo-card-media">
                    <RepoBackground
                      className="repo-card-art"
                      repoKey={repo.fullName}
                    />
                    <div className="repo-card-overlay">
                      <div className="repo-card-badges">
                        <span className="repo-card-visibility">
                          {repo.private ? 'Private' : 'Public'}
                        </span>
                        <RepoStatusBadge status={repo.lastJobStatus} />
                      </div>
                    </div>
                  </div>

                  <div className="repo-card-body">
                    <div className="repo-card-owner">{owner}</div>
                    <div className="repo-card-title">{name}</div>
                    <RepoLanguages languages={repo.languages} />
                    <div className="repo-card-meta">
                      Updated{' '}
                      {new Date(repo.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      · {repo.defaultBranch}
                    </div>

                    <div className="repo-card-actions">
                      {repo.lastJobStatus === 'done' && repo.lastJobId ? (
                        <>
                          <button
                            className="btn"
                            onClick={() => handleViewJob(repo.lastJobId!)}
                          >
                            View Report
                          </button>
                          <button
                            className="btn btn-secondary"
                            disabled={analyzeMutation.isPending}
                            onClick={() => handleAnalyze(repo.fullName)}
                          >
                            {analyzeMutation.isPending &&
                            analyzeMutation.variables === repo.fullName
                              ? 'Starting…'
                              : 'Re-analyze'}
                          </button>
                        </>
                      ) : repo.lastJobStatus === 'pending' ||
                        repo.lastJobStatus === 'running' ? (
                        <button
                          className="btn"
                          onClick={() => handleViewJob(repo.lastJobId!)}
                        >
                          View Progress
                        </button>
                      ) : (
                        <button
                          className="btn"
                          disabled={analyzeMutation.isPending}
                          onClick={() => handleAnalyze(repo.fullName)}
                        >
                          {analyzeMutation.isPending &&
                          analyzeMutation.variables === repo.fullName
                            ? 'Starting…'
                            : 'Analyze'}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'blue' | 'green' | 'amber';
}) {
  return (
    <div className="stat-card">
      <span className={`stat-icon stat-icon-${tone}`}>{icon}</span>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function RepoStatusBadge({
  status,
}: {
  status: import('../lib/types').JobStatus | null;
}) {
  if (!status) return null;
  const label =
    status === 'done'
      ? 'Analyzed'
      : status === 'running' || status === 'pending'
        ? 'Running'
        : 'Failed';
  return <span className={`badge badge-${status}`}>{label}</span>;
}
