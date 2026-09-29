import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReadingEntryType } from '@prisma/client';
import type { ReadingEntryDto } from '@digital-study/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveReadingEntryRequest } from './dto/save-reading-entry.dto';

@Injectable()
export class ReadingService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerId: string, type?: 'note' | 'quote', bookSlug?: string, chapterId?: string): Promise<ReadingEntryDto[]> {
    const entries = await this.prisma.readingEntry.findMany({
      where: { ownerId, ...(type ? { type: this.entryType(type) } : {}), ...(bookSlug ? { book: { is: { slug: bookSlug } } } : {}), ...(chapterId ? { chapterId } : {}) },
      include: { book: true },
      orderBy: { updatedAt: 'desc' },
    });
    return entries.map((entry) => this.toDto(entry));
  }

  async create(ownerId: string, input: SaveReadingEntryRequest): Promise<ReadingEntryDto> {
    this.validate(input);
    const book = await this.resolveBook(input.bookSlug);
    if (input.type === 'quote' && book && input.quote?.trim()) {
      const duplicate = await this.prisma.readingEntry.findFirst({ where: { ownerId, bookId: book.id, chapterId: this.clean(input.chapterId), type: ReadingEntryType.QUOTE, quote: input.quote.trim() } });
      if (duplicate) return this.toDto(await this.prisma.readingEntry.findFirstOrThrow({ where: { id: duplicate.id }, include: { book: true } }));
    }
    const entry = await this.prisma.readingEntry.create({
      data: {
        ownerId,
        type: this.entryType(input.type),
        title: this.clean(input.title),
        content: input.content.trim(),
        source: this.clean(input.source),
        pageLabel: this.clean(input.pageLabel),
        bookId: book?.id ?? null,
        chapterId: this.clean(input.chapterId),
        chapterTitle: this.clean(input.chapterTitle),
        quote: this.clean(input.quote),
        anchor: input.anchor as Prisma.InputJsonValue | undefined,
        tags: (input.tags ?? []) as Prisma.InputJsonValue,
        readingProgress: input.readingProgress,
      },
      include: { book: true },
    });
    return this.toDto(entry);
  }

  async update(ownerId: string, id: string, input: SaveReadingEntryRequest): Promise<ReadingEntryDto> {
    this.validate(input);
    await this.requireOwned(id, ownerId);
    const book = await this.resolveBook(input.bookSlug);
    const entry = await this.prisma.readingEntry.update({
      where: { id },
      data: {
        type: this.entryType(input.type),
        title: this.clean(input.title),
        content: input.content.trim(),
        source: this.clean(input.source),
        pageLabel: this.clean(input.pageLabel),
        bookId: book?.id ?? null,
        chapterId: this.clean(input.chapterId),
        chapterTitle: this.clean(input.chapterTitle),
        quote: this.clean(input.quote),
        anchor: input.anchor as Prisma.InputJsonValue | undefined,
        tags: (input.tags ?? []) as Prisma.InputJsonValue,
        readingProgress: input.readingProgress,
      },
      include: { book: true },
    });
    return this.toDto(entry);
  }

  async remove(ownerId: string, id: string) {
    await this.requireOwned(id, ownerId);
    await this.prisma.readingEntry.delete({ where: { id } });
    return { id, deleted: true };
  }

  private validate(input: SaveReadingEntryRequest) {
    if (!input.content?.trim()) throw new BadRequestException('内容不能为空');
    if (input.type === 'note' && !input.title?.trim()) throw new BadRequestException('笔记标题不能为空');
  }

  private clean(value?: string) {
    return value?.trim() || null;
  }

  private entryType(type: 'note' | 'quote') {
    return type === 'note' ? ReadingEntryType.NOTE : ReadingEntryType.QUOTE;
  }

  private async resolveBook(slug?: string) {
    if (!slug) return null;
    const book = await this.prisma.book.findFirst({ where: { slug, deletedAt: null } });
    if (!book) throw new BadRequestException(`找不到书籍：${slug}`);
    return book;
  }

  private async requireOwned(id: string, ownerId: string) {
    const entry = await this.prisma.readingEntry.findFirst({ where: { id, ownerId } });
    if (!entry) throw new NotFoundException('阅读记录不存在');
    return entry;
  }

  private toDto(entry: Awaited<ReturnType<typeof this.prisma.readingEntry.findFirstOrThrow>> & { book: { slug: string; title: string; author: string | null; cover: string | null } | null }): ReadingEntryDto {
    return {
      id: entry.id,
      type: entry.type === ReadingEntryType.NOTE ? 'note' : 'quote',
      title: entry.title,
      content: entry.content,
      source: entry.source,
      pageLabel: entry.pageLabel,
      chapterId: entry.chapterId,
      chapterTitle: entry.chapterTitle,
      quote: entry.quote,
      anchor: entry.anchor as ReadingEntryDto['anchor'],
      tags: Array.isArray(entry.tags) ? entry.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      readingProgress: entry.readingProgress,
      book: entry.book ? { slug: entry.book.slug, title: entry.book.title, author: entry.book.author, cover: entry.book.cover } : null,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }
}
