import { Injectable } from '@nestjs/common';
import type { SemanticResult } from '../semantic.types';
import { VectorStore } from '../vector-store';

@Injectable()
export class JournalContextRetriever {
  constructor(private readonly store: VectorStore) {}
  retrieve(ownerId: string, vector: number[], limit = 20): Promise<SemanticResult[]> {
    return this.store.search(ownerId, vector, ['journal'], limit);
  }
}
