export type BookStatus = 'draft' | 'published';

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
}

export interface GeneratedBookDto {
  title: string;
  summary: string;
  tags: string[];
  sections: GeneratedSectionDto[];
  renderedHtml: string;
}
