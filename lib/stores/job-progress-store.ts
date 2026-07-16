import { create } from 'zustand';

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed';

export const AGENT_IDS = ['architecture', 'security', 'dependency', 'quality', 'docs'];

function initialAgentStatuses(): Record<string, AgentStatus> {
  return Object.fromEntries(AGENT_IDS.map((id) => [id, 'pending']));
}

/** What one agent is doing right now, from its `job:agent_activity` events. */
export interface AgentActivity {
  /** 1-indexed. */
  turn: number;
  maxTurns: number;
  /** Mechanical phrase — "reading auth.guard.ts". Never model prose. */
  activity: string;
}

interface JobProgressState {
  progress: { done: number; total: number } | null;
  agentStatuses: Record<string, AgentStatus>;
  /**
   * Live per-agent activity, from `job:agent_activity`.
   *
   * `job:progress` only fires when an agent *finishes*, and an agent is now a
   * tool loop that runs for minutes — so this is the only thing that moves
   * in between. Without it the pipeline correctly shows five running agents and
   * then nothing changes for long enough to read as hung.
   */
  agentActivity: Record<string, AgentActivity | undefined>;
  failureReason: string | null;
  setProgress: (progress: { done: number; total: number }) => void;
  setAgentStatus: (agentId: string, status: AgentStatus) => void;
  setAgentActivity: (agentId: string, activity: AgentActivity) => void;
  setAllAgents: (status: AgentStatus) => void;
  markPendingAsRunning: () => void;
  markAgentRunningIfPending: (agentId: string) => void;
  markStaleRunningAsFailed: () => void;
  setFailureReason: (reason: string) => void;
  reset: () => void;
}

/**
 * Socket-driven job pipeline state — lives outside react-query because it's
 * pushed incrementally over Socket.io, not fetched. One shared job page at a
 * time, so a single store (reset per jobId) is enough; no per-job map needed.
 */
export const useJobProgressStore = create<JobProgressState>((set) => ({
  progress: null,
  agentStatuses: initialAgentStatuses(),
  agentActivity: {},
  failureReason: null,

  setProgress: (progress) => set({ progress }),

  // Reaching a terminal status clears the activity line: a finished agent still
  // showing "reading auth.guard.ts" is worse than showing nothing, because it
  // implies work that isn't happening.
  setAgentStatus: (agentId, status) =>
    set((state) => {
      const terminal = status === 'completed' || status === 'failed';
      return {
        agentStatuses: { ...state.agentStatuses, [agentId]: status },
        agentActivity: terminal
          ? { ...state.agentActivity, [agentId]: undefined }
          : state.agentActivity,
      };
    }),

  // Activity implies the agent is working, so promote it out of 'pending' —
  // otherwise a missed job:status event leaves a visibly-busy agent greyed out.
  // Never overwrites a terminal status: a late activity event must not resurrect
  // an agent that has already finished.
  setAgentActivity: (agentId, activity) =>
    set((state) => {
      const current = state.agentStatuses[agentId];
      if (current === 'completed' || current === 'failed') return state;
      return {
        agentActivity: { ...state.agentActivity, [agentId]: activity },
        agentStatuses:
          current === 'pending'
            ? { ...state.agentStatuses, [agentId]: 'running' }
            : state.agentStatuses,
      };
    }),

  setAllAgents: (status) =>
    set((state) => ({
      agentStatuses: Object.fromEntries(AGENT_IDS.map((id) => [id, status])),
      agentActivity:
        status === 'completed' || status === 'failed' ? {} : state.agentActivity,
    })),

  // Agents run in parallel (one queue per type), so once the job is running we
  // show every not-yet-finished agent as 'running' (pulsing) — each flips to
  // 'completed' individually as its own job:progress socket event lands. This
  // never overwrites an already-terminal (completed/failed) status.
  markPendingAsRunning: () =>
    set((state) => {
      const next = { ...state.agentStatuses };
      for (const id of AGENT_IDS) {
        if (next[id] === 'pending') next[id] = 'running';
      }
      return { agentStatuses: next };
    }),

  // Staggered variant of markPendingAsRunning: the page flips agents one at a
  // time (via timeouts) so the pipeline lights up sequentially instead of all
  // five nodes snapping to 'running' in the same frame. Never overwrites a
  // terminal status — a job:progress event can land mid-stagger.
  markAgentRunningIfPending: (agentId) =>
    set((state) =>
      state.agentStatuses[agentId] === 'pending'
        ? { agentStatuses: { ...state.agentStatuses, [agentId]: 'running' } }
        : state,
    ),

  markStaleRunningAsFailed: () =>
    set((state) => {
      const next = { ...state.agentStatuses };
      for (const id of AGENT_IDS) {
        if (next[id] === 'running' || next[id] === 'pending') next[id] = 'failed';
      }
      // Everything is terminal now — drop every activity line rather than leave
      // a failed agent claiming to still be reading a file.
      return { agentStatuses: next, agentActivity: {} };
    }),

  setFailureReason: (reason) => set({ failureReason: reason }),

  reset: () =>
    set({
      progress: null,
      agentStatuses: initialAgentStatuses(),
      agentActivity: {},
      failureReason: null,
    }),
}));
