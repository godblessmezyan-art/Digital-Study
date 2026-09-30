import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getContentRoot } from '../config/paths';

export interface ContextRef {
  type: string;
  id?: string;
  title?: string;
  content?: string;
  description?: string;
}

export interface ContextBlock {
  type: string;
  label: string;
  content: string;
}

const TYPE_LABELS: Record<string, string> = {
  BOOK: '书籍',
  NOTE: '笔记',
  JOURNAL: '手记',
  PLAN: '计划',
  SELECTED_TEXT: '选中文字',
  PAGE: '当前页面',
};

function stripHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * AI Context Layer: resolves typed context references into text blocks.
 * Business pages never assemble prompt strings themselves.
 */
@Injectable()
export class AiContextResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(refs: ContextRef[] | undefined, ownerId: string): Promise<ContextBlock[]> {
    const blocks: ContextBlock[] = [];
    for (const ref of refs ?? []) {
      try {
        const block = await this.resolveOne(ref, ownerId);
        if (block) blocks.push(block);
      } catch { /* unreadable reference is skipped, never fatal */ }
    }
    return blocks.slice(0, 8);
  }

  private async resolveOne(ref: ContextRef, ownerId: string): Promise<ContextBlock | null> {
    switch (ref.type) {
      case 'SELECTED_TEXT':
      case 'PAGE': {
        const content = (ref.content || ref.description || '').trim();
        if (!content && !ref.title) return null;
        return { type: ref.type, label: ref.title || TYPE_LABELS[ref.type], content: content.slice(0, 3000) };
      }
      case 'BOOK': {
        const book = await this.findBook(ref.id);
        if (!book) return null;
        let body = book.summary || '';
        try {
          const raw = await readFile(join(getContentRoot(), book.contentPath), 'utf8');
          body = `${body}\n${stripHtml(raw).slice(0, 3000)}`.trim();
        } catch { /* content file missing: summary only */ }
        return { type: 'BOOK', label: `书籍《${book.title}》`, content: body.slice(0, 3500) || `《${book.title}》（暂无可注入内容）` };
      }
      case 'NOTE': {
        if (!ref.id) return null;
        const entry = await this.prisma.readingEntry.findFirst({ where: { id: ref.id, ownerId } });
        if (!entry) return null;
        const parts = [entry.content, entry.quote ? `书摘：${entry.quote}` : '', entry.chapterTitle ? `章节：${entry.chapterTitle}` : ''].filter(Boolean);
        return { type: 'NOTE', label: entry.title || entry.chapterTitle || '笔记', content: parts.join('\n').slice(0, 2500) };
      }
      case 'JOURNAL': {
        if (!ref.id) return null;
        const entry = await this.prisma.journalEntry.findFirst({ where: { id: ref.id, ownerId } });
        if (!entry) return null;
        return { type: 'JOURNAL', label: entry.title || '手记', content: `${entry.entryDate.toISOString().slice(0, 10)}\n${entry.content}`.slice(0, 2500) };
      }
      case 'PLAN': {
        if (!ref.id) return null;
        const plan = await this.prisma.plan.findFirst({
          where: { id: ref.id, ownerId },
          include: { tasks: { orderBy: [{ order: 'asc' }] } },
        });
        if (!plan) return null;
        const lines = plan.tasks.map((task) => `- [${task.status}] ${task.title}${task.dueDate ? `（截止 ${task.dueDate.toISOString().slice(0, 10)}）` : ''}`);
        return {
          type: 'PLAN',
          label: `计划「${plan.title}」`,
          content: `目标：${plan.description || plan.title}\n进度：${plan.progress}%\n任务：\n${lines.join('\n')}`.slice(0, 3000),
        };
      }
      default:
        return null;
    }
  }

  private async findBook(id?: string) {
    if (!id) return null;
    const numeric = Number(id);
    return this.prisma.book.findFirst({
      where: Number.isFinite(numeric) && String(numeric) === id ? { OR: [{ id: numeric }, { slug: id }] } : { slug: id },
    });
  }
}
