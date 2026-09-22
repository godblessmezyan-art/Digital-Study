import { Injectable, NotFoundException } from '@nestjs/common';
import { BookStatus, GitSyncOperation, type Prisma } from '@prisma/client';
import type { BookDetailDto, BookSummaryDto } from '@digital-study/shared';
import { ContentService } from '../content/content.service';
import { PrismaService } from '../prisma/prisma.service';
import { GitSyncService } from '../git-sync/git-sync.service';
import type { CreateBookRequest } from './dto/create-book.dto';
import type { PublishBookRequest } from './dto/publish-book.dto';

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentService,
    private readonly gitSync: GitSyncService,
  ) {}

  async findAll(): Promise<BookSummaryDto[]> {
    const books = await this.prisma.book.findMany({
      where: { status: BookStatus.PUBLISHED, deletedAt: null },
      include: { category: true, gitSync: true },
      orderBy: [{ publishedAt: 'desc' }, { title: 'asc' }],
    });
    return books.map((book) => this.toSummary(book));
  }

  async findOne(slug: string): Promise<BookDetailDto> {
    const book = await this.prisma.book.findFirst({
      where: { slug, status: BookStatus.PUBLISHED, deletedAt: null },
      include: { category: true, gitSync: true },
    });
    if (!book) throw new NotFoundException(`Book not found: ${slug}`);

    return {
      ...this.toSummary(book),
      contentHtml: await this.content.readContent(slug),
    };
  }

  async create(input: PublishBookRequest) {
    await this.content.saveGeneratedDraft(input, true);
    await this.content.publishDraft(input.slug, true);
    let gitSyncJob = null;
    if (input.syncToGit) {
      try { gitSyncJob = await this.gitSync.enqueue(input.slug); }
      catch (error) { gitSyncJob = { status: 'error', error: error instanceof Error ? error.message : 'Git sync failed' }; }
    }
    return { ...(await this.findOne(input.slug)), gitSyncJob };
  }

  async saveDraft(input: CreateBookRequest): Promise<BookSummaryDto> {
    await this.content.saveGeneratedDraft(input, true);
    await this.content.syncBook(input.slug, true);
    const book = await this.prisma.book.findUniqueOrThrow({ where: { slug: input.slug }, include: { category: true, gitSync: true } });
    return this.toSummary(book);
  }

  async findAllAdmin(): Promise<BookSummaryDto[]> {
    const books = await this.prisma.book.findMany({
      where: { deletedAt: null },
      include: { category: true, gitSync: true },
      orderBy: [{ updatedAt: 'desc' }, { title: 'asc' }],
    });
    return books.map((book) => this.toSummary(book));
  }

  async publish(slug: string, syncToGit = false) {
    await this.content.publishDraft(slug);
    let gitSync = null;
    if (syncToGit) {
      try { gitSync = await this.gitSync.enqueue(slug); }
      catch (error) { gitSync = { status: 'error', error: error instanceof Error ? error.message : 'Git sync failed' }; }
    }
    const book = await this.prisma.book.findUniqueOrThrow({ where: { slug }, include: { category: true, gitSync: true } });
    return { ...this.toSummary(book), gitSyncJob: gitSync };
  }

  async syncGit(slug: string) {
    return this.gitSync.enqueue(slug);
  }

  async remove(slug: string, deleteFromGit = false) {
    await this.content.removeBook(slug);
    let gitSync = null;
    if (deleteFromGit) {
      try { gitSync = await this.gitSync.enqueue(slug, GitSyncOperation.DELETE); }
      catch (error) { gitSync = { status: 'error', error: error instanceof Error ? error.message : 'Git sync failed' }; }
    }
    return { slug, deleted: true, gitSyncJob: gitSync };
  }

  private toSummary(book: Prisma.BookGetPayload<{ include: { category: true; gitSync: true } }>): BookSummaryDto {
    const sync = book.gitSync;
    const rawStatus = sync?.status?.toLowerCase() ?? 'never_synced';
    const gitStatus = rawStatus === 'synced' && sync?.syncedContentHash !== book.contentHash ? 'outdated' : rawStatus;
    return {
      slug: book.slug,
      title: book.title,
      author: book.author,
      summary: book.summary,
      cover: book.cover ? `/content/books/${book.slug}/${book.cover}` : null,
      status: book.status === BookStatus.PUBLISHED ? 'published' : 'draft',
      publishedAt: book.publishedAt?.toISOString() ?? null,
      createdAt: book.createdAt.toISOString(),
      updatedAt: book.updatedAt.toISOString(),
      deletedAt: book.deletedAt?.toISOString() ?? null,
      contentHash: book.contentHash,
      gitSync: {
        status: gitStatus as NonNullable<BookSummaryDto['gitSync']>['status'],
        commitSha: sync?.gitCommitSha ?? null,
        lastSyncedAt: sync?.lastSyncedAt?.toISOString() ?? null,
        lastError: sync?.lastError ?? null,
      },
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
