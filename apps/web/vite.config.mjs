import { resolve } from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { defineConfig } from 'vite';

const contentRoot = resolve(import.meta.dirname, '..', '..', 'content', 'books');
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function contentBooksPlugin() {
  return {
    name: 'content-books',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
        if (!pathname.startsWith('/content/books/')) return next();
        const relativePath = decodeURIComponent(pathname.slice('/content/books/'.length));
        const target = resolve(contentRoot, relativePath);
        if (target !== contentRoot && !target.startsWith(`${contentRoot}\\`) && !target.startsWith(`${contentRoot}/`)) {
          response.statusCode = 403;
          return response.end('Forbidden');
        }
        try {
          if (!(await stat(target)).isFile()) return next();
          const extension = target.slice(target.lastIndexOf('.')).toLowerCase();
          response.setHeader('Content-Type', contentTypes[extension] ?? 'application/octet-stream');
          response.setHeader('Cache-Control', 'no-store');
          response.end(await readFile(target));
        } catch {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [contentBooksPlugin()],
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
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
});
