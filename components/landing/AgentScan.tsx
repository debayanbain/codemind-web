'use client';

import { motion, useReducedMotion } from 'framer-motion';

const AGENTS = [
  { name: 'architecture', color: '#5b8def', line: 2 },
  { name: 'security', color: '#ff6363', line: 5 },
  { name: 'dependencies', color: '#8b5cf6', line: 8 },
  { name: 'quality', color: '#46d296', line: 11 },
  { name: 'docs', color: '#ffb347', line: 14 },
];

const CODE_LINES = [
  'export function createSession(user: User) {',
  '  const token = signToken(user.id);',
  '  return { token, expiresAt: exp() };',
  '}',
  '',
  'db.query("SELECT * FROM users WHERE id = " + id)',
  '',
  'import leftpad from "leftpad";',
  'import moment from "moment";',
  '',
  'function calc(a, b) { return a + b }',
  '',
  '/** missing docstring on public API */',
  'export function analyze(repo: string) {}',
];

export function AgentScan() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="agent-scan" aria-hidden="true">
      <div className="agent-scan-titlebar">
        <span className="agent-scan-dot" style={{ background: '#ff6363' }} />
        <span className="agent-scan-dot" style={{ background: '#ffb347' }} />
        <span className="agent-scan-dot" style={{ background: '#46d296' }} />
        <span className="agent-scan-filename">auth.ts</span>
      </div>
      <div className="agent-scan-body">
        {CODE_LINES.map((line, i) => (
          <div className="agent-scan-line" key={i}>
            <span className="agent-scan-lineno">{i + 1}</span>
            <span className="agent-scan-code">{line || ' '}</span>
          </div>
        ))}
        {!reduceMotion && (
          <motion.div
            className="agent-scan-beam"
            animate={{ top: ['0%', '100%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>
      <div className="agent-scan-tags">
        {AGENTS.map((agent, i) => (
          <motion.span
            key={agent.name}
            className="agent-scan-tag"
            style={{ borderColor: agent.color, color: agent.color }}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0.35 }}
            animate={
              reduceMotion
                ? { opacity: 1 }
                : { opacity: [0.35, 1, 0.35] }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: 4, repeat: Infinity, delay: i * 0.8, ease: 'easeInOut' }
            }
          >
            {agent.name}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
