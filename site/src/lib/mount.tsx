// Fonts are bundled with the site rather than loaded from Google Fonts,
// so no visitor's browser calls a third party just to draw text.
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/public-sans/index.css';
import '../styles/tokens.css';
import '../styles/site.css';

import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Chrome, type PageId } from '../components/Chrome';
import { initTheme } from './theme';

/** Each page's entry file calls this once. */
export function mount(page: PageId, content: ReactNode) {
  initTheme();
  const root = document.getElementById('root');
  if (root) {
    createRoot(root).render(
      <StrictMode>
        <Chrome page={page}>{content}</Chrome>
      </StrictMode>,
    );
  }
}
