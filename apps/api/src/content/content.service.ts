import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { BookStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join, posix } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { getContentRoot } from '../config/paths';
import type { CreateBookRequest } from '../books/dto/create-book.dto';
import type { BookMetadata, SyncResult } from './content.types';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COVER_PATTERN = /^cover\.(?:svg|webp|jpe?g|png)$/i;

@Injectable()
export class ContentService {
  private readonly contentRoot = getContentRoot();

  constructor(private readonly prisma: PrismaService) {}

  async syncAll(): Promise<SyncResult> {
    await mkdir(this.contentRoot, { recursive: true });
    const entries = await readdir(this.contentRoot, { withFileTypes: true });
    const slugs = entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_'))
      .map((entry) => entry.name)
      .sort();

    for (const slug of slugs) {
      await this.syncBook(slug);
    }

    return { scanned: slugs.length, synced: slugs.length, slugs };
  }

  async syncBook(slug: string) {
    this.assertSlug(slug);
    const metadata = await this.readMetadata(slug);
    const contentFile = join(this.contentRoot, slug, 'content.html');
    await stat(contentFile);

    if (metadata.cover) {
      await stat(join(this.contentRoot, slug, metadata.cover));
    }

    const category = metadata.category
      ? await this.prisma.category.upsert({
          where: { slug: metadata.category.slug },
          update: { name: metadata.category.name },
          create: metadata.category,
        })
      : null;

    const data = {
      title: metadata.title,
      author: metadata.author ?? null,
      summary: metadata.summary ?? null,
      cover: metadata.cover,
      contentPath: posix.join('content', 'books', slug, 'content.html'),
      status: metadata.status === 'published' ? BookStatus.PUBLISHED : BookStatus.DRAFT,
      publishedAt: metadata.publishedAt ? new Date(metadata.publishedAt) : null,
      categoryId: category?.id ?? null,
    };

    return this.prisma.book.upsert({
      where: { slug },
      update: data,
      create: { slug, ...data },
      include: { category: true },
    });
  }

  async publish(input: CreateBookRequest): Promise<BookMetadata> {
    this.assertSlug(input.slug);
    await mkdir(this.contentRoot, { recursive: true });
    const targetDirectory = join(this.contentRoot, input.slug);

    try {
      await stat(targetDirectory);
      throw new ConflictException(`Book content already exists: ${input.slug}`);
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    const publishedAt = new Date().toISOString();
    const metadata: BookMetadata = {
      schemaVersion: 1,
      slug: input.slug,
      title: input.title,
      author: input.author,
      summary: input.summary,
      cover: 'cover.svg',
      status: 'published',
      publishedAt,
      category: input.categorySlug
        ? { slug: input.categorySlug, name: input.categoryName ?? input.categorySlug }
        : undefined,
    };
    const temporaryDirectory = join(this.contentRoot, `.${input.slug}-${randomUUID()}`);

    await mkdir(temporaryDirectory);
    try {
      await Promise.all([
        writeFile(join(temporaryDirectory, 'book.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8'),
        writeFile(join(temporaryDirectory, 'content.html'), input.contentHtml, 'utf8'),
        writeFile(join(temporaryDirectory, 'cover.svg'), this.createPlaceholderCover(input.title), 'utf8'),
      ]);
      await rename(temporaryDirectory, targetDirectory);
    } catch (error) {
      await rm(temporaryDirectory, { recursive: true, force: true });
      throw error;
    }

    return metadata;
  }

  async readContent(slug: string): Promise<string> {
    this.assertSlug(slug);
    return readFile(join(this.contentRoot, slug, 'content.html'), 'utf8');
  }

  private async readMetadata(slug: string): Promise<BookMetadata> {
    const raw = await readFile(join(this.contentRoot, slug, 'book.json'), 'utf8');
    const value = JSON.parse(raw) as Partial<BookMetadata>;

    if (
      value.schemaVersion !== 1 ||
      value.slug !== slug ||
      !value.title ||
      !value.cover ||
      basename(value.cover) !== value.cover ||
      !COVER_PATTERN.test(value.cover) ||
      !['draft', 'published'].includes(value.status ?? '')
    ) {
      throw new Error(`Invalid book metadata: ${slug}/book.json`);
    }
    if (value.category && (!SLUG_PATTERN.test(value.category.slug) || !value.category.name)) {
      throw new Error(`Invalid category metadata: ${slug}/book.json`);
    }
    if (value.publishedAt && Number.isNaN(Date.parse(value.publishedAt))) {
      throw new Error(`Invalid publishedAt: ${slug}/book.json`);
    }
    return value as BookMetadata;
  }

  private assertSlug(slug: string): void {
    if (!SLUG_PATTERN.test(slug)) {
      throw new BadRequestException(`Invalid slug: ${slug}`);
    }
  }

  private createPlaceholderCover(title: string): string {
    const escapedTitle = title
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="840" viewBox="0 0 600 840" role="img" aria-label="${escapedTitle}"><rect width="600" height="840" fill="#24384a"/><rect x="34" y="34" width="532" height="772" rx="8" fill="none" stroke="#d7c59b" stroke-width="3"/><text x="300" y="400" fill="#f5eedc" font-family="serif" font-size="44" text-anchor="middle">${escapedTitle}</text><text x="300" y="470" fill="#d7c59b" font-family="sans-serif" font-size="20" text-anchor="middle">数字书房</text></svg>\n`;
  }
}
