import type { LanguageStat } from '../../lib/types';
import { techIcon } from '../../lib/tech-icons';

const FALLBACK_COLOR = '#8a8a93';

/**
 * GitHub-style language breakdown for a repo card. A thin segmented bar shows
 * each language's share; a compact legend below labels the top few. Rendered on
 * the solid card body (not over the generated art) so it stays fully legible.
 */
export function RepoLanguages({ languages }: { languages?: LanguageStat[] }) {
  if (!languages || languages.length === 0) return null;

  // Cap the legend so busy repos don't wrap into a wall of chips; the bar still
  // reflects every language proportionally.
  const legend = languages.slice(0, 4);

  const label = languages.map((l) => `${l.name} ${l.percent}%`).join(', ');

  return (
    <div className="repo-langs" aria-label={`Languages: ${label}`}>
      <div className="lang-bar" role="img" aria-hidden="true">
        {languages.map((lang) => (
          <span
            key={lang.name}
            className="lang-bar-seg"
            style={{
              width: `${Math.max(1.5, lang.percent)}%`,
              background: colorFor(lang),
            }}
          />
        ))}
      </div>

      <ul className="lang-legend" aria-hidden="true">
        {legend.map((lang) => (
          <li
            className="lang-legend-item"
            key={lang.name}
            // Hover reveals the exact byte weight behind each percentage.
            title={`${lang.name} · ${formatBytes(lang.bytes)} (${lang.percent}%)`}
          >
            <LangGlyph lang={lang} />
            <span className="lang-legend-name">{lang.name}</span>
            <span className="lang-legend-pct">{lang.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Brand glyph in the language's color, falling back to a plain color dot. */
function LangGlyph({ lang }: { lang: LanguageStat }) {
  const color = colorFor(lang);
  const icon = techIcon(lang.name);

  if (!icon) {
    return <span className="lang-dot" style={{ background: color }} />;
  }

  return (
    <svg
      className="lang-glyph"
      viewBox="0 0 24 24"
      width="12"
      height="12"
      aria-hidden="true"
    >
      <path d={icon.path} fill={color} />
    </svg>
  );
}

function colorFor(lang: LanguageStat): string {
  if (lang.color) return lang.color;
  const icon = techIcon(lang.name);
  if (icon && icon.hex.toLowerCase() !== '#000000') return icon.hex;
  return FALLBACK_COLOR;
}

/** 1_234_567 -> "1.2 MB". Binary-ish scale, matches how GitHub reports repo size. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}
