import { useEffect, useState } from 'react';
import { currentTheme, setTheme, type Theme } from '../lib/theme';
import { Moon, Sun } from './Icons';

/**
 * The two-position theme switch from Kennedi's screens: sun and moon in a
 * pill, the active side filled with the accent. The accent fill marks the
 * selected state of an interactive control — it carries no meaning beyond
 * that, so it stays inside the "accent means interactive" rule.
 */
export function ThemeSwitch() {
  const [theme, setLocal] = useState<Theme>(() => currentTheme());

  // While no choice is saved, the document attribute can change under us
  // (the device setting flips). Watch it so the pressed state stays true.
  useEffect(() => {
    const observer = new MutationObserver(() => setLocal(currentTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const pick = (t: Theme) => () => {
    setTheme(t);
    setLocal(t);
  };

  return (
    <div className="theme-switch" role="group" aria-label="Colour theme">
      <button
        type="button"
        className="theme-switch-btn"
        aria-pressed={theme === 'light'}
        aria-label="Light theme"
        onClick={pick('light')}
      >
        <Sun />
      </button>
      <button
        type="button"
        className="theme-switch-btn"
        aria-pressed={theme === 'dark'}
        aria-label="Dark theme"
        onClick={pick('dark')}
      >
        <Moon />
      </button>
    </div>
  );
}
