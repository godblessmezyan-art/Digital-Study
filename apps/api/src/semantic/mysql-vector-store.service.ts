import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SemanticResult, SemanticType, VectorDocument } from './semantic.types';
import { VectorStore } from './vector-store';

@Injectable()
export class MysqlVectorStoreService extends VectorStore {
  constructor(private readonly prisma: PrismaService) { super(); }

  async upsert(documents: VectorDocument[]) {
    for (const document of documents) {
      const data = { ...document, embedding: document.embedding as Prisma.InputJsonValue };
      await this.prisma.aiVectorEntry.upsert({ where: { key: document.key }, create: data, update: data });
    }
  }

  async deleteBySource(type: SemanticType, sourceId: string, ownerId?: string | null) {
    await this.prisma.aiVectorEntry.deleteMany({ where: { type, sourceId, ...(ownerId !== undefined ? { ownerId } : {}) } });
  }

  async deleteByType(type: SemanticType, ownerId?: string | null) {
    await this.prisma.aiVectorEntry.deleteMany({ where: { type, ...(ownerId !== undefined ? { ownerId } : {}) } });
  }

  async search(ownerId: string, vector: number[], types: SemanticType[], limit: number): Promise<SemanticResult[]> {
    const rows = await this.prisma.aiVectorEntry.findMany({
      where: {
        type: { in: types },
        OR: [{ ownerId: null }, { ownerId }],
      },
      take: 5000,
    });
    return rows
      .map(row => ({
        key: row.key,
        ownerId: row.ownerId,
        type: row.type as SemanticType,
        sourceId: row.sourceId,
        bookId: row.bookId,
        bookSlug: row.bookSlug,
        chapterId: row.chapterId,
        chunkIndex: row.chunkIndex,
        title: row.title,
        source: row.source,
        content: row.content,
        sourceCreatedAt: row.sourceCreatedAt,
        score: this.cosine(vector, row.embedding as number[]),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);
  }

  private cosine(left: number[], right: number[]): number {
    if (!Array.isArray(right) || !left.length || left.length !== right.length) return 0;
    let dot = 0, leftNorm = 0, rightNorm = 0;
    for (let index = 0; index < left.length; index += 1) {
      dot += left[index] * right[index];
      leftNorm += left[index] ** 2;
      rightNorm += right[index] ** 2;
    }
    return dot / ((Math.sqrt(leftNorm) * Math.sqrt(rightNorm)) || 1);
  }
}
