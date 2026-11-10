// Builds two ES modules the Framer code component imports by URL (D53a):
//   dist/upshot-engine.js — the math. No React, no screens, no network.
//   dist/upshot-data.js   — Onboarding save/load. Takes a Supabase client the
//                           component creates; supabase-js is not bundled in.
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: {
        'upshot-engine': 'src/engine/index.ts',
        'upshot-data': 'src/data/index.ts',
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    target: 'es2022',
    sourcemap: true,
  },
});
