// Deterministic, zero-network repo card artwork.
//
// Every card gets a flat abstract "hero background" built entirely from inline
// SVG — no image request, no external service, no per-repo generation cost.
// Both the *pattern* (mountains, waves, bubbles, rings, isometric, low-poly,
// blobs, mesh, ribbons) and the *palette* are seeded from the repo identity,
// so different repos get genuinely different patterns in different colors — not
// the same shape recolored. Same repo always renders the same art.

export type Palette = {
  bgFrom: string;
  bgTo: string;
  primary: string;
  secondary: string;
  ink: string;
};

export type PatternType =
  | 'peaks'
  | 'waves'
  | 'bubbles'
  | 'rings'
  | 'iso'
  | 'lowpoly'
  | 'blobs'
  | 'mesh'
  | 'ribbons';

export type RepoScene = {
  pattern: PatternType;
  palette: Palette;
  seed: number; // geometry stream seed for the renderer
};

// viewBox is 16:9 to match the card media aspect ratio.
export const SCENE_W = 160;
export const SCENE_H = 90;

const PATTERNS: PatternType[] = [
  'peaks',
  'waves',
  'bubbles',
  'rings',
  'iso',
  'lowpoly',
  'blobs',
  'mesh',
  'ribbons',
];

// Soft pastel grounds with a matching mid-tone accent set. One is picked per
// repo by seed, so the wall of cards reads as varied but coherent.
const PALETTES: Palette[] = [
  { bgFrom: '#efeafe', bgTo: '#e2d9fb', primary: '#7c6cf0', secondary: '#a99cf5', ink: '#5a49cf' },
  { bgFrom: '#e7f7f0', bgTo: '#d3efe2', primary: '#2fb389', secondary: '#7ed3b4', ink: '#1f8f6c' },
  { bgFrom: '#e9f2fe', bgTo: '#d7e6fd', primary: '#4b8ef0', secondary: '#8fbaf6', ink: '#356fc9' },
  { bgFrom: '#fdf4e5', bgTo: '#f9e8cd', primary: '#eaa63e', secondary: '#f3ca7d', ink: '#c9821e' },
  { bgFrom: '#fdedee', bgTo: '#fbdcde', primary: '#ec6a72', secondary: '#f3a2a7', ink: '#cf4a53' },
  { bgFrom: '#e5f5f4', bgTo: '#d0ece9', primary: '#2eb3ab', secondary: '#7fd0ca', ink: '#1e908a' },
  { bgFrom: '#ebecfe', bgTo: '#dcdefc', primary: '#6472f0', secondary: '#9aa4f6', ink: '#4a58d4' },
  { bgFrom: '#fdefe8', bgTo: '#fbddce', primary: '#f0864b', secondary: '#f6b58f', ink: '#d3672c' },
  { bgFrom: '#eefcf3', bgTo: '#dcf6e6', primary: '#22b07a', secondary: '#8ad9b4', ink: '#178a5f' },
  { bgFrom: '#fef1f7', bgTo: '#fbdcec', primary: '#e8559b', secondary: '#f3a1c9', ink: '#c93b7c' },
];

// FNV-1a 32-bit — cheap, stable, well-distributed for short strings.
function hashSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32 — small, fast, deterministic PRNG. Returns [0, 1).
export function seededRand(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Choose a pattern + palette for a repo. `key` should be a stable repo
 * identifier (owner/name). Same key always yields the same choice, and the
 * returned `seed` drives the geometry so the pattern's internals vary per repo.
 */
export function buildRepoScene(key: string): RepoScene {
  const base = hashSeed(key);
  const pick = seededRand(base);
  const pattern = PATTERNS[Math.floor(pick() * PATTERNS.length)];
  const palette = PALETTES[Math.floor(pick() * PALETTES.length)];
  // Offset the geometry stream so it's independent of the selection stream.
  return { pattern, palette, seed: (base ^ 0x9e3779b9) >>> 0 };
}
