'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidBlock } from './MermaidBlock';

export function ReportView({ markdown }: { markdown: string }) {
  return (
    <div className="report">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { className, children, ...rest } = props;
            const match = /language-(\w+)/.exec(className ?? '');
            const raw = Array.isArray(children)
              ? children.join('')
              : (children as string);
            const text = raw.replace(/\n$/, '');

            if (match?.[1] === 'mermaid') {
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
