'use client';

import { useState } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from 'motion/react';
import { Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Logo } from '../Logo';

const NAV_ITEMS: [string, string][] = [
  ['#agents', 'Agents'],
  ['#reports', 'Reports'],
  ['#how-it-works', 'How it works'],
];

export function Nav({ loginUrl }: { loginUrl: string }) {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setVisible(latest > 100);
  });

  return (
    <motion.div className="fixed inset-x-0 top-5 z-[100] w-full">
      <DesktopNav visible={visible} loginUrl={loginUrl} />
      <MobileNav visible={visible} loginUrl={loginUrl} />
    </motion.div>
  );
}

/* ----------------------------- Desktop ----------------------------- */

function DesktopNav({ visible, loginUrl }: { visible: boolean; loginUrl: string }) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <motion.div
      animate={{
        boxShadow: visible
          ? '0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.06)'
          : '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
        backgroundColor: visible ? 'rgba(13,13,16,0.75)' : 'rgba(13,13,16,0.35)',
        width: visible ? '46%' : '100%',
        y: visible ? 12 : 0,
      }}
      transition={{ type: 'spring', stiffness: 200, damping: 50 }}
      /* min-width must never exceed the viewport, otherwise the pill forces a
         horizontal scrollbar on small laptops / tablets. */
      style={{ minWidth: 'min(820px, calc(100vw - 3rem))' }}
      className={cn(
        'relative z-[60] mx-auto hidden max-w-[min(1160px,calc(100vw-3rem))] flex-row items-center justify-between gap-6',
        'rounded-full border border-white/10 px-4 py-2 backdrop-blur-xl lg:flex',
      )}
    >
      <a href="#top" className="relative z-20 inline-flex items-center no-underline">
        <Logo className="h-9" />
      </a>

      <nav
        onMouseLeave={() => setHovered(null)}
        className="absolute inset-0 flex flex-1 flex-row items-center justify-center gap-1 text-sm font-medium"
      >
        {NAV_ITEMS.map(([href, label], idx) => (
          <a
            key={href}
            href={href}
            onMouseEnter={() => setHovered(idx)}
            className="relative px-4 py-2 text-muted no-underline transition-colors duration-150 hover:text-fg"
          >
            {hovered === idx && (
              <motion.span
                layoutId="nav-hover-pill"
                className="absolute inset-0 h-full w-full rounded-full bg-white/10"
              />
            )}
            <span className="relative z-20">{label}</span>
          </a>
        ))}
      </nav>

      <a className="btn btn-sm relative z-20" href={loginUrl}>
        Log in
      </a>
    </motion.div>
  );
}

/* ----------------------------- Mobile ----------------------------- */

function MobileNav({ visible, loginUrl }: { visible: boolean; loginUrl: string }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      animate={{
        boxShadow: visible
          ? '0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.06)'
          : '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
        backgroundColor: visible ? 'rgba(13,13,16,0.8)' : 'rgba(13,13,16,0.4)',
        width: visible ? '92%' : '100%',
        borderRadius: open ? '18px' : '9999px',
        y: visible ? 12 : 0,
      }}
      transition={{ type: 'spring', stiffness: 200, damping: 50 }}
      className={cn(
        'relative z-50 mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-between',
        'border border-white/10 px-4 py-2 backdrop-blur-xl lg:hidden',
      )}
    >
      <div className="flex w-full flex-row items-center justify-between">
        <a href="#top" className="inline-flex items-center no-underline">
          <Logo className="h-8" />
        </a>
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-md text-fg"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 top-16 z-50 flex w-full flex-col items-start gap-1 rounded-2xl border border-white/10 bg-[rgba(13,13,16,0.95)] px-4 py-4 shadow-2xl backdrop-blur-xl"
          >
            {NAV_ITEMS.map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-sm text-muted no-underline transition-colors hover:bg-white/5 hover:text-fg"
              >
                {label}
              </a>
            ))}
            <a
              className="btn btn-sm mt-2 w-full justify-center"
              href={loginUrl}
              onClick={() => setOpen(false)}
            >
              Log in
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
