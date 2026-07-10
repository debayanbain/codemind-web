// Maps a GitHub language name to its brand glyph (path + official hex) from
// simple-icons. Named imports keep this tree-shakeable — only the languages
// listed here get bundled. Unknown languages fall back to a plain dot.
import {
  siPython,
  siJavascript,
  siTypescript,
  siGo,
  siRust,
  siHtml5,
  siCss,
  siSass,
  siPhp,
  siRuby,
  siSwift,
  siKotlin,
  siCplusplus,
  siC,
  siSharp,
  siOpenjdk,
  siDocker,
  siGnubash,
  siVuedotjs,
  siDart,
  siLua,
  siElixir,
  siScala,
  siHaskell,
  siPerl,
  siJulia,
  siR,
  siClojure,
  siSolidity,
  siJupyter,
  siMake,
  siZig,
  type SimpleIcon,
} from 'simple-icons';

export type TechIcon = { path: string; hex: string };

// Keys are lowercased GitHub language names.
const REGISTRY: Record<string, SimpleIcon> = {
  python: siPython,
  javascript: siJavascript,
  typescript: siTypescript,
  go: siGo,
  rust: siRust,
  html: siHtml5,
  css: siCss,
  scss: siSass,
  php: siPhp,
  ruby: siRuby,
  swift: siSwift,
  kotlin: siKotlin,
  'c++': siCplusplus,
  c: siC,
  'c#': siSharp,
  java: siOpenjdk,
  dockerfile: siDocker,
  shell: siGnubash,
  vue: siVuedotjs,
  dart: siDart,
  lua: siLua,
  elixir: siElixir,
  scala: siScala,
  haskell: siHaskell,
  perl: siPerl,
  julia: siJulia,
  r: siR,
  clojure: siClojure,
  solidity: siSolidity,
  'jupyter notebook': siJupyter,
  makefile: siMake,
  zig: siZig,
};

/** Brand glyph for a language, or null if we don't have one. */
export function techIcon(language: string): TechIcon | null {
  const icon = REGISTRY[language.trim().toLowerCase()];
  return icon ? { path: icon.path, hex: `#${icon.hex}` } : null;
}
