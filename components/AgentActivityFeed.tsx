'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { AgentActivity, AgentStatus } from '../lib/stores/job-progress-store';

interface AgentActivityFeedProps {
  agentStatuses: Record<string, AgentStatus>;
  agentActivity: Record<string, AgentActivity | undefined>;
}

/** Label + accent per agent, matching JobPipeline's nodes. */
const AGENTS: { id: string; label: string; color: string }[] = [
  { id: 'architecture', label: 'Architecture', color: '#5b8def' },
  { id: 'security', label: 'Security', color: '#ff6363' },
  { id: 'dependency', label: 'Dependencies', color: '#8b5cf6' },
  { id: 'quality', label: 'Quality', color: '#46d296' },
  { id: 'docs', label: 'Docs', color: '#ffb347' },
];

/**
 * What each running agent is doing, right now.
 *
 * The pipeline above shows *that* five agents are running. Until agents became
 * tool loops that was the whole story — a run took ~5 seconds. Now an agent
 * works for minutes, and "five nodes pulsing, nothing changing" is
 * indistinguishable from a hang. This is the part that moves.
 *
 * Deliberate choices:
 * - **Fixed row height, reserved up front.** The activity text changes every
 *   turn; letting rows size to their content would reflow the page under the
 *   user's cursor each time.
 * - **Tabular figures on the turn counter.** `3/16` → `4/16` must not shift the
 *   text beside it.
 * - **One `aria-live="polite"` region**, not one per row — five agents each
 *   announcing every turn would make a screen reader unusable. Politeness means
 *   it waits for a pause rather than interrupting.
 * - **No spinner per row.** The text changing IS the progress indicator; a
 *   spinner next to changing text is noise.
 */
export function AgentActivityFeed({
  agentStatuses,
  agentActivity,
}: AgentActivityFeedProps) {
  const reduceMotion = useReducedMotion();

  const rows = AGENTS.filter(
    (a) => agentStatuses[a.id] === 'running' && agentActivity[a.id],
  );

  // Nothing running with activity yet — render nothing rather than an empty
  // frame. The pipeline already carries the "queued/indexing" story.
  if (!rows.length) return null;

  return (
    <div
      className="mt-6 space-y-1.5 border-t border-line pt-5"
      aria-live="polite"
      aria-label="Agent activity"
    >
      {rows.map(({ id, label, color }) => {
        const act = agentActivity[id]!;
        return (
          <div
            key={id}
            className="flex h-6 items-center gap-3 text-xs"
            // The row is the semantic unit; without this a screen reader reads
            // the three columns as three unrelated fragments.
            aria-label={`${label}, turn ${act.turn} of ${act.maxTurns}, ${act.activity}`}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <span className="w-24 shrink-0 truncate font-medium text-fg">
              {label}
            </span>
            <span className="w-14 shrink-0 font-mono text-[11px] tabular-nums text-muted">
              {act.turn}/{act.maxTurns}
            </span>
            {/* Crossfade the text only — animating the row would move its
                neighbours. Keyed on the phrase so an unchanged phrase across
                turns doesn't re-trigger the fade. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={act.activity}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="min-w-0 flex-1 truncate text-muted"
                title={act.activity}
              >
                {act.activity}
              </motion.span>
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
