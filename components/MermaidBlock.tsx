'use client';

import { useEffect, useId, useRef, useState } from 'react';

let mermaidInitialized = false;

/**
 * Renders one mermaid code block to SVG client-side. The diagram source
 * itself comes straight from mermaid.builder.ts (synthesizer, pure TS) — this
 * component only renders it, never generates it.
 */
export function MermaidBlock({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, '-');
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const mermaid = (await import('mermaid')).default;
      if (!mermaidInitialized) {
        // 'strict' (the mermaid default, pinned explicitly here) runs the
        // rendered SVG through DOMPurify and disables click/script bindings —
        // diagram label text ultimately originates from LLM agent JSON, so
        // treat it as untrusted input even though mermaid.builder.ts only
        // emits diagram syntax, never raw HTML.
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'strict',
        });
        mermaidInitialized = true;
      }

      try {
        const { svg } = await mermaid.render(`mermaid-${id}`, chart);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return (
      <pre className="mermaid-block">Diagram failed to render: {error}</pre>
    );
  }

  return <div className="mermaid-block" ref={containerRef} />;
}
