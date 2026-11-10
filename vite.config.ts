// Builds the engine into one ES module (dist/upshot-engine.js) that the
// Framer code component can import by URL (D53a). No React, no screens.
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/engine/index.ts',
      formats: ['es'],
      fileName: () => 'upshot-engine.js',
    },
    target: 'es2022',
    sourcemap: true,
  },
});
