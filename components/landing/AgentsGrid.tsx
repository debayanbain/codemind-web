'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FileText,
  Gauge,
  Network,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { AgentScan } from './AgentScan';

const AGENTS = [
  {
    icon: Network,
    color: '#5b8def',
    name: 'Architecture',
    description: 'Maps module boundaries, entry points, and how data actually flows through the system.',
  },
  {
    icon: ShieldCheck,
    color: '#ff6363',
    name: 'Security',
    description: 'Flags injection risks, unsafe auth patterns, and secrets that shouldn’t be in source.',
  },
  {
    icon: Package,
    color: '#8b5cf6',
    name: 'Dependencies',
    description: 'Surfaces outdated, unmaintained, or duplicated packages weighing down the repo.',
  },
  {
    icon: Gauge,
    color: '#46d296',
    name: 'Quality',
    description: 'Finds dead code, complexity hot spots, and patterns that will bite the next contributor.',
  },
  {
    icon: FileText,
    color: '#ffb347',
    name: 'Docs',
    description: 'Checks public APIs against their docstrings and generates what’s missing.',
  },
];

export function AgentsGrid() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="landing-section" id="agents">
      <ScrollReveal className="landing-section-head">
        <span className="eyebrow">Five agents, one pass</span>
        <h2>Every report, from a single analysis run.</h2>
        <p>
          Each agent reads the actual source — not a linter config — and
          writes its findings into one combined report.
        </p>
      </ScrollReveal>

      <ScrollReveal>
        <AgentScan />
      </ScrollReveal>

      <div className="mt-12 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {AGENTS.map((agent, idx) => (
          <div
            key={agent.name}
            className="group relative block h-full w-full p-2"
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
          >
            <AnimatePresence>
              {hovered === idx && (
                <motion.span
                  className="absolute inset-0 block h-full w-full rounded-2xl bg-white/25"
                  layoutId="agentHoverBackground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.15 } }}
                  exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
                />
              )}
            </AnimatePresence>
            <div className="relative z-20 h-full w-full rounded-2xl border border-white/10 bg-surface p-5 transition-colors duration-200 group-hover:border-white/20">
              <div
                className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border bg-surface-2"
                style={{ color: agent.color, borderColor: `${agent.color}33` }}
              >
                <agent.icon size={20} strokeWidth={1.75} />
              </div>
              <h3 className="m-0 mb-1.5 text-[1.02rem] font-semibold text-fg">
                {agent.name}
              </h3>
              <p className="m-0 text-[0.9rem] leading-relaxed text-muted">
                {agent.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
