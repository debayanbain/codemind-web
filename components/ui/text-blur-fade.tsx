'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import * as React from 'react';

export function TextBlurFade({
  text,
  className,
  duration = 0.6,
  staggerDelay = 0.03,
  delay = 0,
}: {
  text: string;
  className?: string;
  duration?: number;
  staggerDelay?: number;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const words = text.split(/\s+/);

  const container: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduceMotion ? 0 : staggerDelay,
        delayChildren: delay,
      },
    },
  };

  const child: Variants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(10px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration, ease: [0.2, 0.6, 0.2, 1] },
    },
  };

  if (reduceMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <motion.span
      className="inline-flex flex-wrap justify-center"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, i) => (
        <React.Fragment key={i}>
          <motion.span
            variants={child}
            className={className}
            style={{ display: 'inline-block', willChange: 'transform, opacity, filter' }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && ' '}
        </React.Fragment>
      ))}
    </motion.span>
  );
}
