import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The marketing site is four real pages, not one app with routes: each page
 * gets its own HTML file (and its own title and meta description), and
 * Vercel's cleanUrls setting serves method.html at /method. The calculator
 * stays its own app in ../app.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'index.html'),
        method: resolve(__dirname, 'method.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
      },
    },
  },
});
