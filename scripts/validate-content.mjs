import { access, readdir, readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const booksRoot = resolve(import.meta.dirname, '..', 'content', 'books');
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const entries = await readdir(booksRoot, { withFileTypes: true });
const failures = [];
let checked = 0;
const indexedSlugs = new Set();

try {
  const index = JSON.parse(await readFile(resolve(booksRoot, 'index.json'), 'utf8'));
  if (index.schemaVersion !== 1 || !Array.isArray(index.books)) throw new Error('invalid index structure');
  index.books.forEach((book) => indexedSlugs.add(book.slug));
} catch (error) {
  failures.push(`index.json: ${error.message}`);
}

for (const entry of entries) {
  if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
  checked += 1;
  try {
    const directory = resolve(booksRoot, entry.name);
    const metadata = JSON.parse(await readFile(resolve(directory, 'book.json'), 'utf8'));
    if (metadata.schemaVersion !== 1) throw new Error('schemaVersion must be 1');
    if (metadata.slug !== entry.name || !slugPattern.test(metadata.slug)) throw new Error('slug does not match directory');
    if (typeof metadata.title !== 'string' || !metadata.title.trim()) throw new Error('title is required');
    if (!['draft', 'published'].includes(metadata.status)) throw new Error('invalid status');
    if (
      typeof metadata.cover !== 'string' ||
      basename(metadata.cover) !== metadata.cover ||
      !/^cover\.(?:svg|webp|jpe?g|png)$/i.test(metadata.cover)
    ) throw new Error('invalid cover');
    if (metadata.publishedAt && Number.isNaN(Date.parse(metadata.publishedAt))) throw new Error('invalid publishedAt');
    await Promise.all([
      access(resolve(directory, 'content.html')),
      access(resolve(directory, metadata.cover)),
    ]);
    if (!indexedSlugs.has(entry.name)) throw new Error('book is missing from index.json');
  } catch (error) {
    failures.push(`${entry.name}: ${error.message}`);
  }
}

if (indexedSlugs.size !== checked) {
  failures.push(`index.json: expected ${checked} unique book entries, found ${indexedSlugs.size}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${checked} book content director${checked === 1 ? 'y' : 'ies'}.`);
}
