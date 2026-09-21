import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const defaults = {
  apiBase: 'http://127.0.0.1:8772/api',
  htmlRoot: '/opt/study-api/books_html',
  booksRoot: resolve(import.meta.dirname, '..', 'content', 'books'),
  dryRun: false,
  overwrite: false,
};

function parseArgs(argv) {
  const options = { ...defaults };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--dry-run') options.dryRun = true;
    else if (argument === '--overwrite') options.overwrite = true;
    else if (argument === '--api-base') options.apiBase = argv[++index];
    else if (argument === '--html-root') options.htmlRoot = argv[++index];
    else if (argument === '--books-root') options.booksRoot = resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argument}`);
  }
  options.apiBase = options.apiBase.replace(/\/$/, '');
  return options;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

function escapeXml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]);
}

function coverSvg(title, category, color = '#7a6542') {
  const safeTitle = escapeXml(title);
  const safeCategory = escapeXml(category || '未分类');
  const safeColor = /^#[0-9a-f]{6}$/i.test(color) ? color : '#7a6542';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b2740"/><stop offset="1" stop-color="${safeColor}"/></linearGradient></defs>
  <rect width="600" height="900" fill="url(#bg)"/><path d="M62 80h476v740H62z" fill="none" stroke="#d7bd82" stroke-width="3" opacity=".65"/>
  <circle cx="300" cy="250" r="76" fill="none" stroke="#d7bd82" stroke-width="3" opacity=".55"/><path d="M230 250h140M300 180v140" stroke="#d7bd82" stroke-width="2" opacity=".45"/>
  <text x="300" y="455" fill="#f4ead5" font-family="serif" font-size="42" text-anchor="middle">${safeTitle}</text>
  <text x="300" y="520" fill="#d7bd82" font-family="sans-serif" font-size="22" text-anchor="middle" letter-spacing="5">${safeCategory}</text>
  <text x="300" y="770" fill="#d7bd82" font-family="serif" font-size="18" text-anchor="middle" letter-spacing="4">CLOUD REALM ARCHIVE</text>
</svg>\n`;
}

function isoDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.valueOf()) ? new Date().toISOString() : date.toISOString();
}

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

const options = parseArgs(process.argv.slice(2));
const [bookResponse, categories] = await Promise.all([
  fetchJson(`${options.apiBase}/books?size=500`),
  fetchJson(`${options.apiBase}/books/categories`),
]);
const books = Array.isArray(bookResponse.books) ? bookResponse.books : [];
const categoryByName = new Map((Array.isArray(categories) ? categories : []).map((category) => [category.name, category]));
const report = { discovered: books.length, imported: 0, skipped: 0, missingHtml: 0, failures: [] };

for (const book of books) {
  try {
    const detail = await fetchJson(`${options.apiBase}/books/${book.id}`);
    const filename = basename(String(detail.html_filename || ''));
    if (!filename) { report.missingHtml += 1; continue; }
    const sourcePath = resolve(options.htmlRoot, filename);
    if (!(await exists(sourcePath))) { report.missingHtml += 1; continue; }

    const slug = `legacy-study-${book.id}`;
    const targetDirectory = resolve(options.booksRoot, slug);
    if (!options.overwrite && await exists(resolve(targetDirectory, 'book.json'))) {
      report.skipped += 1;
      continue;
    }

    const category = categoryByName.get(book.category) || { id: 'uncategorized', name: book.category || '未分类', color: '#7a6542' };
    const metadata = {
      schemaVersion: 1,
      slug,
      title: String(book.title || detail.title || `旧版书籍 ${book.id}`).trim(),
      author: String(book.author || detail.author || '佚名').trim() || '佚名',
      summary: String(book.description || detail.description || '从旧 Study 项目迁移的书籍内容。').trim(),
      tags: [],
      cover: 'cover.svg',
      status: 'published',
      publishedAt: isoDate(book.created_at || detail.created_at),
      category: {
        slug: `legacy-category-${category.id}`,
        name: String(category.name || '未分类'),
      },
    };

    if (!options.dryRun) {
      const html = await readFile(sourcePath, 'utf8');
      await mkdir(targetDirectory, { recursive: true });
      await Promise.all([
        writeFile(resolve(targetDirectory, 'content.html'), html, 'utf8'),
        writeFile(resolve(targetDirectory, 'cover.svg'), coverSvg(metadata.title, metadata.category.name, category.color), 'utf8'),
        writeFile(resolve(targetDirectory, 'book.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8'),
      ]);
    }
    report.imported += 1;
  } catch (error) {
    report.failures.push({ id: book.id, title: book.title, error: error instanceof Error ? error.message : String(error) });
  }
}

console.log(JSON.stringify({ mode: options.dryRun ? 'dry-run' : 'write', ...report }, null, 2));
if (report.failures.length) process.exitCode = 1;
