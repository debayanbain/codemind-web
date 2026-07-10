import { memo, useId, useMemo, type ReactNode } from 'react';
import {
  buildRepoScene,
  seededRand,
  SCENE_H,
  SCENE_W,
  type Palette,
  type PatternType,
} from '../../lib/repo-visual';

type Props = {
  /** Stable, globally-unique repo key (owner/name). Seeds the whole scene. */
  repoKey: string;
  className?: string;
};

const WHITE = '#ffffff';
type Rand = () => number;

/**
 * Zero-network repo card artwork: a flat abstract hero-background generated as
 * inline SVG. Both the pattern and palette are seeded from the repo identity,
 * so different repos get different patterns in different colors. No image
 * request, no external service — renders instantly, scales to any card count.
 * Memoized because the same repo always produces the same scene.
 */
export const RepoBackground = memo(function RepoBackground({
  repoKey,
  className,
}: Props) {
  const scene = useMemo(() => buildRepoScene(repoKey), [repoKey]);
  const p = scene.palette;
  const uid = useId().replace(/:/g, '');
  const bg = `bg-${uid}`;
  const glow = `gl-${uid}`;

  const art = useMemo(
    () => renderPattern(scene.pattern, p, seededRand(scene.seed)),
    [scene.pattern, p, scene.seed],
  );

  return (
    <svg
      className={className}
      viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor={p.bgFrom} />
          <stop offset="100%" stopColor={p.bgTo} />
        </linearGradient>
        <radialGradient id={glow} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={SCENE_W} height={SCENE_H} fill={`url(#${bg})`} />
      <rect width={SCENE_W} height={SCENE_H} fill={`url(#${glow})`} />
      {art}
    </svg>
  );
});

function renderPattern(type: PatternType, p: Palette, r: Rand): ReactNode {
  switch (type) {
    case 'peaks':
      return <Peaks p={p} r={r} />;
    case 'waves':
      return <Waves p={p} r={r} />;
    case 'bubbles':
      return <Bubbles p={p} r={r} />;
    case 'rings':
      return <Rings p={p} r={r} />;
    case 'iso':
      return <Iso p={p} r={r} />;
    case 'lowpoly':
      return <LowPoly p={p} r={r} />;
    case 'blobs':
      return <Blobs p={p} r={r} />;
    case 'mesh':
      return <Mesh p={p} r={r} />;
    default:
      return <Ribbons p={p} r={r} />;
  }
}

const between = (r: Rand, lo: number, hi: number) => lo + r() * (hi - lo);
const pick = <T,>(r: Rand, arr: T[]): T => arr[Math.floor(r() * arr.length)];

/** A seeded 4-point sparkle + orb, shared by several patterns. */
function Decor({ p, r }: { p: Palette; r: Rand }) {
  const sx = between(r, 128, 146);
  const sy = between(r, 16, 34);
  const s = between(r, 0.7, 1.3);
  return (
    <g>
      <path
        transform={`translate(${sx} ${sy}) scale(${s})`}
        d="M0 -3.4 L1 -1 L3.4 0 L1 1 L0 3.4 L-1 1 L-3.4 0 L-1 -1 Z"
        fill={p.primary}
        opacity={0.85}
      />
      <circle cx={between(r, 12, 24)} cy={between(r, 60, 76)} r={between(r, 1.6, 3)} fill={p.primary} opacity={0.6} />
    </g>
  );
}

/* ── Patterns ─────────────────────────────────────────────────────────────
   Each is procedurally varied from the seeded `r`, so no two repos share a
   layout. Coordinates live in the 160×90 viewBox. */

function Peaks({ p, r }: { p: Palette; r: Rand }) {
  const hy = between(r, 58, 64);
  const sunLeft = r() < 0.5;
  const sun = { x: sunLeft ? between(r, 20, 36) : between(r, 116, 142), y: between(r, 14, 26), r: between(r, 8, 13) };
  const count = 2 + Math.floor(r() * 3);
  const step = 100 / count;
  const raw = Array.from({ length: count }, (_, i) => ({
    cx: 30 + step * (i + 0.5) + (r() - 0.5) * step * 0.7,
    peakY: between(r, 22, 44),
    halfW: between(r, 26, 44),
    facet: r() < 0.5 ? 1 : -1,
  })).sort((a, b) => b.halfW - a.halfW);

  return (
    <g>
      <circle cx={sun.x} cy={sun.y} r={sun.r} fill={WHITE} opacity={0.5} />
      <circle cx={sun.x} cy={sun.y} r={sun.r} fill={p.secondary} opacity={0.22} />
      {raw.map((m, i) => {
        const front = i === raw.length - 1;
        const lx = m.cx - m.halfW;
        const rx = m.cx + m.halfW;
        return (
          <g key={i} opacity={count === 1 ? 1 : 0.55 + 0.45 * (i / (count - 1))}>
            <polygon points={`${lx},${hy} ${m.cx},${m.peakY} ${rx},${hy}`} fill={front ? p.primary : p.secondary} />
            <polygon
              points={m.facet === 1 ? `${m.cx},${m.peakY} ${m.cx},${hy} ${rx},${hy}` : `${m.cx},${m.peakY} ${m.cx},${hy} ${lx},${hy}`}
              fill="#000000"
              opacity={0.1}
            />
          </g>
        );
      })}
      <rect x={between(r, 20, 28)} y={hy - 1.6} width={between(r, 104, 114)} height={3.2} rx={1.6} fill={WHITE} opacity={0.5} />
    </g>
  );
}

