/**
 * Parse a GitHub repo reference into the `owner/repo` the analyze API expects,
 * or null if the input isn't one. Accepts a full URL
 * (`https://github.com/owner/repo`, with optional `.git`, trailing slash, or
 * extra `/tree/...` path), a host-relative `github.com/owner/repo`, and the bare
 * `owner/repo` shorthand. Mirrors the backend's `^[\w.-]+/[\w.-]+$` contract.
 */
export function parseGithubRepo(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  const seg = /^[\w.-]+$/;
  const stripGit = (r: string) => r.replace(/\.git$/i, '');

  // Bare "owner/repo" shorthand — no scheme, no host.
  if (!s.includes('://') && !/github\.com/i.test(s)) {
    const parts = s.split('/').filter(Boolean);
    const repo = parts[1] ? stripGit(parts[1]) : '';
    if (parts.length === 2 && seg.test(parts[0]) && seg.test(repo)) {
      return `${parts[0]}/${repo}`;
    }
    return null;
  }

  try {
    const url = new URL(s.startsWith('http') ? s : `https://${s}`);
    if (!/(^|\.)github\.com$/i.test(url.hostname)) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = stripGit(parts[1]);
    if (!seg.test(owner) || !seg.test(repo)) return null;
    return `${owner}/${repo}`;
  } catch {
    return null;
  }
}
