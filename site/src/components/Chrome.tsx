import { useState, type ReactNode } from 'react';
import { ThemeSwitch } from './ThemeSwitch';
import { CONTACT_EMAIL } from '../lib/contact';

/**
 * The shared frame: top bar, skip link, footer. Kennedi's screens show the
 * desktop bar as brand / Method / theme switch / Open the calculator, and
 * the mobile bar as brand / Menu with the switch on its own row beneath.
 * No screen showed the menu open, so its contents (the three pages plus
 * the calculator button) are Claude's reading of the footer — flagged.
 */
const CALCULATOR_URL = 'https://app.upshotpm.app';
const CASE_STUDY_URL = 'https://kenthedesigner.com/work/ux-roi';


export type PageId = 'home' | 'method' | 'privacy' | 'terms';

function TopBar({ page }: { page: PageId }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="topbar">
      <div className="topbar-row">
        <a className="brand" href="/" aria-label="Upshot, UX ROI calculator. Go to the home page.">
          <span className="wordmark">upshot</span>
          <span className="brand-sep" aria-hidden="true" />
          <span className="brand-desc">UX ROI calculator</span>
        </a>
        <nav className="top-nav" aria-label="Site">
          <a className="top-link" href="/method.html" aria-current={page === 'method' ? 'page' : undefined}>
            Method
          </a>
          <ThemeSwitch />
          <a className="button button--primary" href={CALCULATOR_URL}>
            Open the calculator
          </a>
        </nav>
        <button
          type="button"
          className="button button--ghost menu-btn"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((v) => !v)}
        >
          Menu
        </button>
      </div>
      {/* Mobile's second row. Kennedi's screens left the switch floating here
          on its own and put the only calculator link inside the menu, so the
          site's main action was a tap away. Pairing them fills the row and
          surfaces the CTA without cramming the first row. */}
      <div className="topbar-switch-row">
        <ThemeSwitch />
        <a className="button button--primary" href={CALCULATOR_URL}>
          Open the calculator
        </a>
      </div>
      {open && (
        <nav className="menu" id="site-menu" aria-label="Site">
          <a className="menu-link" href="/method.html">Method</a>
          <a className="menu-link" href="/privacy.html">Privacy</a>
          <a className="menu-link" href="/terms.html">Terms</a>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div>
          <p className="footer-brand">Upshot</p>
          <p className="footer-desc">Upshot — a UX ROI calculator</p>
        </div>
        <a className="text-link" href={CASE_STUDY_URL}>
          Read the case study
        </a>
      </div>
      <ul className="footer-links">
        <li><a className="text-link" href="/method.html">Method</a></li>
        <li><a className="text-link" href="/privacy.html">Privacy</a></li>
        <li><a className="text-link" href="/terms.html">Terms</a></li>
        <li>
          <a className="text-link" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </li>
      </ul>
      <p className="fine-print">Directional, not predictive. Never picks a winner.</p>
      <p className="fine-print">Upshot is a portfolio project, not financial advice.</p>
    </footer>
  );
}

export function Chrome({ page, children }: { page: PageId; children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="page">
        <TopBar page={page} />
        <main id="main">{children}</main>
        <Footer />
      </div>
    </>
  );
}

export { CALCULATOR_URL, CASE_STUDY_URL };
