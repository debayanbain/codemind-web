'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Link2, Loader2, Share2, X } from 'lucide-react';
import { shareUrl } from '../../lib/api';
import {
  useCreateShareLinkMutation,
  useRevokeShareLinkMutation,
  useShareLinkQuery,
} from '../../lib/queries';

export function ShareDialog({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // <dialog> only traps focus and renders the ::backdrop when opened via
  // showModal(), which React can't do declaratively.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary text-sm"
        onClick={() => setOpen(true)}
      >
        <Share2 size={15} /> Share
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        // Clicking the backdrop (the dialog element itself, outside its child)
        // dismisses — matches every other modal on the web.
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false);
        }}
        className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-fg backdrop:bg-black/60 backdrop:backdrop-blur-sm"
        aria-labelledby="share-dialog-title"
      >
        {open && <ShareDialogBody jobId={jobId} onClose={() => setOpen(false)} />}
      </dialog>
    </>
  );
}

function ShareDialogBody({
  jobId,
  onClose,
}: {
  jobId: string;
  onClose: () => void;
}) {
  const { data: link, isLoading } = useShareLinkQuery(jobId, true);
  const createLink = useCreateShareLinkMutation(jobId);
  const revokeLink = useRevokeShareLinkMutation(jobId);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const url = link ? shareUrl(link.token) : null;

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };

  return (
    <div className="p-5">
      <div className="mb-1 flex items-center justify-between gap-4">
        <h2
          id="share-dialog-title"
          className="m-0 flex items-center gap-2 text-base font-semibold"
        >
          <Link2 size={17} className="text-glow-blue" /> Share this report
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-transparent text-muted hover:bg-surface-2 hover:text-fg"
        >
          <X size={16} />
        </button>
      </div>

      <p className="mb-5 mt-0 text-sm leading-relaxed text-muted">
        Anyone with the link must sign in to CodeMind to open it. They get a
        read-only view — they can&apos;t re-run or delete the analysis.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 py-3 text-sm text-muted">
          <Loader2 size={15} className="animate-spin" /> Checking for an
          existing link...
        </div>
      ) : url ? (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-2 pl-3">
            <input
              readOnly
              value={url}
              aria-label="Share link"
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 border-0 bg-transparent font-mono text-xs text-fg outline-none"
            />
            <button
              type="button"
              onClick={() => void copy()}
              className="btn btn-secondary shrink-0 px-3 py-1.5 text-xs"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-glow-green" /> Copied
                </>
              ) : (
                <>
                  <Copy size={13} /> Copy
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => revokeLink.mutate()}
            disabled={revokeLink.isPending}
            aria-busy={revokeLink.isPending}
            className="mt-4 cursor-pointer bg-transparent p-0 text-xs text-muted underline underline-offset-4 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {revokeLink.isPending
              ? 'Revoking...'
              : 'Revoke link — anyone holding it loses access'}
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn w-full text-sm"
          onClick={() => createLink.mutate()}
          disabled={createLink.isPending}
          aria-busy={createLink.isPending}
        >
          {createLink.isPending ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Link2 size={15} />
          )}
          {createLink.isPending ? 'Creating link...' : 'Create share link'}
        </button>
      )}

      {(createLink.isError || revokeLink.isError) && (
        <p className="mb-0 mt-3 font-mono text-xs text-accent" aria-live="polite">
          {(createLink.error ?? revokeLink.error)?.message}
        </p>
      )}
    </div>
  );
}
