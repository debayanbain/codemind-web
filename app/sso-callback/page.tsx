'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

/**
 * OAuth return target for the custom sign-in buttons. Clerk finalizes the
 * sign-in *or* sign-up (it transfers a brand-new OAuth user automatically) and
 * then redirects on to the app. Renders a minimal "finishing" state for the
 * brief moment it's mounted.
 */
export default function SSOCallback() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6 text-sm text-muted">
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
      />
      Finishing sign-in…
    </main>
  );
}
