import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const workspaceRoot = resolve(import.meta.dirname, '..');
const webRoot = resolve(workspaceRoot, 'apps', 'web');
const booksRoot = resolve(workspaceRoot, 'content', 'books');
const port = Number(process.env.STATIC_PORT ?? 5175);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function safePath(root, relativePath) {
  const target = resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${sep}`)) return null;
  return target;
}

async function proxyApi(request, response) {
  try {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const hasBody = !['GET', 'HEAD'].includes(request.method ?? 'GET');
    const upstream = await fetch(`http://127.0.0.1:3000${request.url}`, {
      method: request.method,
      headers: request.headers,
      ...(hasBody ? { body: Buffer.concat(chunks), duplex: 'half' } : {}),
    });
    response.statusCode = upstream.status;
    upstream.headers.forEach((value, name) => {
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(name)) response.setHeader(name, value);
    });
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    response.statusCode = 502;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ message: 'NestJS API is not running on port 3000' }));
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (url.pathname.startsWith('/api/')) return proxyApi(request, response);
  if (!['GET', 'HEAD'].includes(request.method ?? 'GET')) {
    response.statusCode = 405;
    return response.end('Method Not Allowed');
  }

  const isBookContent = url.pathname.startsWith('/content/books/');
  const root = isBookContent ? booksRoot : webRoot;
  const relativePath = isBookContent
    ? decodeURIComponent(url.pathname.slice('/content/books/'.length))
    : decodeURIComponent(url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
  const target = safePath(root, relativePath);
  if (!target) {
    response.statusCode = 403;
    return response.end('Forbidden');
  }

  try {
    if (!(await stat(target)).isFile()) throw new Error('Not a file');
    response.statusCode = 200;
    response.setHeader('Content-Type', mimeTypes[extname(target).toLowerCase()] ?? 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-store');
    if (request.method === 'HEAD') return response.end();
    response.end(await readFile(target));
  } catch {
    response.statusCode = 404;
    response.end('Not Found');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Static web and Git content server: http://localhost:${port}`);
});
