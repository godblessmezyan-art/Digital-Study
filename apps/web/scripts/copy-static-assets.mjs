import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const webRoot = resolve(import.meta.dirname, '..');
await mkdir(resolve(webRoot, 'dist', 'assets'), { recursive: true });
await cp(resolve(webRoot, 'assets'), resolve(webRoot, 'dist', 'assets'), {
  recursive: true,
  force: true,
});
