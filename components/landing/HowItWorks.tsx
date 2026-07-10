'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ScrollReveal, ScrollRevealGroup, ScrollRevealItem } from './ScrollReveal';

const STEPS = [
  {
    step: '01',
    title: 'Connect GitHub',
    description: 'Sign in with GitHub OAuth and choose which repositories CodeMind can access.',
  },
  {
    step: '02',
    title: 'Pick a repo',
    description: 'Select any repo from the list and start an analysis with one click.',
  },
  {
    step: '03',
    title: 'Get your report',
    description: 'Watch agents work in real time, then read or export the combined report.',
  },
];

/** Horizontal wire that draws itself across the three steps on scroll. */
function StepConnector() {
  const reduceMotion = useReducedMotion();

  return (
    <svg
      viewBox="0 0 900 24"
      fill="none"
      className="mb-6 hidden h-6 w-full md:block"
      aria-hidden="true"
    >
      <path d="M20 12 H880" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      <motion.path
        d="M20 12 H880"
        stroke="url(#step-line-grad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 1.4, ease: 'easeInOut' }}
      />
      {[150, 450, 750].map((cx, i) => (
        <motion.circle
          key={cx}
          cx={cx}
          cy="12"
          r="5"
          fill="#0d0d10"
          stroke="#5b8def"
          strokeWidth="1.5"
          initial={reduceMotion ? { scale: 1 } : { scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.3, delay: 0.25 + i * 0.45 }}
          style={{ transformOrigin: `${cx}px 12px` }}
        />
      ))}
      <defs>
        <linearGradient id="step-line-grad" x1="0" y1="0" x2="900" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5b8def" />
          <stop offset="0.5" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function HowItWorks() {
  return (
    <section className="landing-section" id="how-it-works">
      <ScrollReveal className="landing-section-head">
        <span className="eyebrow">How it works</span>
        <h2>From repo to report in three steps.</h2>
      </ScrollReveal>

      <StepConnector />

      <ScrollRevealGroup className="steps-row" stagger={0.1}>
        {STEPS.map((s) => (
          <ScrollRevealItem className="step-card" key={s.step}>
            <span className="step-number">{s.step}</span>
            <h3>{s.title}</h3>
            <p>{s.description}</p>
          </ScrollRevealItem>
        ))}
      </ScrollRevealGroup>
    </section>
  );
}
