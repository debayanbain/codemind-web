'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FileText, GitBranch, Terminal, Cpu, Clock, Sparkles } from 'lucide-react';

const AGENTS = [
  { name: 'architecture', color: '#5b8def', y: 46 },
  { name: 'security', color: '#ff6363', y: 108 },
  { name: 'dependencies', color: '#8b5cf6', y: 170 },
  { name: 'quality', color: '#46d296', y: 232 },
  { name: 'docs', color: '#ffb347', y: 294 },
];

// Central hub sits at y=170; repo feeds all agents, agents converge to report.
const inPath = (y: number) => `M180 170 C255 170, 245 ${y}, 320 ${y}`;
const outPath = (y: number) => `M490 ${y} C565 ${y}, 555 170, 630 170`;
const pulsePath = (y: number) =>
  `M180 170 C255 170, 245 ${y}, 320 ${y} L490 ${y} C565 ${y}, 555 170, 630 170`;

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { pathLength: 1, opacity: 1 },
};

/**
 * Animated SVG pipeline: repo → five agents → one report.
 * Framed as a self-contained orchestrator window: real toolbar + status bar,
 * no floating badges — so the status metadata reads as part of one surface.
 */
export function PipelineGraph() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mx-auto w-full max-w-3xl" aria-hidden="true">
      {/* Single ambient glow behind the panel — one light source, not scattered decoration */}
      <div className="absolute inset-x-8 -inset-y-6 -z-10 bg-radial from-glow-blue/12 via-glow-purple/6 to-transparent blur-3xl" />

      {/* Outer frame */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface/60 backdrop-blur-xl shadow-[0_40px_120px_-30px_rgba(0,0,0,0.7),0_0_60px_-20px_rgba(91,141,239,0.25)]">
        {/* Top edge beam */}
        <div className="absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-linear-to-r from-transparent via-glow-blue/70 to-transparent" />

        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b border-white/8 bg-white/2 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff605c]/85" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd44]/85" />
            <span className="h-3 w-3 rounded-full bg-[#00ca4e]/85" />
          </div>
          <div className="flex items-center gap-1.5 text-muted">
            <Terminal size={12} className="text-glow-blue" />
            <span className="font-mono text-[11px] tracking-wide">
              codemind-orchestrator.json
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 rounded-full border border-glow-green/25 bg-glow-green/10 px-2.5 py-1">
            <Sparkles size={11} className="text-glow-green" />
            <span className="font-mono text-[10.5px] font-medium tracking-wide text-glow-green">
              5 agents online
            </span>
          </div>
        </div>

        {/* SVG canvas */}
        <div className="relative px-5 py-6 md:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[22px_22px] [mask-image:radial-gradient(ellipse_75%_80%_at_50%_50%,black,transparent)]" />

          <svg viewBox="0 0 810 340" fill="none" className="relative h-auto w-full">
            {/* wires */}
            {AGENTS.map((agent, i) => (
              <g key={agent.name}>
                <path d={inPath(agent.y)} stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" />
                <path d={outPath(agent.y)} stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" />
                <motion.path
                  d={inPath(agent.y)}
                  stroke={agent.color}
                  strokeOpacity="0.5"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  initial={reduceMotion ? 'visible' : 'hidden'}
                  animate="visible"
                  variants={draw}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: 'easeInOut' }}
                />
                <motion.path
                  d={outPath(agent.y)}
                  stroke={agent.color}
                  strokeOpacity="0.5"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  initial={reduceMotion ? 'visible' : 'hidden'}
                  animate="visible"
                  variants={draw}
                  transition={{ duration: 0.8, delay: 0.35 + i * 0.06, ease: 'easeInOut' }}
                />
                {/* travelling pulse */}
                {!reduceMotion && (
                  <circle
                    r="3"
                    fill={agent.color}
                    opacity="0"
                    style={{ filter: `drop-shadow(0 0 5px ${agent.color})` }}
                  >
                    <set attributeName="opacity" to="0.9" begin={`${1.6 + i * 0.5}s`} />
                    <animateMotion
                      path={pulsePath(agent.y)}
                      dur={`${3 + i * 0.35}s`}
                      begin={`${1.6 + i * 0.5}s`}
                      repeatCount="indefinite"
                      calcMode="spline"
                      keyPoints="0;1"
                      keyTimes="0;1"
                      keySplines="0.45 0 0.55 1"
                    />
                  </circle>
                )}
              </g>
            ))}

            {/* repo node */}
            <motion.g
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <rect
                x="46"
                y="143"
                width="134"
                height="54"
                rx="14"
                fill="#1a1a1d"
                stroke="rgba(255,255,255,0.12)"
              />
              <g transform="translate(64, 162)">
                <GitBranch size={16} color="#9a9a9e" strokeWidth={1.8} />
              </g>
              <text x="90" y="174" fontFamily="var(--font-mono-stack)" fontSize="13" fill="#f5f5f5">
                repo
              </text>
            </motion.g>

            {/* agent nodes */}
            {AGENTS.map((agent, i) => (
              <motion.g
                key={agent.name}
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.07 }}
                style={{ transformOrigin: `405px ${agent.y}px` }}
              >
                <rect
                  x="320"
                  y={agent.y - 20}
                  width="170"
                  height="40"
                  rx="11"
                  fill="#1a1a1d"
                  stroke={agent.color}
                  strokeOpacity="0.35"
                />
                <circle cx="342" cy={agent.y} r="4" fill={agent.color} />
                <text
                  x="358"
                  y={agent.y + 4}
                  fontFamily="var(--font-mono-stack)"
                  fontSize="12.5"
                  fill="#f5f5f5"
                >
                  {agent.name}
                </text>
              </motion.g>
            ))}

            {/* report node */}
            <motion.g
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.55 }}
            >
              <rect
                x="630"
                y="132"
                width="180"
                height="76"
                rx="16"
                fill="#1a1a1d"
                stroke="rgba(255,255,255,0.14)"
              />
              <g transform="translate(648, 152)">
                <FileText size={18} color="#5b8def" strokeWidth={1.8} />
              </g>
              <text x="676" y="160" fontFamily="var(--font-mono-stack)" fontSize="13" fill="#f5f5f5">
                report.md
              </text>
              <rect x="648" y="176" width="120" height="4" rx="2" fill="rgba(255,255,255,0.14)" />
              <rect x="648" y="186" width="88" height="4" rx="2" fill="rgba(255,255,255,0.09)" />
            </motion.g>
          </svg>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-4 border-t border-white/8 bg-white/2 px-4 py-2.5 font-mono text-[10.5px] text-muted">
          <span className="flex items-center gap-1.5">
            <Terminal size={11} className="text-glow-blue" />
            branch: main
          </span>
          <span className="flex items-center gap-1.5">
            <Cpu size={11} className="text-glow-purple" />
            system: active
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <Clock size={11} className="text-glow-teal" />
            latency: 14ms
          </span>
        </div>
      </div>
    </div>
  );
}
