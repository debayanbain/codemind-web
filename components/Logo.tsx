import { cn } from '../lib/utils';

/**
 * CodeMind horizontal logo (mark + wordmark + tagline).
 * Served from /public/codemind_logo_horizontal.svg. Aspect ratio ~3.4:1.
 */
export function Logo({
  className,
  alt = 'CodeMind',
}: {
  className?: string;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/codemind_logo_horizontal.svg"
      alt={alt}
      className={cn('block h-8 w-auto select-none', className)}
      draggable={false}
    />
  );
}
