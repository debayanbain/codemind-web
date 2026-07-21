'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

export interface NavSection {
  id: string;
  label: string;
  /** Rendered right-aligned — a count, a score, whatever the section is about. */
  badge?: string;
}

/**
 * Scrollspy that tracks which section owns the top of the viewport. Uses
 * IntersectionObserver rather than a scroll listener so it costs nothing per
 * frame, with a rootMargin that treats "just under the sticky header" as the
 * active line.
 */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // Document order wins when several sections straddle the band, so the
        // highlight never jumps backwards while scrolling down.
        const first = ids.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      { rootMargin: '-96px 0px -65% 0px', threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

export function SectionNav({ sections }: { sections: NavSection[] }) {
  const active = useActiveSection(sections.map((s) => s.id));

  return (
    <nav aria-label="Report sections" className="lg:sticky lg:top-20 z-20">
      {/* Mobile: a horizontally scrollable chip rail. Desktop: a rail of rows. */}
      <ul className="m-0 flex list-none gap-1.5 overflow-x-auto p-0 lg:flex-col lg:overflow-visible">
        {sections.map((section) => {
          const isActive = section.id === active;
          return (
            <li key={section.id} className="shrink-0 lg:shrink">
              <a
                href={`#${section.id}`}
                aria-current={isActive ? 'location' : undefined}
                className={cn(
                  'flex items-center justify-between gap-3 whitespace-nowrap rounded-xl border px-3.5 py-2.5 text-sm font-poppins no-underline transition-all duration-150',
                  isActive
                    ? 'border-glow-blue/40 bg-surface-2/90 text-fg font-medium shadow-sm translate-x-0.5'
                    : 'border-transparent text-muted hover:bg-surface-2/50 hover:text-fg',
                )}
              >
                <span className="flex items-center gap-2">
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-glow-blue" />
                  )}
                  {section.label}
                </span>
                {section.badge && (
                  <span
                    className={cn(
                      'font-mono text-xs tabular-nums px-1.5 py-0.5 rounded-md',
                      isActive
                        ? 'bg-glow-blue/15 text-glow-blue font-medium'
                        : 'bg-surface-2 text-muted',
                    )}
                  >
                    {section.badge}
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
