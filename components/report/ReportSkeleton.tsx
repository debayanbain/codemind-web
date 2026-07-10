'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Shown in the window between job:complete and the report refetch landing —
 * mirrors the ReportDashboard layout (KPI row, section nav, section cards) so
 * the real content fades in over the same silhouette instead of popping.
 */
export function ReportSkeleton() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, filter: 'blur(8px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.35 }}
      className="grid gap-6"
      role="status"
      aria-label="Loading report"
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-27" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
        {/* Section nav */}
        <div className="hidden gap-1.5 lg:grid">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="skeleton h-9 rounded-lg" />
          ))}
        </div>

        {/* Section cards */}
        <div className="grid min-w-0 gap-6">
          <div className="skeleton h-72 rounded-2xl" />
          <div className="skeleton h-96 rounded-2xl" />
          <div className="skeleton h-72 rounded-2xl" />
        </div>
      </div>

      <span className="sr-only">Synthesizing report…</span>
    </motion.div>
  );
}
