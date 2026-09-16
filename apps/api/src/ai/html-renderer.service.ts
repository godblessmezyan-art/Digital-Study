import { Injectable } from '@nestjs/common';
import type { GeneratedBook, GenerationInput } from './ai.types';

@Injectable()
export class HtmlRendererService {
  render(book: GeneratedBook, input: GenerationInput): string {
    const title = this.escape(book.title || input.title);
    const author = this.escape(input.author ?? '');
    const category = this.escape(input.categoryName ?? input.categorySlug ?? '未分类');
    const description = this.escape(book.summary);
    const sections = book.sections
      .map(
        (section) => `<section data-section="${this.escape(section.key)}">
  <h2>${this.escape(section.title)}</h2>
  ${this.paragraphs(section.content)}
</section>`,
      )
      .join('\n');

    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="author" content="${author}">
  <meta name="category" content="${category}">
  <meta name="description" content="${description}">
  <meta name="keywords" content="${book.tags.map((tag) => this.escape(tag)).join(',')}">
  <title>${title}</title>
  <style>body{max-width:760px;margin:0 auto;padding:56px 32px;color:#28231d;background:#faf6ed;font:17px/1.9 Georgia,"Songti SC",serif}h1{text-align:center;font-size:36px}header>p{text-align:center;color:#766b5d}section{margin-top:48px}h2{font-size:25px;border-bottom:1px solid #d8ccb7;padding-bottom:10px}p{white-space:pre-wrap}</style>
</head>
<body>
  <article>
    <header><h1>${title}</h1>${author ? `<p>${author}</p>` : ''}<p>${description}</p></header>
    ${sections}
  </article>
</body>
</html>`;
  }

  private paragraphs(value: string): string {
    return value
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${this.escape(paragraph.trim())}</p>`)
      .join('\n  ');
  }

  private escape(value: string): string {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
