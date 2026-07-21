import { Logo } from '../Logo';
import { Skeleton, SkeletonScreen } from '../ui/skeleton';

/** One placeholder card matching the real `.repo-card` silhouette (no CLS on swap). */
function RepoCardSkeleton() {
  return (
    <li className="repo-card" aria-hidden="true">
      <div className="repo-card-media">
        <Skeleton style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
      </div>
      <div className="repo-card-body">
        <Skeleton width={72} height={12} radius={6} />
        <Skeleton width={150} height={20} radius={6} style={{ marginTop: 8 }} />
        <Skeleton height={10} radius={6} style={{ marginTop: 14 }} />
        <Skeleton width="70%" height={10} radius={6} style={{ marginTop: 10 }} />
        <Skeleton height={40} radius={10} style={{ marginTop: 18 }} />
      </div>
    </li>
  );
}

/** Repo grid placeholder — drops straight into the repos loading state. */
export function RepoGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SkeletonScreen label="Loading repositories">
      <ul className="repo-list">
        {Array.from({ length: count }).map((_, i) => (
          <RepoCardSkeleton key={i} />
        ))}
      </ul>
    </SkeletonScreen>
  );
}

/**
 * Whole-dashboard placeholder shown while the session (`me`) resolves — mirrors
 * the real nav + header + grid so the page doesn't flash a bare "Loading…".
 */
export function DashboardSkeleton() {
  return (
    <div className="dash">
      <header className="dash-nav">
        <div className="dash-nav-inner">
          <Logo className="h-8" />
          <Skeleton width={150} height={40} radius={999} />
        </div>
      </header>

      <SkeletonScreen label="Loading dashboard">
        <main className="dash-main">
          <div className="dash-head">
            <Skeleton width={280} height={34} radius={8} />
            <Skeleton
              width={230}
              height={16}
              radius={6}
              style={{ marginTop: 10 }}
            />
          </div>

          <div className="dash-stats">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={82} radius={16} />
            ))}
          </div>

          {/* Slim paste bar, then the full-width repo grid — matches the real
              linked layout so nothing shifts when data lands. */}
          <Skeleton
            height={72}
            radius={18}
            style={{ marginBottom: '2rem' }}
          />

          <div className="dash-repos-panel">
            <ul className="repo-list">
              {Array.from({ length: 8 }).map((_, i) => (
                <RepoCardSkeleton key={i} />
              ))}
            </ul>
          </div>
        </main>
      </SkeletonScreen>
    </div>
  );
}
