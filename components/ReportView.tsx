'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { RenderedDiagram } from '../lib/types';
import { MermaidBlock } from './MermaidBlock';
import { DiagramFigure } from './report/primitives';

/**
 * The synthesizer stores diagram *sources* in the Markdown, tagged with a slug:
 *
 * ```d2 architecture-modules
 * m_api -> m_db
 * ```
 *
 * and ships the SVG it already rendered from each one alongside, in
 * `report.diagrams`. Rendering that fence as a code block — which is what this
 * component did before `diagrams` existed — shows the reader D2 source instead
 * of a diagram. So we match on the fence's slug and swap in the SVG, the same
 * substitution `inlineDiagrams()` performs for the PDF export.
 */
export function ReportView({
  markdown,
  diagrams = [],
}: {
  markdown: string;
  diagrams?: RenderedDiagram[];
}) {
  const bySlug = new Map(diagrams.map((d) => [d.slug, d]));

  return (
    <div className="report">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { className, children, node, ...rest } = props;
            const language = /language-(\w+)/.exec(className ?? '')?.[1];
            const raw = Array.isArray(children)
              ? children.join('')
              : (children as string);
            const text = raw.replace(/\n$/, '');

            if (language === 'd2' || language === 'chart') {
              // The slug rides in the fence's info string after the language,
              // which mdast exposes as `node.data.meta`.
              const slug = String(node?.data?.meta ?? '').trim();
              const diagram = bySlug.get(slug);
              if (diagram) return <DiagramFigure diagram={diagram} />;
              // No matching SVG (an old report, or a diagram that never
              // rendered): fall through to a code block rather than drop the
              // source on the floor.
            }

            // Reports generated before the D2 migration still carry Mermaid.
            if (language === 'mermaid') {
              return <MermaidBlock chart={text} />;
            }

            return (
              <code className={className} {...rest}>
                {children}
              </code>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
