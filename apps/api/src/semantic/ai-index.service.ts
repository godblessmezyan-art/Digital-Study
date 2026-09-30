import { Injectable } from '@nestjs/common';
import { BookStatus, ReadingEntryType } from '@prisma/client';
import { ContentService } from '../content/content.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookChunkerService } from './book-chunker.service';
import { EmbeddingService } from './embedding.service';
import type { SemanticType, VectorDocument } from './semantic.types';
import { VectorStore } from './vector-store';

@Injectable()
export class AiIndexService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentService,
    private readonly chunker: BookChunkerService,
    private readonly embeddings: EmbeddingService,
    private readonly store: VectorStore,
  ) {}

  async indexBook(slug: string) {
    const book = await this.prisma.book.findFirst({ where: { slug, deletedAt: null } });
    if (!book || book.status !== BookStatus.PUBLISHED) return;
    const chunks = this.chunker.chunk(await this.content.readContent(slug));
    const documents = chunks.map(chunk => ({ title: `${book.title} · ${chunk.chapterTitle}`, content: chunk.text }));
    await this.store.deleteBySource('book', String(book.id), null);
    await this.embedBatches(documents, (item, vector, model, index) => ({
      key: `book:${book.id}:${chunks[index].chapterId}:${chunks[index].chunkIndex}`,
      ownerId: null, type: 'book', sourceId: String(book.id), bookId: book.id, bookSlug: book.slug,
      chapterId: chunks[index].chapterId, chunkIndex: chunks[index].chunkIndex, title: item.title,
      source: book.title, content: item.content, embedding: vector, embeddingModel: model,
      sourceCreatedAt: book.publishedAt || book.createdAt,
    }));
  }

  async removeBook(bookId: number) { await this.store.deleteBySource('book', String(bookId), null); }

  async indexReadingEntry(id: string) {
    const entry = await this.prisma.readingEntry.findUnique({ where: { id }, include: { book: true } });
    if (!entry) return;
    const type: SemanticType = entry.type === ReadingEntryType.NOTE ? 'note' : 'excerpt';
    const content = [entry.title, entry.quote, entry.content].filter(Boolean).join('\n\n').slice(0, 8000);
    const { model, vectors } = await this.embeddings.embed([content]);
    await this.store.deleteBySource(type, entry.id, entry.ownerId);
    await this.store.upsert([{
      key: `${entry.ownerId}:${type}:${entry.id}`,
      ownerId: entry.ownerId, type, sourceId: entry.id, bookId: entry.bookId, bookSlug: entry.book?.slug || null,
      chapterId: entry.chapterId, chunkIndex: 0, title: entry.title || entry.chapterTitle || (type === 'note' ? '阅读笔记' : '书摘'),
      source: entry.book?.title || entry.source, content, embedding: vectors[0], embeddingModel: model,
      sourceCreatedAt: entry.createdAt,
    }]);
  }

  async removeReadingEntry(type: 'note' | 'quote', id: string, ownerId: string) {
    await this.store.deleteBySource(type === 'note' ? 'note' : 'excerpt', id, ownerId);
  }

  async indexJournalEntry(id: string) {
    const entry = await this.prisma.journalEntry.findUnique({ where: { id } });
    if (!entry) return;
    const content = [entry.title, entry.content].filter(Boolean).join('\n\n').slice(0, 8000);
    const { model, vectors } = await this.embeddings.embed([content]);
    await this.store.deleteBySource('journal', entry.id, entry.ownerId);
    await this.store.upsert([{
      key: `${entry.ownerId}:journal:${entry.id}`,
      ownerId: entry.ownerId, type: 'journal', sourceId: entry.id, bookId: null, bookSlug: null,
      chapterId: null, chunkIndex: 0, title: entry.title,
      source: `旅者手记 · ${entry.entryDate.toISOString().slice(0, 10)}`,
      content, embedding: vectors[0], embeddingModel: model,
      sourceCreatedAt: entry.createdAt,
    }]);
  }

  async removeJournalEntry(id: string, ownerId: string) {
    await this.store.deleteBySource('journal', id, ownerId);
  }

  async indexPlan(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: { tasks: { select: { title: true, status: true }, orderBy: { order: 'asc' } } },
    });
    if (!plan) return;
    const statusLabels: Record<string, string> = { DRAFT: '草稿', ACTIVE: '进行中', COMPLETED: '已完成', ARCHIVED: '已归档' };
    const taskLines = plan.tasks.map((task) => `- ${task.title}（${statusLabels[task.status] || task.status}）`).join('\n');
    const content = [plan.title, plan.description, taskLines ? `任务清单：\n${taskLines}` : ''].filter(Boolean).join('\n\n').slice(0, 8000);
    const { model, vectors } = await this.embeddings.embed([content]);
    await this.store.deleteBySource('plan', plan.id, plan.ownerId);
    await this.store.upsert([{
      key: `${plan.ownerId}:plan:${plan.id}`,
      ownerId: plan.ownerId, type: 'plan', sourceId: plan.id, bookId: null, bookSlug: null,
      chapterId: null, chunkIndex: 0, title: plan.title,
      source: `计划 · ${statusLabels[plan.status] || plan.status}`,
      content, embedding: vectors[0], embeddingModel: model,
      sourceCreatedAt: plan.createdAt,
    }]);
  }

  async removePlan(id: string, ownerId: string) {
    await this.store.deleteBySource('plan', id, ownerId);
  }

  async rebuildAll() {
    await Promise.all([this.store.deleteByType('book'), this.store.deleteByType('note'), this.store.deleteByType('excerpt'), this.store.deleteByType('journal'), this.store.deleteByType('plan')]);
    const books = await this.prisma.book.findMany({ where: { status: BookStatus.PUBLISHED, deletedAt: null }, select: { slug: true } });
    let booksIndexed = 0, recordsIndexed = 0, failed = 0;
    for (const book of books) {
      try { await this.indexBook(book.slug); booksIndexed += 1; } catch { failed += 1; }
    }
    const records = await this.prisma.readingEntry.findMany({ select: { id: true } });
    for (const record of records) {
      try { await this.indexReadingEntry(record.id); recordsIndexed += 1; } catch { failed += 1; }
    }
    const journals = await this.prisma.journalEntry.findMany({ select: { id: true } });
    for (const journal of journals) {
      try { await this.indexJournalEntry(journal.id); recordsIndexed += 1; } catch { failed += 1; }
    }
    const plans = await this.prisma.plan.findMany({ select: { id: true } });
    for (const plan of plans) {
      try { await this.indexPlan(plan.id); recordsIndexed += 1; } catch { failed += 1; }
    }
    return { booksIndexed, recordsIndexed, failed };
  }

  private async embedBatches<T extends { title: string; content: string }>(items: T[], map: (item: T, vector: number[], model: string, index: number) => VectorDocument) {
    for (let offset = 0; offset < items.length; offset += 16) {
      const batch = items.slice(offset, offset + 16);
      const { model, vectors } = await this.embeddings.embed(batch.map(item => `${item.title}\n\n${item.content}`));
      await this.store.upsert(batch.map((item, index) => map(item, vectors[index], model, offset + index)));
    }
  }
}
