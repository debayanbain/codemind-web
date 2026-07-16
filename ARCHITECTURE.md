# CodeMind-web — Frontend Architecture

**Next.js 15 · React 19 · Tailwind v4 · separate repo · main @ dd204d0**

The client for the CodeMind pipeline: pick a repo, watch five agents work in real time, read the report. It ships no diagram library — the synthesizer already rendered every diagram to inert SVG, so the browser only embeds strings.

*Companion doc: `CodeMind/ARCHITECTURE.md` — the backend.*

| Metric | Value |
|---|---|
| Files indexed | 59 |
| Graph nodes | 564 |
| Graph edges | 966 |
| Lines authored | 9,128 |
| Routes | 4 |
| Env vars | 1 |

*Node/edge counts from CodeGraph. Lines authored = 7,659 TS/TSX across 57 files, plus a 1,469-line `globals.css`.*

---

## Shape: four routes, one of which does two jobs

The surface is deliberately small. `/` is a fork in the road: unauthenticated it renders the full marketing landing page, authenticated it renders the dashboard. That's why `useMeQuery` converts a 401 into `null` rather than an error — the 401 is the branch condition, not a failure.

| Route | Renders | LOC |
|---|---|---|
| `/` | Landing page when signed out; repo dashboard with search, stat tiles and generated card art when signed in. | 311 |
| `/login` | OAuth entry. `<Suspense>` wraps the form because `useSearchParams` would otherwise opt the route out of static prerender. | 138 |
| `/jobs/[jobId]` | The live job page — socket subscription, agent pipeline visual, retry controls, then the report. Largest file in the repo. | 520 |
| `/share/[token]` | Read-only shared report. Same dashboard, no export/retry/share affordances. | 103 |

> **Architectural note.** **Every page is a client component.** There is no RSC data fetching, no streaming, no `loading.tsx`/`error.tsx`, and no route handlers — each route hand-rolls its own loading and error states. Given that everything behind auth is per-user and socket-driven, that's a defensible call, but it means `components.json`'s `"rsc": true` currently describes an intention rather than the code.

---

## Auth: cookies the client can't read, refreshed exactly once

No tokens in JS. The backend owns HttpOnly access and refresh cookies; every request just sets `credentials: 'include'`. The interesting part is the 401 path.

