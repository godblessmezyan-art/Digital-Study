export interface BookMetadata {
  schemaVersion: 1;
  slug: string;
  title: string;
  author?: string;
  summary?: string;
  tags?: string[];
  cover: string;
  status: 'draft' | 'published';
  publishedAt?: string;
  category?: {
    slug: string;
    name: string;
  };
}

export interface SyncResult {
  scanned: number;
  synced: number;
  slugs: string[];
}

export interface GeneratedDraftInput {
  slug: string;
  title: string;
  author?: string;
  summary?: string;
  tags?: string[];
  categorySlug?: string;
  categoryName?: string;
  contentHtml: string;
}
