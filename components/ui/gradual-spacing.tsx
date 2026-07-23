'use client';

import { motion, useReducedMotion } from 'framer-motion';
import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Per-character reveal that still wraps like normal text.
 *
 * Characters are grouped into word wrappers so the line can only break at
 * real spaces — a flat list of per-character boxes lets the browser break
 * mid-word ("codebas / e"). Stagger is applied as an explicit per-index
 * delay rather than `staggerChildren`, because the word wrappers sit
 * between the container and the animated characters.
 */
export function GradualSpacing({
  text,
  className,
  duration = 0.4,
  staggerDelay = 0.05,
}: {
  text: string;
  className?: string;
  duration?: number;
  /** Delay between each character, in seconds. */
  staggerDelay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const lines = text.split('\n');

  if (reduceMotion) {
    return (
      <span className={cn('block', className)}>
        {lines.map((line, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {line}
          </React.Fragment>
        ))}
      </span>
    );
  }

  let charIndex = 0;

  return (
    <span className="block">
      {lines.map((line, lineIdx) => {
        const words = line.split(' ').filter(Boolean);

        return (
          <span key={lineIdx} className="block">
            {words.map((word, wordIdx) => (
              <React.Fragment key={wordIdx}>
                {/* Word wrapper keeps characters together; breaks happen at the
                    plain space text node between wrappers. */}
                <span className="inline-block whitespace-nowrap align-top">
                  {Array.from(word).map((char) => {
                    const i = charIndex++;
                    return (
                      <motion.span
                        key={i}
                        className={cn('inline-block', className)}
                        initial={{ opacity: 0, x: -18 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration,
                          delay: i * staggerDelay,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        style={{ willChange: 'transform, opacity' }}
                      >
                        {char}
                      </motion.span>
                    );
                  })}
                </span>
                {wordIdx < words.length - 1 && ' '}
              </React.Fragment>
            ))}
          </span>
        );
      })}
    </span>
  );
}