1. **A request comes back 401.** `apiFetch` intercepts it rather than throwing to the caller.
2. **One refresh, no matter how many callers.** `refreshInFlight ??= rawFetch('/auth/refresh')` — a single-flight promise. Ten concurrent 401s produce one refresh call, not ten.
3. **Replay once, then give up.** The original request retries a single time. `logout()` passes `retry = false` so a 401 logout can't spin a refresh loop.
4. **Open redirects blocked on both ends.** `safeNext()` rejects anything not starting with `/`, plus `//` and `/\`. The API re-validates independently — neither side trusts the other.

> **Quirk the client absorbs.** `apiFetch` maps an empty body to `null`, because Nest answers a handler that returned `null` with a 200 and no body — and `GET /jobs/:id/share` does exactly that when no share link exists. Without the special case, `JSON.parse('')` throws on a perfectly successful response.

---

## Realtime: sockets are an optimization, not a dependency

This is the most carefully-reasoned part of the codebase, and the reasoning is the same throughout: **a missed event must degrade to a delay, never to a frozen page.** The orchestrator can emit `job:status running` before the page's subscribe lands, so the UI assumes events will be missed and compensates in three independent places.

| Role | Mechanism | Detail |
|---|---|---|
| Belt | 3-second polling underneath the socket | `useJobQuery` keeps a `refetchInterval` running and stops only on `failed`, or `done` with a report attached. A dropped event costs ~3s. |
| Braces | `job:progress` promotes a stale `pending` | If progress arrives for a job still cached as pending, the missed `running` event is inferred rather than waited for. |
| Braces | `effectiveStatus` derives what the status should be | Pending + visible agent activity renders as running, so the page never says "waiting in queue" over a job that's plainly working. |
| Correct | The fetch wins over the socket | `job.agentResults` is authoritative and overrides socket-derived state — because `job:progress` fires on *both* success and recorded failure, so it always optimistically marks "completed". |
| Plumbing | The plural/singular translation | The backend routing key is `agent.dependencies`; the store key is `dependency`. The event handler rewrites it inline on every progress event. |
| **Leak** | The socket never unsubscribes | `subscribe` is emitted with no counterpart on cleanup — only local listeners come off. The module-level singleton is never disconnected and has no error or reconnect handling. |

Events listened to, all routed into one handler that early-returns on a jobId mismatch: `job:status`, `job:progress`, `job:complete`, `job:failed`.

---

## State: two stores, split on how the data arrives

The split isn't stylistic — it's about direction of travel. Data the client *asks for* lives in React Query. Data the server *pushes* lives in Zustand, because a query cache is the wrong shape for incremental socket writes.

**React Query — server state, 12 hooks.** Everything fetched over HTTP. Keys: `['me']`, `['repos']`, `['job', id]`, `['share', id]`, `['shared-report', token]`.
- Provider is 19 lines — no devtools, no hydration boundary, no SSR prefetch
- `useState(() => new QueryClient())` for per-request identity
- Defaults: `refetchOnWindowFocus: false`, `retry: 1`

**Zustand — socket state, 1 store.** Pipeline progress, per-agent status, failure reason. Reset per `jobId` — one job page at a time, so no per-job map is needed.
- No middleware: no persist, devtools, or immer
- Per-field selectors, not whole-store subscriptions
- Agents run in on a 220ms stagger for legibility

---

## Reports: two renderers over one payload

The backend hands over `markdownContent`, a `diagrams[]` array of pre-rendered SVG, a `synthesis` object, and each agent's raw JSON. The primary view ignores the Markdown entirely.

**Path A — the dashboard (primary, structured).** Renders from agent JSON directly. Each section pulls its own diagram out of `report.diagrams` by slug:

| Slug | Section |
|---|---|
| `health-gauge` | Summary |
| `architecture-modules` | Architecture |
| `request-flow-{n}` | positionally matched to `request_flows[n-1]` |
| `security-auth-flow` | Security |
| `dependency-graph` | Dependencies |
| `quality-donut` | Quality |

**Path B — raw Markdown (fallback, collapsed by default).** The complete view for reports written before synthesis was stored structurally.
- `react-markdown` + `remark-gfm`
- Overrides the `code` component: a `d2`/`chart` fence's slug (exposed by mdast as `node.data.meta`) is swapped for its SVG
- A slug miss falls through to a code block rather than dropping the source

> **Why nothing executes.** `DiagramFigure` embeds `diagram.svg` via `dangerouslySetInnerHTML`, and that's safe *only* because of what happened upstream: D2 output went through `sanitizeSvg()` (strips `<script>`, `<foreignObject>`, `on*` handlers, `javascript:` URIs) and the hand-built charts XML-escape every interpolated label. The invariant is written down in the component: if this ever renders SVG from a source other than our own synthesizer, it needs client-side DOMPurify instead.
>
> A `degraded` diagram renders an empty state instead — "the underlying analysis is intact, see the section data below."

**Mermaid is a fossil, not a dependency.** `mermaid@11` is still installed, and `MermaidBlock` still renders client-side with `securityLevel: 'strict'` — but it is reachable only through one guarded branch in `ReportView`, for reports generated before the D2 migration. It's dynamically imported, so it never enters the main bundle. For any report produced today, **no diagram library runs in the browser at all**.

**Export bypasses the frontend entirely** — `ExportMenu` links straight to `${API_URL}/jobs/${jobId}/export?format=md|pdf`.

---

## Design system: Tailwind v4, CSS-first, dark only

There is no `tailwind.config.js` — v4 takes its tokens from an `@theme` block in `globals.css`. Two things there are worth flagging.

**Preflight is skipped on purpose.** The file imports only `tailwindcss/theme.css` and `tailwindcss/utilities.css`, never `tailwindcss` itself, because the Markdown report view depends on default element styles. A hand-written eight-line reset slice restores just what the border utilities assume.

**The palette is declared twice.** The `@theme` block feeds Tailwind utilities (`bg-bg`, `text-muted`); a parallel `:root` block feeds the ~1,400 lines of hand-written BEM-ish CSS. Same hexes, two systems, kept in sync by hand.

| Token | Hex |
|---|---|
| `bg` | `#0d0d10` |
| `surface` | `#1a1a1d` |
| `accent` | `#ff6363` |
| `glow-blue` | `#5b8def` |
| `glow-purple` | `#8b5cf6` |
| `glow-teal` | `#2dd4bf` |
| `glow-green` | `#46d296` |
| `glow-amber` | `#ffb347` |

