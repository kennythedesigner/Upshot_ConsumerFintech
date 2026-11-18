// The calculator app. It imports the engine's source directly (../src/engine),
// so the screens and the published dist/upshot-engine.js share one copy of the math.
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const engine = fileURLToPath(new URL('../src/engine/index.ts', import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the built app works from any folder or host.
  base: './',
  resolve: {
    alias: { '@engine': engine },
  },
  server: {
    // Let the dev server read ../src/engine.
    fs: { allow: ['..'] },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
