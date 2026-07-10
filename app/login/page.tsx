'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { githubLoginUrl, googleLoginUrl } from '../../lib/api';
import { BackgroundBeams } from '../../components/ui/background-beams';
import { HoverBorderGradient } from '../../components/ui/hover-border-gradient';
import { SparklesCore } from '@/components/ui/sparkles';
import { Logo } from '@/components/Logo';

function GithubMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.81 1.1.81 2.22 0 1.61-.01 2.9-.01 3.29 0 .32.21.7.82.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

/**
 * Only same-origin paths survive, so `?next=` can never be turned into an open
 * redirect off our own login page. The API re-validates it independently before
 * redirecting after OAuth.
 */
function safeNext(value: string | null): string | undefined {
  if (!value?.startsWith('/')) return undefined;
  if (value.startsWith('//') || value.startsWith('/\\')) return undefined;
  return value;
}

export default function LoginPage() {
  return (
    // useSearchParams needs a Suspense boundary or the whole route opts out of
    // static prerendering.
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  // Set when a share link bounced an unauthenticated visitor here — they land
  // back on the report they were sent once OAuth completes.
  const next = safeNext(useSearchParams().get('next'));
  const isSharedReport = next?.startsWith('/share/') ?? false;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-6 py-16 antialiased">
      <BackgroundBeams />

      <div className="relative z-10 w-full max-w-lg text-center">
        {/* brand */}
        <div className="mb-8 flex items-center justify-center">
          <Logo className="h-14" />
        </div>

        <h1 className="mb-3 text-4xl font-bold tracking-tight text-fg md:text-5xl">
          Sign in to your account
        </h1>

        <p className="mx-auto mb-9 max-w-sm text-sm text-muted">
          {isSharedReport
            ? 'A report was shared with you. Sign in to open it — you’ll get a read-only view.'
            : 'Connect a provider to analyze your repositories.'}
        </p>

        {/* OAuth providers */}
        <div className="grid gap-3 sm:grid-cols-2">
          <HoverBorderGradient
            as="a"
            containerClassName="w-full rounded-xl no-underline"
            className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#0d0d10] text-[0.95rem] font-medium text-fg"
            {...{ href: githubLoginUrl(next) }}
          >
            <span className="text-muted">
              <GithubMark />
            </span>
            Login with GitHub
          </HoverBorderGradient>
          <HoverBorderGradient
            as="a"
            containerClassName="w-full rounded-xl no-underline"
            className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#0d0d10] text-[0.95rem] font-medium text-fg"
            {...{ href: googleLoginUrl(next) }}
          >
            <GoogleMark />
            Login with Google
          </HoverBorderGradient>
        </div>

        {/* glowing sparkles divider band */}
        <div className="relative mt-10 h-16 w-full">
          {/* gradient glow lines */}
          <div className="absolute inset-x-[16%] top-0 mx-auto h-px w-[68%] bg-gradient-to-r from-transparent via-glow-blue to-transparent" />
          <div className="absolute inset-x-[16%] top-0 mx-auto h-[3px] w-[68%] bg-gradient-to-r from-transparent via-glow-blue to-transparent blur-sm" />
          <div className="absolute inset-x-[34%] top-0 mx-auto h-px w-[32%] bg-gradient-to-r from-transparent via-glow-purple to-transparent" />
          <div className="absolute inset-x-[34%] top-0 mx-auto h-1 w-[32%] bg-linear-to-r from-transparent via-glow-purple to-transparent blur-sm" />

          {/* particles — transparent canvas, masked so they fade at edges (no rectangle) */}
          <SparklesCore
            background="transparent"
            minSize={0.4}
            maxSize={1}
            particleDensity={800}
            className="h-full w-full mask-[radial-gradient(220px_90px_at_top,white_20%,transparent_75%)]"
            particleColor="#FFFFFF"
          />
        </div>

        <p className="mt-3 text-sm text-muted">
          By continuing you agree to our Terms & Privacy Policy.
        </p>
      </div>
    </main>
  );
}