> **Two things that aren't what they look like.** `components.json` declares shadcn/ui, but `components/ui/` holds Aceternity-style effect components plus one hand-written `button.tsx` — almost no shadcn primitives. Its `@/hooks` alias points at a directory that doesn't exist.
>
> `framer-motion` and `motion/react` are both installed and both used — the same package family under two import specifiers, split by which components were written when.

**Accessibility and motion.** Motion handling is consistent and genuinely good: `useReducedMotion()` is honored throughout, and there are `prefers-reduced-motion` blocks in the CSS. The app is unconditionally dark — `color-scheme: dark`, hardcoded hexes, no `dark:` variants, no theme provider. That's a choice, not an omission, but it is worth naming as one.

---

## Honest state: gaps, drift, and one real bug

As with the backend, there is not a single `TODO` or `FIXME` in the repo — so none of this is self-announcing. The first item is a live defect, found by diffing the client's calls against the server's route table.

| Status | Item | Detail |
|---|---|---|
| **Bug** | The Google sign-in button 404s | `/login` renders a Google button linking to `${API_URL}/auth/google` via `googleLoginUrl()`. That route **does not exist** — the backend has zero occurrences of "google" anywhere in `apps/`, `libs/` or the schema. Its only auth strategies are GitHub and JWT. Either build the strategy or pull the button. |
| **Drift** | The landing page still advertises Mermaid | Copy promises "Mermaid diagrams generated from the real dependency graph" and "Diagrams included as Mermaid source". The system emits D2 and server-rendered SVG; `RenderedDiagram.kind` is `'d2' \| 'chart'`. The marketing outlived the migration. |
| **Risk** | Backend types are hand-mirrored | `lib/types.ts` copies `libs/common/src/types/agent-outputs.types.ts` with no codegen and no shared package. Every field is optional — correctly, since the backend only `JSON.parse`s the model's reply — but drift is unenforced in both directions. |
| **Missing** | No tests, no lint, no CI | No test files or runner. `next lint` is scripted but `eslint` isn't a dependency and no config exists — yet `eslint-disable` comments are scattered through five files, suppressing a linter that never runs. |
| **Missing** | No `.env.example` | The app's single env var, `NEXT_PUBLIC_API_URL`, is documented only by its `?? 'http://localhost:3000'` fallback. |
| **Dead** | ~600 lines of unimported components | `canvas-text.tsx`, `card-hover-effect.tsx`, `encrypted-text.tsx`, `squiggly-text.tsx` — none imported anywhere. Also `markPendingAsRunning` (superseded) and `formatDuration()` (never called). |
| **Unused** | Data fetched but never shown | `AgentResultSummary.durationMs` and `tokensUsed` are typed and arrive on every response, but surface nowhere in the UI — despite per-agent cost being one of the project's headline claims. |
| **Duplicated** | Token pricing hardcoded in two repos | `estimatedCost()` hardcodes Haiku input pricing at $0.80/1M, duplicated from the backend renderer by convention alone. A price change needs two edits in two repositories. |

---

## Craft: details worth keeping

Small things that show the codebase was reasoned about rather than assembled.

- **Repo card art is deterministic, not random.** FNV-1a hash → mulberry32 PRNG → one of 9 patterns and 10 palettes. The geometry stream is offset from the selection stream, so a repo always looks like itself across reloads.
- **The scrollspy never jumps backwards.** `SectionNav` breaks IntersectionObserver ties in document order — the usual cause of a highlight that flickers upward mid-scroll.
- **SectionNav sits outside the motion wrappers deliberately.** A transform or filter ancestor establishes a containing block and would silently break its `lg:sticky` positioning. The reason is in a comment, so the next person can't undo it by accident.
- **Every section guards its own agent.** Each report section handles its agent being absent with a specific empty state rather than a crash — which is the correct shape, since any single agent is allowed to fail without failing the job.
- **Language icons are tree-shaken.** 31 named `simple-icons` imports in a registry, not a dynamic lookup — so the bundle carries 31 icons, not the whole set.

---

*CodeMind-web · Next.js 15 · React 19 · Tailwind v4 · separate repo from the Nest monorepo · counts from CodeGraph · main @ dd204d0*
