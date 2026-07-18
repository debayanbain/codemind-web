'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { GitBranch } from 'lucide-react';
import { GithubMark } from '../BrandMarks';

/**
 * Shown on the dashboard to a user (typically a Google sign-in) with no linked
 * GitHub. It gates the repo/analyze flow — a *next step*, not an error, so it
 * uses the blue/purple glow, never the red error tone.
 *
 * "Connect" links GitHub to the current Clerk user with the `repo` scope, then
 * hands off to GitHub's consent screen. On return the page reloads, getMe reports
 * githubConnected=true, and the repo grid takes this card's place.
 */
export function ConnectGithubCard() {
  const { user } = useUser();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (!user) return;
    setConnecting(true);
    setError(null);
    // Ask for repo scope explicitly on the link flow so private repos +
    // tarballs work even if the connection default is narrower.
    const params = {
      additionalScopes: ['repo', 'read:user'],
      redirectUrl: `${window.location.origin}/`,
    };
    try {
      // A prior attempt cancelled at GitHub's consent leaves an *unverified*
      // github account. A second createExternalAccount would throw "already
      // exists", so reuse the existing link: reauthorize() re-issues the OAuth
      // redirect (and re-consents for the repo scope). If it can't reauthorize
      // a never-authorized pending link, drop it and create a clean one.
      const external = await (async () => {
        const existing = user.externalAccounts.find((a) =>
          a.provider.includes('github'),
        );
        if (!existing) {
          return user.createExternalAccount({
            strategy: 'oauth_github',
            ...params,
          });
        }
        try {
          return await existing.reauthorize(params);
        } catch {
          await existing.destroy();
          return user.createExternalAccount({
            strategy: 'oauth_github',
            ...params,
          });
        }
      })();

      const redirect = external.verification?.externalVerificationRedirectURL;
      if (redirect) {
        window.location.href = redirect.toString();
        return;
      }
      setError('Could not start the GitHub connection. Please try again.');
      setConnecting(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not connect GitHub.');
      setConnecting(false);
    }
  }

  return (
    <section className="connect-card" aria-labelledby="connect-github-title">
      <span className="connect-card-icon" aria-hidden="true">
        <GitBranch size={22} />
      </span>
      <div className="connect-card-body">
        <h2 id="connect-github-title" className="connect-card-title">
          Connect GitHub to analyze your repositories
        </h2>
        <p className="connect-card-text">
          CodeMind lists your repositories and downloads a tarball to analyze —
          read-only, nothing is ever pushed. Connect GitHub to see your repos
          here.
        </p>
        {error && (
          <p className="connect-card-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        className="btn connect-card-btn"
        onClick={connect}
        disabled={connecting || !user}
      >
        {connecting ? (
          'Opening GitHub…'
        ) : (
          <>
            <GithubMark size={16} />
            Connect GitHub
          </>
        )}
      </button>
    </section>
  );
}
