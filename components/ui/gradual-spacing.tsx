'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import * as React from 'react';

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
  const chars = text.split('');

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: reduceMotion ? 0 : staggerDelay },
    },
  };

  const child: Variants = {
    hidden: { opacity: 0, x: -18 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <motion.span
      className="flex flex-wrap justify-center"
      variants={container}
      initial={reduceMotion ? false : 'hidden'}
      animate="visible"
    >
      {chars.map((char, i) => {
        if (char === '\n') {
          return <span key={`br-${i}`} className="basis-full" />;
        }
        return (
          <motion.span
            key={i}
            variants={child}
            className={className}
            style={{ willChange: 'transform, opacity' }}
          >
            {char === ' ' ? ' ' : char}
          </motion.span>
        );
      })}
    </motion.span>
  );
}
