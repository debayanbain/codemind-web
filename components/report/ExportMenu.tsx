'use client';

import { ChevronDown, Download, FileText, FileType2 } from 'lucide-react';
import { exportUrl } from '../../lib/api';

/**
 * Both formats come from the same stored report: `.md` keeps the diagram
 * sources (a readable, diffable text file), `.pdf` inlines the pre-rendered
 * SVGs. Native <details> so it closes on Escape and outside-click for free.
 */
export function ExportMenu({
  jobId,
  repoFullName,
}: {
  jobId: string;
  repoFullName: string;
}) {
  const filename = repoFullName.replace('/', '_');

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
        <a
          href={exportUrl(jobId, 'md')}
          download={`${filename}_report.md`}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-fg no-underline hover:bg-surface-2"
        >
          <FileText size={15} className="text-muted" />
          <span>
            Markdown
            <span className="block text-xs text-muted">
              Diagram source, diffable
            </span>
          </span>
        </a>
        <a
          href={exportUrl(jobId, 'pdf')}
          download={`${filename}_report.pdf`}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-fg no-underline hover:bg-surface-2"
        >
          <FileType2 size={15} className="text-muted" />
          <span>
            PDF
            <span className="block text-xs text-muted">
              Diagrams rendered inline
            </span>
          </span>
        </a>
      </div>
    </details>
  );
}
