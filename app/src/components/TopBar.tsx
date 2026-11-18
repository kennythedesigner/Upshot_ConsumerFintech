/** Brand and the screens you can move between. Plain links, so they work like links. */

export type NavItem = 'dashboard' | 'compare';

export function TopBar({ current }: { current: NavItem | null }) {
  return (
    <header className="topbar">
      <a className="brand" href="#dashboard" aria-label="Upshot, UX ROI calculator. Go to the dashboard.">
        <span className="wordmark">upshot</span>
        <span className="brand-sep" aria-hidden="true" />
        <span className="brand-desc">UX ROI calculator</span>
      </a>
      <nav className="nav" aria-label="Screens">
        <a className="nav-link" href="#dashboard" aria-current={current === 'dashboard' ? 'page' : undefined}>
          Dashboard
        </a>
        <a className="nav-link" href="#compare" aria-current={current === 'compare' ? 'page' : undefined}>
          Compare
        </a>
      </nav>
    </header>
  );
}
