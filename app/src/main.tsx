// Fonts are bundled with the app rather than loaded from Google Fonts,
// so no visitor's browser calls a third party just to draw text.
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/public-sans/index.css';
import './styles/tokens.css';
import './styles/app.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
