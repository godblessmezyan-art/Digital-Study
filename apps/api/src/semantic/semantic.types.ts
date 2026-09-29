export type SemanticType = 'book' | 'note' | 'excerpt';
export type SemanticScope = 'all' | 'books' | 'notes' | 'excerpts';

export type VectorDocument = {
  key: string;
  ownerId: string | null;
  type: SemanticType;
  sourceId: string;
  bookId: number | null;
  bookSlug: string | null;
  chapterId: string | null;
  chunkIndex: number;
  title: string;
  source: string | null;
  content: string;
  embedding: number[];
  embeddingModel: string;
  sourceCreatedAt: Date | null;
};

export type SemanticResult = Omit<VectorDocument, 'embedding' | 'embeddingModel'> & { score: number };
