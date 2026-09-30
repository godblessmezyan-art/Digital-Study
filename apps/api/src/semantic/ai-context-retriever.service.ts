import { Injectable } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { BookContextRetriever } from './retrievers/book-context.retriever';
import { ExcerptContextRetriever } from './retrievers/excerpt-context.retriever';
import { JournalContextRetriever } from './retrievers/journal-context.retriever';
import { PlanContextRetriever } from './retrievers/plan-context.retriever';
import { NoteContextRetriever } from './retrievers/note-context.retriever';
import type { SemanticResult, SemanticScope } from './semantic.types';

@Injectable()
export class AIContextRetriever {
  constructor(
    private readonly embeddings: EmbeddingService,
    private readonly books: BookContextRetriever,
    private readonly notes: NoteContextRetriever,
    private readonly excerpts: ExcerptContextRetriever,
    private readonly journals: JournalContextRetriever,
    private readonly plans: PlanContextRetriever,
  ) {}

  async retrieve(ownerId: string, query: string, scope: SemanticScope = 'all'): Promise<SemanticResult[]> {
    const { vectors } = await this.embeddings.embed([query]);
    const jobs: Array<Promise<SemanticResult[]>> = [];
    if (scope === 'all' || scope === 'books') jobs.push(this.books.retrieve(ownerId, vectors[0]));
    if (scope === 'all' || scope === 'notes') jobs.push(this.notes.retrieve(ownerId, vectors[0]));
    if (scope === 'all' || scope === 'excerpts') jobs.push(this.excerpts.retrieve(ownerId, vectors[0]));
    if (scope === 'all' || scope === 'journals') jobs.push(this.journals.retrieve(ownerId, vectors[0]));
    if (scope === 'all' || scope === 'plans') jobs.push(this.plans.retrieve(ownerId, vectors[0]));
    const candidates = (await Promise.all(jobs)).flat();
    const threshold = Number(process.env.AI_SEARCH_MIN_SCORE || 0.32);
    return candidates
      .map(item => ({ ...item, score: Math.min(1, item.score + this.lexicalBoost(query, item.content)) }))
      .filter(item => item.score >= threshold)
      .sort((left, right) => right.score - left.score)
      .slice(0, 20);
  }

  private lexicalBoost(query: string, content: string): number {
    const normalized = query.toLowerCase().replace(/\s+/g, '');
    const haystack = content.toLowerCase().replace(/\s+/g, '');
    const tokens = new Set<string>();
    for (let index = 0; index < normalized.length - 1; index += 1) tokens.add(normalized.slice(index, index + 2));
    if (!tokens.size) return 0;
    const matches = [...tokens].filter(token => haystack.includes(token)).length;
    return Math.min(0.15, matches / tokens.size * 0.15);
  }
}
