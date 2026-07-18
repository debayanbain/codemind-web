'use client';

import { useEffect, useRef, useState } from 'react';
import { useClerk } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';
import { Logo } from '../Logo';
import type { Me } from '../../lib/types';

export function DashboardNav({ me }: { me: Me }) {
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Clear the Clerk session, then HARD-navigate home. The hard load (not Clerk's
  // soft `redirectUrl` push) is what resets the react-query cache, so getMe
  // re-runs, 401s, and the landing page shows. With the soft redirect the
  // dashboard kept its cached `me` and the UI looked still-signed-in, leaving
  // the button stuck on "Signing out…".
  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      // Session may already be invalid; navigate home regardless.
    }
    window.location.href = '/';
  }
  // Prefer a real name, then GitHub handle, then email — a Google-only user has
  // no githubUsername, so without this chain they'd render as the 'you' fallback.
  const username = me.name ?? me.githubUsername ?? me.email ?? 'you';
  const initial = username[0]?.toUpperCase() ?? '?';

  // Prefer the avatar stored at login; otherwise GitHub serves any user's
  // avatar at github.com/{username}.png — no backend/DB dependency.
  const avatarSrc =
    me.avatarUrl ??
    (me.githubUsername
      ? `https://github.com/${me.githubUsername}.png?size=80`
      : null);
  const showImg = avatarSrc && !imgError;

  // Close the account menu on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className="dash-nav">
      <div className="dash-nav-inner">
        <Logo className="h-8" />

        <div className="dash-account" ref={menuRef}>
          <button
            type="button"
            className="dash-account-btn"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {showImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="dash-avatar"
                src={avatarSrc}
                alt=""
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="dash-avatar dash-avatar-fallback">{initial}</span>
            )}
            <span className="dash-account-name">{username}</span>
          </button>

          {open && (
            <div className="dash-menu" role="menu">
              <div className="dash-menu-head">
                <div className="dash-menu-name">{username}</div>
                {me.email && <div className="dash-menu-sub">{me.email}</div>}
                {me.githubUsername && (
                  <div className="dash-menu-sub">@{me.githubUsername} · GitHub</div>
                )}
                {!me.email && !me.githubUsername && (
                  <div className="dash-menu-sub">Signed in</div>
                )}
              </div>
              <button
                type="button"
                role="menuitem"
                className="dash-menu-item"
                disabled={signingOut}
                onClick={handleSignOut}
              >
                <LogOut size={16} aria-hidden="true" />
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
