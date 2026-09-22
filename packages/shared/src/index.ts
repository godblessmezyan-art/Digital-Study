export type BookStatus = 'draft' | 'published';
export type GitSyncStatus = 'never_synced' | 'pending' | 'syncing' | 'synced' | 'outdated' | 'conflict' | 'error';

export interface CategoryDto {
  slug: string;
  name: string;
  description: string | null;
}

export interface BookSummaryDto {
  slug: string;
  title: string;
  author: string | null;
  summary: string | null;
  cover: string | null;
  status: BookStatus;
  publishedAt: string | null;
  category: CategoryDto | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  contentHash?: string | null;
  gitSync?: {
    status: GitSyncStatus;
    commitSha: string | null;
    lastSyncedAt: string | null;
    lastError: string | null;
  };
}

export interface BookDetailDto extends BookSummaryDto {
  contentHtml: string;
}

export interface CreateBookDto {
  slug: string;
  title: string;
  author?: string;
  summary?: string;
  tags?: string[];
  categorySlug?: string;
  categoryName?: string;
  contentHtml: string;
  cover?: string;
}

export type GenerationStatus =
  | 'queued'
  | 'generating'
  | 'reviewing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AiTemplateModuleDto {
  key: string;
  title: string;
  instruction: string;
}

export interface AiTemplateDto {
  id: string;
  name: string;
  description: string;
  contentType: string;
  defaultModules: string[];
  modules: AiTemplateModuleDto[];
}

export interface CompletedBookMetadataDto {
  author: string;
  slug: string;
}

export interface GeneratedSectionDto {
  key: string;
  title: string;
  content: string;
  blocks?: GeneratedContentBlockDto[];
}

export interface GeneratedBlockItemDto {
  title?: string;
  content: string;
  label?: string;
  value?: string;
}

export interface GeneratedContentBlockDto {
  type: 'lead' | 'paragraph' | 'quote' | 'callout' | 'cards' | 'steps' | 'comparison' | 'checklist' | 'tags' | 'stats';
  title?: string;
  content?: string;
  attribution?: string;
  items?: GeneratedBlockItemDto[];
  left?: GeneratedBlockItemDto;
  right?: GeneratedBlockItemDto;
}

export interface GeneratedBookDesignDto {
  theme: 'cosmic' | 'literary' | 'forest' | 'ocean' | 'amber' | 'rose' | 'slate';
  motif: 'constellation' | 'orbit' | 'path' | 'waves' | 'mountain' | 'library';
  eyebrow: string;
  subtitle: string;
  heroQuote: string;
}

export interface GeneratedBookDto {
  title: string;
  summary: string;
  tags: string[];
  design?: GeneratedBookDesignDto;
  sections: GeneratedSectionDto[];
  renderedHtml: string;
}
