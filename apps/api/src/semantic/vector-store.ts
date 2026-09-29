import type { SemanticResult, SemanticType, VectorDocument } from './semantic.types';

export abstract class VectorStore {
  abstract upsert(documents: VectorDocument[]): Promise<void>;
  abstract deleteBySource(type: SemanticType, sourceId: string, ownerId?: string | null): Promise<void>;
  abstract deleteByType(type: SemanticType, ownerId?: string | null): Promise<void>;
  abstract search(ownerId: string, vector: number[], types: SemanticType[], limit: number): Promise<SemanticResult[]>;
}
