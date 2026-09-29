import { Injectable, NotFoundException } from '@nestjs/common';
import { BookStatus, GitSyncOperation, ShelfReadingStatus, type Prisma } from '@prisma/client';
import type { BookDetailDto, BookSummaryDto, ShelfBookDto } from '@digital-study/shared';
import { ContentService } from '../content/content.service';
import { PrismaService } from '../prisma/prisma.service';
import { GitSyncService } from '../git-sync/git-sync.service';
import type { CreateBookRequest } from './dto/create-book.dto';
import type { PublishBookRequest } from './dto/publish-book.dto';
import type { UpdateShelfBookRequest } from './dto/update-shelf-book.dto';
import { AiIndexService } from '../semantic/ai-index.service';

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentService,
    private readonly gitSync: GitSyncService,
    private readonly index: AiIndexService,
  ) {}

  async findAll(): Promise<BookSummaryDto[]> {
    const books = await this.prisma.book.findMany({
      where: { status: BookStatus.PUBLISHED, deletedAt: null },
      include: { category: true, gitSync: true, tagLinks: { include: { tag: true } } },
      orderBy: [{ publishedAt: 'desc' }, { title: 'asc' }],
    });
    return books.map((book) => this.toSummary(book));
  }

  async findOne(slug: string): Promise<BookDetailDto> {
    const book = await this.prisma.book.findFirst({
      where: { slug, status: BookStatus.PUBLISHED, deletedAt: null },
      include: { category: true, gitSync: true, tagLinks: { include: { tag: true } } },
    });
    if (!book) throw new NotFoundException(`Book not found: ${slug}`);

    return {
      ...this.toSummary(book),
      contentHtml: await this.content.readContent(slug),
    };
  }

  async create(input: PublishBookRequest, ownerId: string) {
    await this.content.saveGeneratedDraft(input, true);
    await this.content.publishDraft(input.slug, true);
    let gitSyncJob = null;
    if (input.syncToGit) {
      try { gitSyncJob = await this.gitSync.enqueue(input.slug); }
      catch (error) { gitSyncJob = { status: 'error', error: error instanceof Error ? error.message : 'Git sync failed' }; }
    }
    await this.addToShelf(input.slug, ownerId);
    void this.index.indexBook(input.slug).catch(() => undefined);
    return { ...(await this.findOne(input.slug)), gitSyncJob };
  }

  async saveDraft(input: CreateBookRequest, ownerId: string): Promise<BookSummaryDto> {
    await this.content.saveGeneratedDraft(input, true);
    await this.content.syncBook(input.slug, true);
    const book = await this.prisma.book.findUniqueOrThrow({ where: { slug: input.slug }, include: { category: true, gitSync: true, tagLinks: { include: { tag: true } } } });
    await this.upsertShelfEntry(book.id, ownerId);
    void this.index.indexBook(input.slug).catch(() => undefined);
    return this.toSummary(book);
  }

  async findAllAdmin(): Promise<BookSummaryDto[]> {
    const books = await this.prisma.book.findMany({
      where: { deletedAt: null },
      include: { category: true, gitSync: true, tagLinks: { include: { tag: true } } },
      orderBy: [{ updatedAt: 'desc' }, { title: 'asc' }],
    });
    return books.map((book) => this.toSummary(book));
  }

  async publish(slug: string, syncToGit = false, ownerId?: string) {
    await this.content.publishDraft(slug);
    let gitSync = null;
    if (syncToGit) {
      try { gitSync = await this.gitSync.enqueue(slug); }
      catch (error) { gitSync = { status: 'error', error: error instanceof Error ? error.message : 'Git sync failed' }; }
    }
    const book = await this.prisma.book.findUniqueOrThrow({ where: { slug }, include: { category: true, gitSync: true, tagLinks: { include: { tag: true } } } });
    if (ownerId) await this.upsertShelfEntry(book.id, ownerId);
    void this.index.indexBook(slug).catch(() => undefined);
    return { ...this.toSummary(book), gitSyncJob: gitSync };
  }

  async listShelf(ownerId: string): Promise<ShelfBookDto[]> {
    const entries = await this.prisma.userShelfBook.findMany({
      where: { ownerId, book: { deletedAt: null } },
      include: { book: { include: { category: true, gitSync: true, tagLinks: { include: { tag: true } } } } },
      orderBy: [{ lastReadAt: 'desc' }, { addedAt: 'desc' }],
    });
    return entries.map((entry) => ({
      ...this.toSummary(entry.book),
      shelf: {
        status: entry.status.toLowerCase() as ShelfBookDto['shelf']['status'],
        progress: entry.progress,
        lastReadAt: entry.lastReadAt?.toISOString() ?? null,
        addedAt: entry.addedAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      },
    }));
  }

  async addToShelf(slug: string, ownerId: string) {
    const book = await this.prisma.book.findFirst({ where: { slug, deletedAt: null } });
    if (!book) throw new NotFoundException(`Book not found: ${slug}`);
    await this.upsertShelfEntry(book.id, ownerId);
    return { slug, added: true };
  }

  async updateShelf(slug: string, ownerId: string, input: UpdateShelfBookRequest) {
    const entry = await this.requireShelfEntry(slug, ownerId);
    const progress = input.status === 'completed' ? 100 : input.progress;
    const status = input.status
      ? ({ want_to_read: ShelfReadingStatus.WANT_TO_READ, reading: ShelfReadingStatus.READING, completed: ShelfReadingStatus.COMPLETED })[input.status]
      : progress === 100 ? ShelfReadingStatus.COMPLETED : progress !== undefined ? ShelfReadingStatus.READING : undefined;
    const updated = await this.prisma.userShelfBook.update({
      where: { id: entry.id },
      data: { ...(progress !== undefined ? { progress } : {}), ...(status ? { status } : {}), lastReadAt: new Date() },
    });
    return { slug, status: updated.status.toLowerCase(), progress: updated.progress, lastReadAt: updated.lastReadAt?.toISOString() ?? null };
  }

  async removeFromShelf(slug: string, ownerId: string) {
    const entry = await this.requireShelfEntry(slug, ownerId);
    await this.prisma.userShelfBook.delete({ where: { id: entry.id } });
    return { slug, removed: true };
  }

  async syncGit(slug: string) {
    return this.gitSync.enqueue(slug);
  }

  async remove(slug: string, deleteFromGit = false) {
    const existing = await this.prisma.book.findUnique({ where: { slug }, select: { id: true } });
    await this.content.removeBook(slug);
    if (existing) void this.index.removeBook(existing.id).catch(() => undefined);
    let gitSync = null;
    if (deleteFromGit) {
      try { gitSync = await this.gitSync.enqueue(slug, GitSyncOperation.DELETE); }
      catch (error) { gitSync = { status: 'error', error: error instanceof Error ? error.message : 'Git sync failed' }; }
    }
    return { slug, deleted: true, gitSyncJob: gitSync };
  }

  private upsertShelfEntry(bookId: number, ownerId: string) {
    return this.prisma.userShelfBook.upsert({
      where: { ownerId_bookId: { ownerId, bookId } },
      create: { ownerId, bookId },
      update: {},
    });
  }

  private async requireShelfEntry(slug: string, ownerId: string) {
    const entry = await this.prisma.userShelfBook.findFirst({ where: { ownerId, book: { slug, deletedAt: null } } });
    if (!entry) throw new NotFoundException(`Shelf book not found: ${slug}`);
    return entry;
  }

  private toSummary(book: Prisma.BookGetPayload<{ include: { category: true; gitSync: true; tagLinks: { include: { tag: true } } } }>): BookSummaryDto {
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
      tags: book.tagLinks.map((link) => link.tag.name),
    };
  }
}
