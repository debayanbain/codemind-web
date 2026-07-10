import { create } from 'zustand';

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed';

const AGENT_IDS = ['architecture', 'security', 'dependency', 'quality', 'docs'];

function initialAgentStatuses(): Record<string, AgentStatus> {
  return Object.fromEntries(AGENT_IDS.map((id) => [id, 'pending']));
}

interface JobProgressState {
  progress: { done: number; total: number } | null;
  agentStatuses: Record<string, AgentStatus>;
  failureReason: string | null;
  setProgress: (progress: { done: number; total: number }) => void;
  setAgentStatus: (agentId: string, status: AgentStatus) => void;
  setAllAgents: (status: AgentStatus) => void;
  markPendingAsRunning: () => void;
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
  failureReason: null,

  setProgress: (progress) => set({ progress }),

  setAgentStatus: (agentId, status) =>
    set((state) => ({
      agentStatuses: { ...state.agentStatuses, [agentId]: status },
    })),

  setAllAgents: (status) =>
    set({
      agentStatuses: Object.fromEntries(AGENT_IDS.map((id) => [id, status])),
    }),

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

  markStaleRunningAsFailed: () =>
    set((state) => {
      const next = { ...state.agentStatuses };
      for (const id of AGENT_IDS) {
        if (next[id] === 'running' || next[id] === 'pending') next[id] = 'failed';
      }
      return { agentStatuses: next };
    }),

  setFailureReason: (reason) => set({ failureReason: reason }),

  reset: () =>
    set({ progress: null, agentStatuses: initialAgentStatuses(), failureReason: null }),
}));
