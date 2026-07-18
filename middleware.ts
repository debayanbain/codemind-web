import { clerkMiddleware } from '@clerk/nextjs/server';

// Clerk needs its middleware on every app route so `auth()` / session state is
// available. All routes are public here (the app itself decides what to show
// signed-out via getMe) — we don't protect routes at the middleware layer.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Everything except Next internals and static assets…
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // …and always run for API/trpc routes.
    '/(api|trpc)(.*)',
  ],
};
