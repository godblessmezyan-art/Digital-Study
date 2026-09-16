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
  categorySlug?: string;
  categoryName?: string;
  contentHtml: string;
  cover?: string;
}