function Waves({ p, r }: { p: Palette; r: Rand }) {
  const bands = 3 + Math.floor(r() * 2);
  const colors = [p.secondary, p.primary, p.ink];
  return (
    <g>
      {Array.from({ length: bands }, (_, i) => {
        const baseY = 40 + i * (46 / bands);
        const a1 = between(r, 6, 14);
        const a2 = between(r, 6, 14);
        const d = `M0 ${baseY} C 40 ${baseY - a1} 60 ${baseY + a2} 90 ${baseY - a2 * 0.5} S 150 ${baseY + a1} 160 ${baseY - a1 * 0.4} L160 90 L0 90 Z`;
        return <path key={i} d={d} fill={colors[i % colors.length]} opacity={0.35 + 0.5 * (i / bands)} />;
      })}
      <Decor p={p} r={r} />
    </g>
  );
}

function Bubbles({ p, r }: { p: Palette; r: Rand }) {
  const n = 9 + Math.floor(r() * 6);
  const colors = [p.primary, p.secondary, WHITE, p.ink];
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const cx = between(r, 12, 148);
        const cy = between(r, 12, 78);
        const rad = between(r, 3, 14);
        const c = pick(r, colors);
        const ring = r() < 0.25;
        return ring ? (
          <circle key={i} cx={cx} cy={cy} r={rad} fill="none" stroke={c} strokeWidth={1.6} opacity={0.5} />
        ) : (
          <circle key={i} cx={cx} cy={cy} r={rad} fill={c} opacity={between(r, 0.28, 0.7)} />
        );
      })}
    </g>
  );
}

function Rings({ p, r }: { p: Palette; r: Rand }) {
  const cx = r() < 0.5 ? between(r, 12, 40) : between(r, 120, 148);
  const cy = between(r, 14, 40);
  const n = 5 + Math.floor(r() * 3);
  const gap = between(r, 9, 13);
  const colors = [p.primary, p.secondary];
  return (
    <g>
      <circle cx={cx} cy={cy} r={gap * 0.8} fill={p.primary} opacity={0.7} />
      {Array.from({ length: n }, (_, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={gap * (i + 1.6)}
          fill="none"
          stroke={colors[i % 2]}
          strokeWidth={between(r, 1.6, 3)}
          opacity={0.5 - i * 0.05}
        />
      ))}
      <Decor p={p} r={r} />
    </g>
  );
}

function Iso({ p, r }: { p: Palette; r: Rand }) {
  const cube = (cx: number, cy: number, s: number, top: string, left: string, right: string, key: number) => (
    <g key={key}>
      <path d={`M${cx} ${cy - s} L${cx + s * 1.4} ${cy - s * 0.3} L${cx} ${cy + s * 0.4} L${cx - s * 1.4} ${cy - s * 0.3} Z`} fill={top} />
      <path d={`M${cx - s * 1.4} ${cy - s * 0.3} L${cx} ${cy + s * 0.4} L${cx} ${cy + s * 1.6} L${cx - s * 1.4} ${cy + s * 0.9} Z`} fill={left} />
      <path d={`M${cx + s * 1.4} ${cy - s * 0.3} L${cx} ${cy + s * 0.4} L${cx} ${cy + s * 1.6} L${cx + s * 1.4} ${cy + s * 0.9} Z`} fill={right} />
    </g>
  );
  const n = 3 + Math.floor(r() * 3);
  const cubes = Array.from({ length: n }, (_, i) => ({
    cx: between(r, 44, 116),
    cy: between(r, 30, 58),
    s: between(r, 6, 11),
    shade: Math.floor(r() * 3),
  })).sort((a, b) => a.cy - b.cy);
  const shades: [string, string, string][] = [
    [WHITE, p.secondary, p.primary],
    [p.secondary, p.primary, p.ink],
    [p.primary, p.ink, p.secondary],
  ];
  return (
    <g>
      <path d="M80 78 L128 54 L80 30 L32 54 Z" fill={p.secondary} opacity={0.25} />
      {cubes.map((c, i) => {
        const [t, l, rr] = shades[c.shade];
        return cube(c.cx, c.cy, c.s, t, l, rr, i);
      })}
      <Decor p={p} r={r} />
    </g>
  );
}

