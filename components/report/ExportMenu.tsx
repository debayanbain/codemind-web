'use client';

import { useState } from 'react';
import { ChevronDown, Download, FileText, FileType2 } from 'lucide-react';
import { downloadExport } from '../../lib/api';

/**
 * Both formats come from the same stored report: `.md` keeps the diagram
 * sources (a readable, diffable text file), `.pdf` inlines the pre-rendered
 * SVGs. Native <details> so it closes on Escape and outside-click for free.
 *
 * The export route is auth-guarded and cross-origin, so it's fetched with the
 * Clerk token and downloaded from a blob — a plain link would arrive
 * unauthenticated and 401.
 */
export function ExportMenu({
  jobId,
  repoFullName,
}: {
  jobId: string;
  repoFullName: string;
}) {
  const filename = repoFullName.replace('/', '_');
  const [busy, setBusy] = useState<null | 'md' | 'pdf'>(null);
  const [error, setError] = useState(false);

  async function download(format: 'md' | 'pdf') {
    setBusy(format);
    setError(false);
    try {
      await downloadExport(jobId, format, `${filename}_report.${format}`);
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <details className="group relative">
      <summary className="btn btn-secondary cursor-pointer list-none text-sm [&::-webkit-details-marker]:hidden">
        <Download size={15} /> Export
        <ChevronDown
          size={14}
          className="transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)]">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => download('md')}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-fg hover:bg-surface-2 disabled:opacity-60"
        >
          <FileText size={15} className="text-muted" />
          <span>
            {busy === 'md' ? 'Preparing…' : 'Markdown'}
            <span className="block text-xs text-muted">
              Diagram source, diffable
            </span>
          </span>
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => download('pdf')}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-fg hover:bg-surface-2 disabled:opacity-60"
        >
          <FileType2 size={15} className="text-muted" />
          <span>
            {busy === 'pdf' ? 'Preparing…' : 'PDF'}
            <span className="block text-xs text-muted">
              Diagrams rendered inline
            </span>
          </span>
        </button>
        {error && (
          <p className="px-3 py-1.5 text-xs text-accent" role="alert">
            Export failed — try again.
          </p>
        )}
      </div>
    </details>
  );
}
