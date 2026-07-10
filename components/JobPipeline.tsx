'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  FileText,
  GitBranch,
  Network,
  ShieldCheck,
  Package,
  Gauge,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface JobPipelineProps {
  agentStatuses: Record<string, 'pending' | 'running' | 'completed' | 'failed'>;
  jobStatus: 'pending' | 'running' | 'done' | 'failed';
}

const AGENTS = [
  { id: 'architecture', name: 'architecture', label: 'Architecture', icon: Network, color: '#5b8def', y: 60 },
  { id: 'security', name: 'security', label: 'Security', icon: ShieldCheck, color: '#ff6363', y: 135 },
  { id: 'dependency', name: 'dependency', label: 'Dependencies', icon: Package, color: '#8b5cf6', y: 210 },
  { id: 'quality', name: 'quality', label: 'Quality', icon: Gauge, color: '#46d296', y: 285 },
  { id: 'docs', name: 'docs', label: 'Docs', icon: FileText, color: '#ffb347', y: 360 },
];

const inPath = (y: number) => `M150 210 C240 210, 250 ${y}, 340 ${y}`;
const outPath = (y: number) => `M490 ${y} C580 ${y}, 590 210, 680 210`;
const pulsePath = (y: number) =>
  `M150 210 C240 210, 250 ${y}, 340 ${y} L490 ${y} C580 ${y}, 590 210, 680 210`;

