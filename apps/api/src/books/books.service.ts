import { Injectable, NotFoundException } from '@nestjs/common';
import { BookStatus, type Prisma } from '@prisma/client';
import type { BookDetailDto, BookSummaryDto } from '@digital-study/shared';
import { ContentService } from '../content/content.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBookRequest } from './dto/create-book.dto';

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentService,
  ) {}

  async findAll(): Promise<BookSummaryDto[]> {
    const books = await this.prisma.book.findMany({
      where: { status: BookStatus.PUBLISHED },
      include: { category: true },
      orderBy: [{ publishedAt: 'desc' }, { title: 'asc' }],
    });
    return books.map((book) => this.toSummary(book));
  }

  async findOne(slug: string): Promise<BookDetailDto> {
    const book = await this.prisma.book.findFirst({
      where: { slug, status: BookStatus.PUBLISHED },
      include: { category: true },
    });
    if (!book) throw new NotFoundException(`Book not found: ${slug}`);

    return {
      ...this.toSummary(book),
      contentHtml: await this.content.readContent(slug),
    };
  }

  async create(input: CreateBookRequest): Promise<BookDetailDto> {
    await this.content.saveGeneratedDraft(input, true);
    await this.content.publishDraft(input.slug);
    return this.findOne(input.slug);
  }

  async saveDraft(input: CreateBookRequest): Promise<BookSummaryDto> {
    await this.content.saveGeneratedDraft(input, true);
    const book = await this.content.syncBook(input.slug);
    return this.toSummary(book);
  }

  private toSummary(book: Prisma.BookGetPayload<{ include: { category: true } }>): BookSummaryDto {
    return {
      slug: book.slug,
      title: book.title,
      author: book.author,
      summary: book.summary,
      cover: book.cover ? `/content/books/${book.slug}/${book.cover}` : null,
      status: book.status === BookStatus.PUBLISHED ? 'published' : 'draft',
      publishedAt: book.publishedAt?.toISOString() ?? null,
      category: book.category
        ? {
            slug: book.category.slug,
            name: book.category.name,
            description: book.category.description,
          }
        : null,
    };
  }
}
