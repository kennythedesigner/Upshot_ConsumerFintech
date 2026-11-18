/** Brand and the screens you can move between. Plain links, so they work like links. */

export type NavItem = 'initiatives';

export function TopBar({ current }: { current: NavItem | null }) {
  return (
    <header className="topbar">
      <a className="brand" href="#initiatives" aria-label="Upshot, UX ROI calculator. Go to all initiatives.">
        <span className="wordmark">upshot</span>
        <span className="brand-sep" aria-hidden="true" />
        <span className="brand-desc">UX ROI calculator</span>
      </a>
      <nav className="nav" aria-label="Screens">
        <a className="nav-link" href="#initiatives" aria-current={current === 'initiatives' ? 'page' : undefined}>
          Initiatives
        </a>
      </nav>
    </header>
  );
}
