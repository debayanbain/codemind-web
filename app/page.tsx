'use client';

import { useMemo, useState, useTransition } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Search, FolderGit2, CheckCircle2, Loader2 } from 'lucide-react';
import { ApiError } from '../lib/api';
import { CanvasText } from '../components/ui/canvas-text';
import {
  useAnalyzeRepoMutation,
  useMeQuery,
  useReposQuery,
} from '../lib/queries';
import { DashboardNav } from '../components/dashboard/DashboardNav';
import { ConnectGithubCard } from '../components/dashboard/ConnectGithubCard';
import { AnalyzePublicRepo } from '../components/dashboard/AnalyzePublicRepo';
import {
  DashboardSkeleton,
  RepoGridSkeleton,
} from '../components/dashboard/DashboardSkeleton';
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
  // Clerk hydration gates the me-query (see useMeQuery). Treat "not loaded yet"
  // as loading so a signed-in user never flashes the landing page mid-hydrate.
  const { isLoaded: authLoaded } = useAuth();
  const { data: me, isLoading: meLoading } = useMeQuery();
  // Only fetch repos once GitHub is linked — otherwise the API answers 409 and
  // we'd show an error instead of the Connect GitHub card.
  const {
    data: repos,
    isLoading: reposLoading,
    error: reposError,
  } = useReposQuery(!!me && me.githubConnected);
  const analyzeMutation = useAnalyzeRepoMutation();
  const [query, setQuery] = useState('');
  const reduceMotion = useReducedMotion();
  // Keep a repo's Analyze button loading through the route change to the job
  // page, not just the POST — otherwise the spinner drops for the ~beat between
  // the job being created and the navigation committing, and looks stuck.
  const [isNavigating, startTransition] = useTransition();
  const [navFor, setNavFor] = useState<string | null>(null);
  const startingRepo = (fullName: string) =>
    (analyzeMutation.isPending && analyzeMutation.variables === fullName) ||
    (isNavigating && navFor === fullName);
  const analyzeBusy = analyzeMutation.isPending || isNavigating;

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
      onSuccess: ({ jobId }) => {
        setNavFor(repoFullName);
        startTransition(() => router.push(`/jobs/${jobId}`));
      },
    });
  }

  function handleViewJob(jobId: string) {
    router.push(`/jobs/${jobId}`);
  }

  if (!authLoaded || meLoading) return <DashboardSkeleton />;

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

  const username = me.name ?? me.githubUsername ?? 'there';
  // Not linked, OR a token revoked/expired after connect (repos 409s
  // github_not_connected) — either way the right column shows the Connect card.
  const needsConnect =
    !me.githubConnected ||
    (reposError instanceof ApiError &&
      reposError.code === 'github_not_connected');

  return (
    <div className="dash">
      <DashboardNav me={me} />

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1 className="dash-title">
              Welcome back,{' '}
              {reduceMotion ? (
                username
              ) : (
                // Animated brand-gradient shimmer masked into the username.
                // Base fill is glow-blue; blue→purple→white curves sweep over
                // it — the same blue/purple as the logo mark and glass panels.
                <CanvasText
                  text={username}
                  backgroundClassName="bg-[#5b8def]"
                  colors={[
                    'rgba(255, 255, 255, 0.95)',
                    'rgba(199, 210, 254, 0.9)',
                    'rgba(167, 139, 250, 0.9)',
                    'rgba(255, 255, 255, 0.75)',
                    'rgba(139, 92, 246, 0.75)',
                    'rgba(199, 210, 254, 0.6)',
                    'rgba(255, 255, 255, 0.5)',
                    'rgba(167, 139, 250, 0.45)',
                  ]}
                  lineWidth={2}
                  lineGap={3}
                  curveIntensity={60}
                  animationDuration={16}
                />
              )}
            </h1>
            <p className="dash-subtitle">
              Pick a repository to run a multi-agent analysis.
            </p>
          </div>
        </div>

        {/* Stats reflect the user's own GitHub repos — only when connected. */}
        {!needsConnect && (
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
        )}

        {needsConnect ? (
          /* Not linked — paste panel on top, Connect card below it. */
          <div className="dash-stack">
            <AnalyzePublicRepo />
            <ConnectGithubCard />
          </div>
        ) : (
          /* Linked — paste panel beside the repo list. */
          <div className="dash-grid">
            <AnalyzePublicRepo />
            <section className="dash-repos-panel">
              <>
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
          <RepoGridSkeleton />
        ) : filteredRepos.length === 0 ? (
          <p className="dash-empty">
            {query ? 'No repositories match your search.' : 'No repositories found.'}
          </p>
        ) : (
          <ul className="repo-list">
            {filteredRepos.map((repo) => {
              const [owner, name] = repo.fullName.split('/');
              return (
                <li
                  className="repo-card"
                  key={repo.id}
                  onPointerMove={trackPointer}
                >
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
                            disabled={analyzeBusy}
                            aria-busy={startingRepo(repo.fullName)}
                            onClick={() => handleAnalyze(repo.fullName)}
                          >
                            {startingRepo(repo.fullName)
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
                          disabled={analyzeBusy}
                          aria-busy={startingRepo(repo.fullName)}
                          onClick={() => handleAnalyze(repo.fullName)}
                        >
                          {startingRepo(repo.fullName) ? 'Starting…' : 'Analyze'}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
              </>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

/** Feeds the cursor position into CSS custom props so `.repo-card::before`
 *  can track it. Written straight onto the node — no state, no re-render. */
function trackPointer(e: React.PointerEvent<HTMLLIElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
  el.style.setProperty('--my', `${e.clientY - rect.top}px`);
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
        : status === 'cancelled'
          ? 'Cancelled'
          : 'Failed';
  return <span className={`badge badge-${status}`}>{label}</span>;
}
