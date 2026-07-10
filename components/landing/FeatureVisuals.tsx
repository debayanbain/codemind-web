'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Check, Download, FileCode2, KeyRound, ShieldCheck } from 'lucide-react';

const AGENT_STEPS = ['architecture', 'security', 'dependencies', 'quality', 'docs'];

export function LiveProgressVisual() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="feature-visual-body" aria-hidden="true">
      <div className="feature-visual-row">
        <span className="badge badge-running">running</span>
        <span className="report-preview-repo">3/5 agents complete</span>
      </div>
      <div className="progress-bar">
        <motion.div
          className="progress-bar-fill"
          initial={{ width: '0%' }}
          animate={{ width: '60%' }}
          transition={reduceMotion ? { duration: 0 } : { duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <ul className="progress-steps">
        {AGENT_STEPS.map((step, i) => (
          <li key={step} className={i < 3 ? 'progress-step-done' : ''}>
            {i < 3 ? <Check size={14} strokeWidth={2} /> : <span className="progress-step-dot" />}
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExportVisual() {
  return (
    <div className="feature-visual-body" aria-hidden="true">
      <div className="export-files">
        <div className="export-file">
          <FileCode2 size={18} strokeWidth={1.75} />
          <span>report.md</span>
        </div>
        <div className="export-file">
          <FileCode2 size={18} strokeWidth={1.75} />
          <span>diagram.mmd</span>
        </div>
      </div>
      <button className="btn btn-secondary export-btn" type="button" tabIndex={-1}>
        <Download size={15} strokeWidth={2} />
        Export .md
      </button>
    </div>
  );
}

export function SecurityVisual() {
  return (
    <div className="feature-visual-body" aria-hidden="true">
      <div className="security-badge">
        <ShieldCheck size={22} strokeWidth={1.75} color="#ff6363" />
        <span>GitHub OAuth, scoped by you</span>
      </div>
      <ul className="security-list">
        <li>
          <KeyRound size={14} strokeWidth={2} />
          You choose which repos to connect
        </li>
        <li>
          <Check size={14} strokeWidth={2} />
          Revoke access from GitHub at any time
        </li>
      </ul>
    </div>
  );
}
