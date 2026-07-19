import type { CSSProperties, ReactNode } from 'react';

/**
 * Reusable skeleton loader kit. Sits on the global `.skeleton` class (frosted
 * block + shimmer sweep, already reduced-motion aware), so every placeholder in
 * the app shares one look and one animation.
 *
 * Usage:
 *   <Skeleton height={40} />                     // a bar
 *   <Skeleton circle width={44} />               // an avatar
 *   <SkeletonText lines={3} />                    // paragraph
 *   <SkeletonScreen label="Loading repositories"> // a11y wrapper (announces once)
 *     ...bars...
 *   </SkeletonScreen>
 *
 * Individual bars are `aria-hidden` — wrap a loading region in <SkeletonScreen>
 * (or set role="status" yourself) so screen readers hear "Loading" once, not a
 * stream of empty boxes.
 */

const dim = (v?: number | string) => (typeof v === 'number' ? `${v}px` : v);

export interface SkeletonProps {
  /** Extra classes (Tailwind sizing, margins, etc.). */
  className?: string;
  width?: number | string;
  height?: number | string;
  /** Corner radius. Ignored when `circle`. Defaults to the `.skeleton` 1rem. */
  radius?: number | string;
  /** Render a circle (avatar/dot). Uses `width` for both dimensions if `height` is unset. */
  circle?: boolean;
  style?: CSSProperties;
}

/** A single shimmering placeholder block. */
export function Skeleton({
  className = '',
  width,
  height,
  radius,
  circle = false,
  style,
}: SkeletonProps) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      aria-hidden="true"
      style={{
        display: 'block',
        width: dim(width),
        height: dim(height) ?? (circle ? dim(width) : undefined),
        borderRadius: circle ? '9999px' : dim(radius),
        ...style,
      }}
    />
  );
}

export interface SkeletonTextProps {
  /** Number of lines. */
  lines?: number;
  className?: string;
  /** Width of the final (short) line. */
  lastLineWidth?: number | string;
  /** Line height in px. */
  lineHeight?: number;
  /** Gap between lines in px. */
  gap?: number;
}

/** A paragraph of text lines; the last line is shortened for realism. */
export function SkeletonText({
  lines = 3,
  className = '',
  lastLineWidth = '60%',
  lineHeight = 12,
  gap = 8,
}: SkeletonTextProps) {
  return (
    <div className={className} style={{ display: 'grid', gap }} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          radius={6}
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

export interface SkeletonScreenProps {
  /** Announced to screen readers while loading. */
  label?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * A11y wrapper for a loading region: marks it `role="status" aria-busy` and
 * announces `label` once via a visually-hidden line, so the shimmer bars inside
 * stay silent for assistive tech.
 */
export function SkeletonScreen({
  label = 'Loading',
  className,
  style,
  children,
}: SkeletonScreenProps) {
  return (
    <div role="status" aria-busy="true" className={className} style={style}>
      {children}
      <span className="sr-only">{label}…</span>
    </div>
  );
}
