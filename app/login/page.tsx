'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSignIn, useAuth } from '@clerk/nextjs';
import { BackgroundBeams } from '../../components/ui/background-beams';
import { HoverBorderGradient } from '../../components/ui/hover-border-gradient';
import { SparklesCore } from '@/components/ui/sparkles';
import { Logo } from '@/components/Logo';
import { GithubMark, GoogleMark } from '@/components/BrandMarks';

/**
 * Only same-origin paths survive, so `?next=` can't be turned into an open
 * redirect. It feeds Clerk's post-auth `redirectUrlComplete` so a shared-report
 * visitor lands back on the report they were sent.
 */
function safeNext(value: string | null): string | undefined {
  if (!value?.startsWith('/')) return undefined;
  if (value.startsWith('//') || value.startsWith('/\\')) return undefined;
  return value;
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary or the route opts out of static
  // prerendering.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

type Provider = 'github' | 'google';

function LoginForm() {
  const next = safeNext(useSearchParams().get('next'));
  const isSharedReport = next?.startsWith('/share/') ?? false;

  const router = useRouter();
  const { signIn, isLoaded } = useSignIn();
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Already-authenticated visitors must not see the sign-in buttons: calling
  // `authenticateWithRedirect` with a live session returns 400 `session_exists`
  // and surfaces as a misleading "Could not start sign-in". Bounce them to the
  // app (or their `?next=` target) instead.
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  useEffect(() => {
    if (authLoaded && isSignedIn) router.replace(next ?? '/');
  }, [authLoaded, isSignedIn, next, router]);

  async function oauth(provider: Provider) {
    if (!isLoaded || !signIn) return;
    setPending(provider);
    setError(null);
    try {
      await signIn.authenticateWithRedirect({
        strategy: provider === 'github' ? 'oauth_github' : 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: next ?? '/',
      });
      // Navigates away on success; nothing runs after this.
    } catch {
      setError('Could not start sign-in. Please try again.');
      setPending(null);
    }
  }

  // Redirecting a signed-in user — don't flash the sign-in UI.
  if (authLoaded && isSignedIn) return null;

  const busy = !isLoaded || pending !== null;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-6 py-16 antialiased">
      <BackgroundBeams />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="mb-8 flex items-center justify-center">
          <Logo className="h-14" />
        </div>

        <h1 className="mb-3 text-3xl font-bold tracking-tight text-fg">
          Sign in to CodeMind
        </h1>

        <p className="mx-auto mb-6 max-w-sm text-sm leading-relaxed text-muted">
          {isSharedReport
            ? 'A report was shared with you. Sign in to open it — you’ll get a read-only view.'
            : 'Continue with GitHub or Google to analyze your repositories.'}
        </p>

        {/* GitHub — the recommended path (repos are ready immediately). */}
        <div className="flex justify-center items-center gap-3">
          <div className="flex justify-center items-center gap-2 w-full">
            <HoverBorderGradient
              as="button"
              containerClassName="w-full rounded-xl"
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#0d0d10] px-3 text-sm font-medium text-fg"
              {...{
                type: 'button',
                onClick: () => oauth('github'),
                disabled: busy,
              }}
            >
              <span className="flex shrink-0 items-center text-fg">
                <GithubMark size={18} />
              </span>
              <span className="whitespace-nowrap">
                {pending === 'github' ? 'Redirecting…' : 'Continue with GitHub'}
              </span>
            </HoverBorderGradient>
            {/* <p className="mt-2 text-center text-[0.8rem] text-glow-blue">
              Recommended — instant repo access
            </p> */}
          </div>

          <div className="flex justify-center items-center gap-3 w-full">
            <HoverBorderGradient
              as="button"
              containerClassName="w-full rounded-xl"
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#0d0d10] px-3 text-sm font-medium text-fg"
              {...{
                type: 'button',
                onClick: () => oauth('google'),
                disabled: busy,
              }}
            >
              <span className="flex shrink-0 items-center">
                <GoogleMark size={18} />
              </span>
              <span className="whitespace-nowrap">
                {pending === 'google' ? 'Redirecting…' : 'Continue with Google'}
              </span>
            </HoverBorderGradient>
            {/* <p className="mt-2 text-center text-[0.8rem] text-muted">
              You’ll connect GitHub from the dashboard to analyze repos.
            </p> */}
          </div>
        </div>

        {/* Clerk mounts its Smart CAPTCHA challenge here if bot protection fires
            (this is a custom flow). Without the element Clerk falls back to the
            Invisible CAPTCHA and logs a warning. OAuth-only sign-in rarely
            triggers it, but the mount point silences the warning. */}
        <div id="clerk-captcha" className="mt-4 flex justify-center" />

        {error && (
          <p className="connect-card-error mt-4 text-center" role="alert">
            {error}
          </p>
        )}

        {/* glowing sparkles divider band */}
        <div className="relative mt-9 h-16 w-full">
          <div className="absolute inset-x-[16%] top-0 mx-auto h-px w-[68%] bg-gradient-to-r from-transparent via-glow-blue to-transparent" />
          <div className="absolute inset-x-[16%] top-0 mx-auto h-[3px] w-[68%] bg-gradient-to-r from-transparent via-glow-blue to-transparent blur-sm" />
          <div className="absolute inset-x-[34%] top-0 mx-auto h-px w-[32%] bg-gradient-to-r from-transparent via-glow-purple to-transparent" />
          <div className="absolute inset-x-[34%] top-0 mx-auto h-1 w-[32%] bg-linear-to-r from-transparent via-glow-purple to-transparent blur-sm" />
          <SparklesCore
            background="transparent"
            minSize={0.4}
            maxSize={1}
            particleDensity={800}
            className="h-full w-full mask-[radial-gradient(220px_90px_at_top,white_20%,transparent_75%)]"
            particleColor="#FFFFFF"
          />
        </div>

        <p className="mt-1 text-xs text-muted">
          By continuing you agree to our Terms & Privacy Policy.
        </p>
      </div>
    </main>
  );
}
