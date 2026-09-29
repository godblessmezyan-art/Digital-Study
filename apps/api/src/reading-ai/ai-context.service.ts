import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReadingEntryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ReadingAiRequest } from './dto/reading-ai-request.dto';
import { AIContextRetriever } from '../semantic/ai-context-retriever.service';
import type { SemanticScope } from '../semantic/semantic.types';

export type ReadingAiContext = {
  currentBook: { slug: string; title: string; author: string | null };
  currentChapter: { id: string | null; title: string | null };
  selectedText: string;
  nearbyText: string;
  relatedNotes: Array<{ quote: string | null; content: string }>;
  relatedExcerpts: Array<{ quote: string; content: string }>;
};

@Injectable()
export class AiContextService {
  constructor(private readonly prisma: PrismaService, private readonly retriever: AIContextRetriever) {}

  async build(ownerId: string, input: ReadingAiRequest): Promise<ReadingAiContext> {
    const selectedText = this.clean(input.selectedText, 5000);
    if (!selectedText) throw new BadRequestException('请选择需要讨论的原文');
    const book = await this.prisma.book.findFirst({
      where: { slug: input.bookSlug, deletedAt: null },
      select: { id: true, slug: true, title: true, author: true },
    });
    if (!book) throw new NotFoundException('当前书籍不存在');
    const entries = await this.prisma.readingEntry.findMany({
      where: {
        ownerId,
        bookId: book.id,
        ...(input.chapterId ? { chapterId: input.chapterId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
    });
    return {
      currentBook: { slug: book.slug, title: book.title, author: book.author },
      currentChapter: {
        id: this.clean(input.chapterId, 191) || null,
        title: this.clean(input.chapterTitle, 255) || null,
      },
      selectedText,
      nearbyText: this.clean(input.nearbyText, 12000),
      relatedNotes: entries
        .filter((entry) => entry.type === ReadingEntryType.NOTE)
        .slice(0, 4)
        .map((entry) => ({ quote: entry.quote?.slice(0, 1200) || null, content: entry.content.slice(0, 1600) })),
      relatedExcerpts: entries
        .filter((entry) => entry.type === ReadingEntryType.QUOTE)
        .slice(0, 4)
        .map((entry) => ({ quote: (entry.quote || entry.content).slice(0, 1600), content: entry.content.slice(0, 1600) })),
    };
  }

  buildCuratorContext(ownerId: string, query: string, scope: SemanticScope) {
    return this.retriever.retrieve(ownerId, query, scope);
  }

  private clean(value: unknown, max: number): string {
    return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
  }
}
