# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Frontend for CodeMind: a user picks a GitHub repo (or pastes a public URL), five analysis agents run on the backend, and this app shows live progress and then the report. The backend is a separate NestJS monorepo at `../CodeMind` (it has its own `CLAUDE.md` and `ARCHITECTURE.md`). The API runs on `:3000`, this app on `:3001`.

`ARCHITECTURE.md` goes deeper but is partly out of date. It still describes HttpOnly-cookie auth with a refresh flow, which is now Clerk, and a Markdown/Mermaid fallback renderer that nothing imports anymore. When the doc and the code disagree, trust the code.

## Commands

```bash
npm run dev          # next dev on port 3001
npx tsc --noEmit     # typecheck; this is the only automated check
```

- **Do not run `npm run build`.** It shares `.next/` with a running `next dev` and corrupts it. The dev server then throws `__webpack_modules__[moduleId] is not a function`. To recover, delete `.next/` and restart dev.
- No tests, no test runner, and no CI. `npm run lint` is defined, but ESLint isn't installed and has no config.
- Env vars live in `.env.local`, and there is no `.env.example`. The app needs `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3000`), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `NEXT_PUBLIC_CLERK_SIGN_IN_URL`/`SIGN_UP_URL` (both `/login`).

## Architecture

**Every page is a client component (`'use client'`).** There is no RSC data fetching, no route handlers, and no `loading.tsx`/`error.tsx`. Each page handles its own loading and error states. Routes:
- `/`: the landing page when signed out and the repo dashboard when signed in. The switch is `useMeQuery()`, which turns a 401 into `null`.
- `/login`: custom Clerk OAuth buttons (GitHub and Google). They redirect to `/sso-callback`, and `?next=` is checked by `safeNext()`.
- `/jobs/[jobId]`: live pipeline, then the report and repo chat.
- `/share/[token]`: read-only report. A 401 redirects to `/login?next=/share/…`.

**Auth is Clerk, sent as a Bearer token.** `middleware.ts` runs `clerkMiddleware()` but doesn't protect any route. Each page decides what to show. `lib/api.ts` reads the token from `window.Clerk.session.getToken()` on every request, because the API is cross-origin and cookies won't work. Anything that needs auth goes through `apiFetch`/`rawFetch`. A plain `<a href>` to the API can't carry the token, which is why exports download through a fetched blob (`downloadExport`). `useMeQuery` waits for Clerk's `isLoaded`. If it ran before Clerk loaded, the request would 401, cache `null`, and leave a signed-in user stuck on the landing page.

**The API client (`lib/api.ts`)** throws `ApiError(status, message, code)`. Branch on `status` or the machine-readable `code` (e.g. 409 `github_not_connected` shows the Connect GitHub card), not on the message text. An empty 200 body returns `null`, because Nest sends an empty body when a handler returns `null`.

**State is split by where data comes from:**
- **React Query** (`lib/queries.ts`) holds anything fetched over HTTP. Keys: `['me']`, `['repos']`, `['job', id]`, `['share', id]`, `['shared-report', token]`.
- **Zustand** (`lib/stores/job-progress-store.ts`) holds the pipeline state the socket pushes: progress, status per agent, and the live activity line. It is a single store, reset whenever `jobId` changes.

**Realtime assumes socket events can be missed.** `lib/socket.ts` holds one shared Socket.io connection, and the job page emits `subscribe` and listens for `job:status | job:progress | job:agent_activity | job:complete | job:failed`. A missed event should only cause a short delay, never a frozen page:
- `useJobQuery` also polls every 3s until the job is `failed`/`cancelled`, or `done` with a report.
- `job:progress` moves a cached `pending` job to `running`.
- `job:agent_activity` moves that agent out of `pending`, but never overrides a finished status.
- `job.agentResults` from the fetch is the source of truth and overrides socket state. `job:progress` fires on both success and failure, so it can't be trusted for the outcome.
- Agents run one at a time on the backend, so don't set every pending agent to `running` at once.
- The backend calls the dependency agent `dependencies` in events, but the store key is `dependency`.

**The report is rendered from structured data, not Markdown.** `components/report/ReportDashboard.tsx` builds one ordered section list that drives the nav, the section numbers and the body together, so they always match. There are two kinds of section:
- `sections.tsx`: agent output (`rawOutput` per agent, merged by `agentOutputs()`). An agent can fail without failing the job, so each section must render an empty state when its agent's output is missing.
- `measured.tsx`: AST data from `report.facts`. These render `null` for older reports that have no facts.

**Report invariants to keep:**
- `buildFindings()` in `lib/report.ts` must stay the same algorithm as `ReportRenderer#buildFindings` in the backend synthesizer, so finding IDs like `SEC-01` match between screen and export. Change both together.
- Diagrams arrive as SVG already rendered and sanitized on the server (`report.diagrams[]`, found by slug with `findDiagram`). `DiagramFigure` injects them with `dangerouslySetInnerHTML`. That is only safe because the SVG comes from our own synthesizer. Any other SVG source needs DOMPurify.
- `lib/types.ts` is copied by hand from the backend's `libs/common/src/types/*`, with no codegen. When backend types change, update it manually. Agent output fields are all optional on purpose.

## Styling conventions

- **Tailwind v4, CSS-first.** There is no `tailwind.config`. Tokens live in the `@theme` block of `app/globals.css` (`bg-bg`, `bg-surface`, `text-muted`, `text-glow-blue`, `border-line`, …). A `:root` block repeats the same colors for the hand-written CSS, so change a color in both places.
- **Preflight is skipped on purpose.** Only `tailwindcss/theme.css` and `utilities.css` are imported. Don't add `@import 'tailwindcss'`.
- The app is dark only, with no `dark:` variants.
- Fonts come from `app/layout.tsx` as CSS variables: Poppins for body text, Geist for headings, JetBrains Mono for code.
- Honor `useReducedMotion()` in animated components, as existing components do.
- `components/ui/` holds Aceternity-style effect components, not shadcn primitives, despite `components.json`. Both `framer-motion` and `motion/react` are used.
- Continuous canvas/rAF animations (stars, shooting stars) make headless screenshots hang, so check visual changes manually in a browser.
- Imports use both relative paths and the `@/*` alias (maps to the repo root). Either works.