export function JobPipeline({ agentStatuses, jobStatus }: JobPipelineProps) {
  const reduceMotion = useReducedMotion();

  // Helper to resolve status for a step
  const getStepStatus = (id: string) => {
    // Map dependencies -> dependency if needed
    const normalizedId = id === 'dependencies' ? 'dependency' : id;
    return agentStatuses[normalizedId] || 'pending';
  };

  // Synthesis window: every agent has settled (completed/failed) but the job
  // isn't 'done' yet — the synthesizer's Sonnet call is running. Drive the
  // report node's own loading animation off this so it isn't dead-static.
  const allAgentsSettled = AGENTS.every((a) => {
    const s = getStepStatus(a.id);
    return s === 'completed' || s === 'failed';
  });
  const synthesizing = jobStatus === 'running' && allAgentsSettled;

  return (
    <div className="relative mx-auto w-full max-w-4xl" aria-hidden="true">
      <svg viewBox="0 0 900 420" fill="none" className="h-auto w-full">
        {/* Wires */}
        {AGENTS.map((agent) => {
          const status = getStepStatus(agent.id);
          let pathOpacity = '0.07';
          let strokeWidth = '1.2';
          let strokeColor = 'rgba(255,255,255,0.07)';

          if (status === 'completed') {
            pathOpacity = '0.65';
            strokeWidth = '1.6';
            strokeColor = agent.color;
          } else if (status === 'running') {
            pathOpacity = '0.4';
            strokeWidth = '1.4';
            strokeColor = agent.color;
          } else if (status === 'failed') {
            pathOpacity = '0.3';
            strokeWidth = '1.4';
            strokeColor = '#ff6363';
          }

          return (
            <g key={agent.id}>
              {/* Background trace line */}
              <path d={inPath(agent.y)} stroke="rgba(255,255,255,0.04)" strokeWidth="1.2" />
              <path d={outPath(agent.y)} stroke="rgba(255,255,255,0.04)" strokeWidth="1.2" />

              {/* Dynamic status line */}
              <motion.path
                d={inPath(agent.y)}
                stroke={strokeColor}
                strokeOpacity={pathOpacity}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                animate={{ stroke: strokeColor, strokeOpacity: parseFloat(pathOpacity) }}
                transition={{ duration: 0.5 }}
              />
              <motion.path
                d={outPath(agent.y)}
                stroke={strokeColor}
                strokeOpacity={pathOpacity}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                animate={{ stroke: strokeColor, strokeOpacity: parseFloat(pathOpacity) }}
                transition={{ duration: 0.5 }}
              />

              {/* Traveling pulse for running agents */}
              {status === 'running' && !reduceMotion && (
                <circle
                  r="3.5"
                  fill={agent.color}
                  opacity="0.9"
                  style={{ filter: `drop-shadow(0 0 6px ${agent.color})` }}
                >
                  <animateMotion
                    path={pulsePath(agent.y)}
                    dur="2.5s"
                    repeatCount="indefinite"
                    calcMode="spline"
                    keyPoints="0;1"
                    keyTimes="0;1"
                    keySplines="0.42 0 0.58 1"
                  />
                </circle>
              )}
            </g>
          );
        })}

        {/* Repo Node (Left) */}
        <g>
          <rect
            x="30"
            y="183"
            width="120"
            height="54"
            rx="14"
            fill="#121215"
            stroke={
              jobStatus === 'running' || jobStatus === 'pending'
                ? 'var(--glow-blue)'
                : 'rgba(255,255,255,0.12)'
            }
            strokeWidth={jobStatus === 'running' ? '1.5' : '1'}
            className={jobStatus === 'running' ? 'animate-pulse' : ''}
            style={
              jobStatus === 'running'
                ? { filter: 'drop-shadow(0 0 8px rgba(91, 141, 239, 0.25))' }
                : undefined
            }
          />
          <g transform="translate(46, 202)">
            {jobStatus === 'running' ? (
              <motion.g
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              >
                <Loader2 size={16} color="#5b8def" strokeWidth={1.8} />
              </motion.g>
            ) : (
              <GitBranch size={16} color="#9a9a9e" strokeWidth={1.8} />
            )}
          </g>
          <text x="70" y="214" fontFamily="var(--font-mono-stack)" fontSize="13" fill="#f5f5f5">
            repo
          </text>
        </g>

        {/* Agent Nodes */}
        {AGENTS.map((agent) => {
          const status = getStepStatus(agent.id);

          let strokeColor = 'rgba(255,255,255,0.1)';
          let strokeWidth = '1';
          let cardBg = '#121215';
          let textColor = '#9a9a9e';
          let glowStyle = {};

          if (status === 'running') {
            strokeColor = agent.color;
            strokeWidth = '1.5';
            cardBg = 'rgba(255, 255, 255, 0.02)';
            textColor = '#f5f5f5';
            glowStyle = { filter: `drop-shadow(0 0 8px ${agent.color}33)` };
          } else if (status === 'completed') {
            strokeColor = '#46d296';
            strokeWidth = '1.2';
            textColor = '#f5f5f5';
          } else if (status === 'failed') {
            strokeColor = '#ff6363';
            strokeWidth = '1.5';
            textColor = '#ff8f8f';
            glowStyle = { filter: 'drop-shadow(0 0 8px rgba(255, 99, 99, 0.15))' };
          }

          return (
            <g key={agent.id}>
              {/* Agent card body */}
              <rect
                x="340"
                y={agent.y - 21}
                width="150"
                height="42"
                rx="11"
                fill={cardBg}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                style={glowStyle}
              />

              {/* Status Indicator Icon or Dot */}
              <g transform={`translate(352, ${agent.y - 8})`}>
                {status === 'completed' ? (
                  <Check size={16} color="#46d296" strokeWidth={2.5} />
                ) : status === 'failed' ? (
                  <AlertTriangle size={16} color="#ff6363" strokeWidth={2.5} />
                ) : status === 'running' ? (
                  <motion.g
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  >
                    <Loader2 size={16} color={agent.color} strokeWidth={2} />
                  </motion.g>
                ) : (
                  <circle cx="8" cy="8" r="4.5" fill="rgba(255,255,255,0.15)" />
                )}
              </g>

              {/* Agent Text label */}
              <text
                x="378"
                y={agent.y + 4}
                fontFamily="var(--font-mono-stack)"
                fontSize="12.5"
                fill={textColor}
              >
                {agent.label}
              </text>
            </g>
          );
        })}

        {/* Report Node (Right) */}
        <g>
          {synthesizing && !reduceMotion ? (
            <motion.rect
              x="680"
              y="172"
              width="190"
              height="76"
              rx="16"
              fill="#121215"
              stroke="#5b8def"
              strokeWidth="1.5"
              animate={{
                strokeOpacity: [0.35, 1, 0.35],
                filter: [
                  'drop-shadow(0 0 4px rgba(91,141,239,0.15))',
                  'drop-shadow(0 0 12px rgba(91,141,239,0.4))',
                  'drop-shadow(0 0 4px rgba(91,141,239,0.15))',
                ],
              }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            />
          ) : (
            <rect
              x="680"
              y="172"
              width="190"
              height="76"
              rx="16"
              fill="#121215"
              stroke={
                jobStatus === 'done'
                  ? '#46d296'
                  : synthesizing
                  ? '#5b8def'
                  : 'rgba(255,255,255,0.12)'
              }
              strokeWidth={jobStatus === 'done' || synthesizing ? '1.5' : '1'}
              style={
                jobStatus === 'done'
                  ? { filter: 'drop-shadow(0 0 10px rgba(70, 210, 150, 0.2))' }
                  : undefined
              }
            />
          )}
          <g transform="translate(698, 192)">
            {synthesizing ? (
              <motion.g
                animate={reduceMotion ? undefined : { rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                style={{ transformOrigin: '9px 9px' }}
              >
                <Loader2 size={18} color="#5b8def" strokeWidth={1.8} />
              </motion.g>
            ) : (
              <FileText
                size={18}
                color={jobStatus === 'done' ? '#46d296' : '#5b8def'}
                strokeWidth={1.8}
              />
            )}
          </g>
          <text x="726" y="200" fontFamily="var(--font-mono-stack)" fontSize="13" fill="#f5f5f5">
            {synthesizing ? 'synthesizing…' : 'report.md'}
          </text>
          {/* Placeholder text lines — shimmer while synthesizing */}
          <motion.rect
            x="698"
            y="216"
            width="120"
            height="4"
            rx="2"
            fill={
              jobStatus === 'done'
                ? 'rgba(70, 210, 150, 0.25)'
                : synthesizing
                ? 'rgba(91,141,239,0.35)'
                : 'rgba(255,255,255,0.14)'
            }
            animate={
              synthesizing && !reduceMotion ? { opacity: [0.3, 0.9, 0.3] } : { opacity: 1 }
            }
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          />
          <motion.rect
            x="698"
            y="226"
            width="88"
            height="4"
            rx="2"
            fill={
              jobStatus === 'done'
                ? 'rgba(70, 210, 150, 0.15)'
                : synthesizing
                ? 'rgba(91,141,239,0.2)'
                : 'rgba(255,255,255,0.09)'
            }
            animate={
              synthesizing && !reduceMotion ? { opacity: [0.3, 0.9, 0.3] } : { opacity: 1 }
            }
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut', delay: 0.3 }}
          />
        </g>
      </svg>
    </div>
  );
}
