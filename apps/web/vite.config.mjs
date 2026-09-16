import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        home: resolve(import.meta.dirname, 'home.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
});