function LowPoly({ p, r }: { p: Palette; r: Rand }) {
  const cols = 6;
  const rows = 4;
  const cw = SCENE_W / cols;
  const ch = SCENE_H / rows;
  // Jittered lattice of points.
  const pts: { x: number; y: number }[][] = [];
  for (let y = 0; y <= rows; y++) {
    const row: { x: number; y: number }[] = [];
    for (let x = 0; x <= cols; x++) {
      const edge = x === 0 || y === 0 || x === cols || y === rows;
      row.push({
        x: x * cw + (edge ? 0 : (r() - 0.5) * cw * 0.7),
        y: y * ch + (edge ? 0 : (r() - 0.5) * ch * 0.7),
      });
    }
    pts.push(row);
  }
  const shades = [p.primary, p.secondary, p.ink, WHITE];
  const tris: ReactNode[] = [];
  let k = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const a = pts[y][x];
      const b = pts[y][x + 1];
      const c = pts[y + 1][x];
      const d = pts[y + 1][x + 1];
      const o1 = between(r, 0.25, 0.7);
      const o2 = between(r, 0.25, 0.7);
      tris.push(<polygon key={k++} points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}`} fill={pick(r, shades)} opacity={o1} />);
      tris.push(<polygon key={k++} points={`${b.x},${b.y} ${d.x},${d.y} ${c.x},${c.y}`} fill={pick(r, shades)} opacity={o2} />);
    }
  }
  return <g>{tris}</g>;
}

function Blobs({ p, r }: { p: Palette; r: Rand }) {
  const blob = (cx: number, cy: number, rad: number, fill: string, op: number, key: number) => {
    const verts = 8;
    const pts = Array.from({ length: verts }, (_, i) => {
      const ang = (i / verts) * Math.PI * 2;
      const rr = rad * between(r, 0.72, 1.28);
      return { x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr };
    });
    const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    let d = `M ${mid(pts[verts - 1], pts[0]).x} ${mid(pts[verts - 1], pts[0]).y}`;
    for (let i = 0; i < verts; i++) {
      const m = mid(pts[i], pts[(i + 1) % verts]);
      d += ` Q ${pts[i].x} ${pts[i].y} ${m.x} ${m.y}`;
    }
    d += ' Z';
    return <path key={key} d={d} fill={fill} opacity={op} />;
  };
  const specs: [number, number, number, string][] = [
    [between(r, 44, 70), between(r, 30, 52), between(r, 24, 34), p.secondary],
    [between(r, 84, 116), between(r, 34, 56), between(r, 22, 32), p.primary],
    [between(r, 60, 100), between(r, 20, 40), between(r, 16, 24), WHITE],
  ];
  return (
    <g>
      {specs.map((s, i) => blob(s[0], s[1], s[2], s[3], i === 2 ? 0.4 : 0.55, i))}
      <Decor p={p} r={r} />
    </g>
  );
}

function Mesh({ p, r }: { p: Palette; r: Rand }) {
  const cols = 5;
  const rows = 3;
  const cw = SCENE_W / (cols - 1);
  const ch = SCENE_H / (rows - 1);
  const nodes: { x: number; y: number }[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      nodes.push({ x: x * cw + (r() - 0.5) * cw * 0.5, y: y * ch + (r() - 0.5) * ch * 0.5 });
    }
  }
  const idx = (x: number, y: number) => y * cols + x;
  const lines: ReactNode[] = [];
  let k = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const a = nodes[idx(x, y)];
      if (x < cols - 1 && r() < 0.8) {
        const b = nodes[idx(x + 1, y)];
        lines.push(<line key={k++} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={p.primary} strokeWidth={0.6} opacity={0.3} />);
      }
      if (y < rows - 1 && r() < 0.7) {
        const b = nodes[idx(x, y + 1)];
        lines.push(<line key={k++} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={p.primary} strokeWidth={0.6} opacity={0.25} />);
      }
    }
  }
  return (
    <g>
      {lines}
      {nodes.map((nd, i) => (
        <circle key={`n${i}`} cx={nd.x} cy={nd.y} r={between(r, 1.4, 3)} fill={i % 4 === 0 ? p.primary : p.secondary} opacity={0.85} />
      ))}
    </g>
  );
}

function Ribbons({ p, r }: { p: Palette; r: Rand }) {
  const n = 3 + Math.floor(r() * 2);
  const colors = [p.secondary, p.primary, p.ink];
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const y = between(r, 14, 70);
        const a = between(r, 8, 20);
        const w = between(r, 6, 12);
        const d = `M-10 ${y} C 40 ${y - a} 90 ${y + a} 170 ${y - a * 0.4}`;
        return (
          <path key={i} d={d} fill="none" stroke={colors[i % colors.length]} strokeWidth={w} strokeLinecap="round" opacity={0.3 + 0.4 * (i / n)} />
        );
      })}
      <Decor p={p} r={r} />
    </g>
  );
}
