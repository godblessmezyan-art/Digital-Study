import { cp, mkdir, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = resolve(workspace, process.env.LEGACY_CONTENT_ROOT || 'content/books');
const target = resolve(workspace, process.env.CONTENT_ROOT || 'runtime-data/books');

await mkdir(target, { recursive: true });
const entries = await readdir(source, { withFileTypes: true });
let copied = 0;
let skipped = 0;
for (const entry of entries) {
  if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
  const destination = resolve(target, entry.name);
  try {
    await stat(destination);
    skipped += 1;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await cp(resolve(source, entry.name), destination, { recursive: true, errorOnExist: true });
    copied += 1;
  }
}
console.log(`Runtime library ready: copied ${copied}, kept ${skipped}, target ${target}`);
