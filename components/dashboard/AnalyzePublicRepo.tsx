'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { GitBranch, ArrowRight, Loader2 } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { useAnalyzeRepoMutation } from '../../lib/queries';
import { parseGithubRepo } from '../../lib/github-url';

/**
 * Paste-any-public-repo entry point. Works with no linked GitHub — the backend
 * downloads public repos unauthenticated. Parses a pasted URL (or `owner/repo`
 * shorthand) into the `owner/repo` the analyze endpoint expects, then navigates
 * to the new job. Always shown on the dashboard, beside the repo list.
 */
export function AnalyzePublicRepo() {
  const router = useRouter();
  const analyze = useAnalyzeRepoMutation();
  // Keep the button loading through the route change, not just the POST — the
  // mutation resolves in ~1s but navigation to the job page lands a beat later,
  // and without this the spinner drops in that gap and looks stuck/broken.
  const [isNavigating, startTransition] = useTransition();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const busy = analyze.isPending || isNavigating;

  function submit(e: FormEvent) {
    e.preventDefault();
    const fullName = parseGithubRepo(value);
    if (!fullName) {
      setError('Enter a GitHub repo URL, e.g. https://github.com/owner/repo');
      return;
    }
    setError(null);
    analyze.mutate(fullName, {
      onSuccess: ({ jobId }) =>
        startTransition(() => router.push(`/jobs/${jobId}`)),
      onError: (err) =>
        setError(
          err instanceof ApiError ? err.message : 'Could not start analysis.',
        ),
    });
  }

  return (
    <section className="analyze-panel" aria-labelledby="analyze-title">
      <div className="analyze-head">
        <span className="analyze-icon" aria-hidden="true">
          <GitBranch size={20} />
        </span>
        <h2 id="analyze-title" className="analyze-title">
          Analyze any public repo
        </h2>
      </div>
      <p className="analyze-text">
        Paste a public GitHub repository URL — no account connection needed.
      </p>

      <form className="analyze-form" onSubmit={submit}>
        <input
          className="analyze-input"
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="https://github.com/owner/repo"
          aria-label="Public GitHub repository URL"
          aria-invalid={!!error}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
        />
        <button
          type="submit"
          className="btn analyze-btn"
          disabled={busy || value.trim() === ''}
          aria-busy={busy}
        >
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Starting…
            </>
          ) : (
            <>
              Analyze <ArrowRight size={16} aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      {error ? (
        <p className="analyze-error" role="alert">
          {error}
        </p>
      ) : (
        <p className="analyze-hint">Try https://github.com/vercel/next.js</p>
      )}
    </section>
  );
}
