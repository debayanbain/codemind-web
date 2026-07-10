import { Logo } from '../Logo';

export function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="landing-footer-brand">
          <Logo className="h-9" />
        </div>
        <nav className="landing-footer-links">
          <a href="#agents">Agents</a>
          <a href="#reports">Reports</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <span className="landing-footer-copy">
          © {new Date().getFullYear()} CodeMind
        </span>
      </div>
    </footer>
  );
}
