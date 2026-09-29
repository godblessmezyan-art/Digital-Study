import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

export type BookChunk = { chapterId: string; chapterTitle: string; chunkIndex: number; text: string };

@Injectable()
export class BookChunkerService {
  chunk(html: string): BookChunk[] {
    const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    const nodes = [...clean.matchAll(/<(h[1-6]|p|blockquote|li)\b([^>]*)>([\s\S]*?)<\/\1>/gi)];
    let chapterId = 'opening', chapterTitle = '正文', paragraphs: string[] = [], chunkIndex = 0;
    const chunks: BookChunk[] = [];
    const flush = () => {
      if (!paragraphs.length) return;
      chunks.push({ chapterId, chapterTitle, chunkIndex: chunkIndex++, text: paragraphs.join('\n\n').slice(0, 6000) });
      paragraphs = [];
    };
    for (const match of nodes) {
      const tag = match[1].toLowerCase();
      const text = this.text(match[3]);
      if (!text) continue;
      if (tag.startsWith('h')) {
        flush();
        chapterTitle = text.slice(0, 255);
        chapterId = match[2].match(/\bid=["']([^"']+)["']/i)?.[1] || `chapter-${this.hash(chapterTitle)}`;
        chunkIndex = 0;
        continue;
      }
      const length = paragraphs.reduce((sum, item) => sum + item.length, 0);
      if (length >= 900 && length + text.length > 1600) flush();
      paragraphs.push(text);
    }
    flush();
    return chunks;
  }

  private text(value: string) {
    return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, ' ').trim();
  }

  private hash(value: string) { return createHash('sha1').update(value).digest('hex').slice(0, 12); }
}
