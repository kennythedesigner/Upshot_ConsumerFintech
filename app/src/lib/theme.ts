/**
 * The theme switch (D65): two positions, light and dark. A first visit
 * follows the device; flipping the switch sets a choice that sticks.
 *
 * The choice is written to localStorage and, on upshotpm.app, to a small
 * cookie on .upshotpm.app so the marketing pages and the calculator at
 * app.upshotpm.app stay in step. The cookie holds one word and nothing
 * else; the Privacy page says so. On any other hostname (local dev, the
 * preview link) only localStorage applies.
 *
 * An inline script in each page's <head> runs the same read before first
 * paint, so there is no flash of the wrong theme. This module is the
 * version the app code talks to.
 */
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'upshot.theme';
const COOKIE_NAME = 'upshot_theme';
const SHARED_DOMAIN = 'upshotpm.app';

const isTheme = (v: unknown): v is Theme => v === 'light' || v === 'dark';

/** The saved choice, if the visitor has made one. Cookie first: it is the cross-site copy. */
export function storedTheme(): Theme | null {
  try {
    const m = document.cookie.match(/(?:^|; )upshot_theme=(light|dark)(?:;|$)/);
    if (m && isTheme(m[1])) return m[1];
    const local = localStorage.getItem(STORAGE_KEY);
    return isTheme(local) ? local : null;
  } catch {
    return null;
  }
}

const deviceTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

/** The theme on screen right now. */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

/** The visitor flipped the switch: apply it and remember it. */
export function setTheme(theme: Theme) {
  apply(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* private browsing: the choice lasts for this page only */
  }
  const host = window.location.hostname;
  const onSharedDomain = host === SHARED_DOMAIN || host.endsWith(`.${SHARED_DOMAIN}`);
  const base = `${COOKIE_NAME}=${theme}; path=/; max-age=31536000; samesite=lax`;
  try {
    document.cookie = onSharedDomain ? `${base}; domain=.${SHARED_DOMAIN}` : base;
  } catch {
    /* same: localStorage already has it */
  }
}

/**
 * Called once at startup. The inline head script already set the attribute;
 * this re-applies it (belt and braces) and, while no choice is saved, keeps
 * following the device if its setting changes mid-visit.
 */
export function initTheme() {
  apply(storedTheme() ?? deviceTheme());
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', (e) => {
    if (storedTheme() === null) apply(e.matches ? 'dark' : 'light');
  });
}
