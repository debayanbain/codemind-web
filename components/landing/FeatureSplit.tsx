'use client';

import type { ReactNode } from 'react';
import { ScrollReveal } from './ScrollReveal';

export function FeatureSplit({
  id,
  eyebrow,
  title,
  description,
  bullets,
  visual,
  reverse = false,
  accent = 'blue-purple',
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets?: string[];
  visual: ReactNode;
  reverse?: boolean;
  accent?: 'blue-purple' | 'teal' | 'red-purple';
}) {
  return (
    <section className="landing-section" id={id}>
      <div className={`feature-split ${reverse ? 'feature-split-reverse' : ''}`}>
        <ScrollReveal className="feature-split-copy">
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
          {bullets && (
            <ul className="feature-split-bullets">
              {bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
        </ScrollReveal>

        <ScrollReveal className="feature-split-visual" delay={0.1}>
          <div className={`glass-panel glass-panel-${accent}`}>{visual}</div>
        </ScrollReveal>
      </div>
    </section>
  );
}
