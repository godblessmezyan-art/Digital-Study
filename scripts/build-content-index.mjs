import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const booksRoot = resolve(import.meta.dirname, '..', 'content', 'books');
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const entries = await readdir(booksRoot, { withFileTypes: true });
const books = [];

for (const entry of entries) {
  if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
  const metadata = JSON.parse(await readFile(resolve(booksRoot, entry.name, 'book.json'), 'utf8'));
  if (metadata.schemaVersion !== 1 || metadata.slug !== entry.name || !slugPattern.test(metadata.slug)) {
    throw new Error(`Invalid book metadata: ${entry.name}/book.json`);
  }
  if (!['draft', 'published'].includes(metadata.status)) {
    throw new Error(`Invalid book status: ${entry.name}/book.json`);
  }
  if (basename(metadata.cover) !== metadata.cover) {
    throw new Error(`Invalid cover path: ${entry.name}/book.json`);
  }
  books.push({
    ...metadata,
    coverUrl: `/content/books/${metadata.slug}/${metadata.cover}`,
    contentUrl: `/content/books/${metadata.slug}/content.html`,
  });
}

books.sort((left, right) => {
  const dateOrder = String(right.publishedAt ?? '').localeCompare(String(left.publishedAt ?? ''));
  return dateOrder || left.title.localeCompare(right.title, 'zh-CN');
});

await writeFile(
  resolve(booksRoot, 'index.json'),
  `${JSON.stringify({ schemaVersion: 1, books }, null, 2)}\n`,
  'utf8',
);
console.log(`Indexed ${books.length} book${books.length === 1 ? '' : 's'} in content/books/index.json.`);
