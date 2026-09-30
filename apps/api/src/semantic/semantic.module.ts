import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ContentModule } from '../content/content.module';
import { AIContextRetriever } from './ai-context-retriever.service';
import { AiIndexService } from './ai-index.service';
import { BookChunkerService } from './book-chunker.service';
import { EmbeddingService } from './embedding.service';
import { MysqlVectorStoreService } from './mysql-vector-store.service';
import { BookContextRetriever } from './retrievers/book-context.retriever';
import { ExcerptContextRetriever } from './retrievers/excerpt-context.retriever';
import { JournalContextRetriever } from './retrievers/journal-context.retriever';
import { PlanContextRetriever } from './retrievers/plan-context.retriever';
import { NoteContextRetriever } from './retrievers/note-context.retriever';
import { VectorStore } from './vector-store';

@Module({
  imports: [AiModule, ContentModule],
  providers: [
    EmbeddingService,
    BookChunkerService,
    MysqlVectorStoreService,
    { provide: VectorStore, useExisting: MysqlVectorStoreService },
    AiIndexService,
    BookContextRetriever,
    NoteContextRetriever,
    ExcerptContextRetriever,
    JournalContextRetriever,
    PlanContextRetriever,
    AIContextRetriever,
  ],
  exports: [AiIndexService, AIContextRetriever, EmbeddingService, VectorStore],
})
export class SemanticModule {}
