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
  tags: string[];
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

export interface ShelfBookDto extends BookSummaryDto {
  shelf: {
    status: 'want_to_read' | 'reading' | 'completed';
    progress: number;
    lastReadAt: string | null;
    addedAt: string;
    updatedAt: string;
  };
}

export interface ReadingEntryDto {
  id: string;
  type: 'note' | 'quote';
  title: string | null;
  content: string;
  source: string | null;
  pageLabel: string | null;
  chapterId: string | null;
  chapterTitle: string | null;
  quote: string | null;
  anchor: ReadingAnchorDto | null;
  tags: string[];
  readingProgress: number | null;
  book: Pick<BookSummaryDto, 'slug' | 'title' | 'author' | 'cover'> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingAnchorDto {
  blockId?: string;
  startBlockId?: string;
  endBlockId?: string;
  exactText: string;
  prefix?: string;
  suffix?: string;
  startOffset?: number;
  endOffset?: number;
}

export interface JournalEntryDto {
  id: string;
  title: string;
  content: string;
  entryDate: string;
  tags: string[];
  mood: string | null;
  weather: string | null;
  worldPeriod: string | null;
  location: string | null;
  coverImage: string | null;
  relatedBooks: string[];
  relatedNotes: string[];
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ChronicleStatus = 'locked' | 'discovered' | 'read';
export type ChronicleType = 'voyage_log' | 'adventure_log' | 'lost_letter' | 'ancient_fragment' | 'map_annotation' | 'observation' | 'archive_record';

export interface ChronicleEntryDto {
  id: string;
  seasonId: string;
  seasonTitle: string;
  chapterId: string;
  chapterTitle: string;
  recordNumber: number;
  status: ChronicleStatus;
  type?: ChronicleType;
  title?: string;
  subtitle?: string | null;
  content?: string;
  excerpt?: string;
  author?: string | null;
  recordDate?: string | null;
  discoverLocation?: string | null;
  coordinates?: unknown;
  regionId?: string | null;
  discoveredAt?: string;
  readAt?: string | null;
}

export interface ChronicleArchiveDto {
  entries: ChronicleEntryDto[];
  discovered: number;
  read: number;
  total: number;
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

// ===== Journal Templates =====

export interface JournalTemplateDto {
  id: string;
  name: string;
  description: string | null;
  content: string;
  tags: string[];
  isDefault: boolean;
  isActive: boolean;
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

// ===== Plans =====

export type PlanStatus = 'draft' | 'active' | 'completed' | 'archived';
export type PlanTaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type PlanTaskPriority = 'low' | 'medium' | 'high';

export interface PlanTaskDto {
  id: string;
  planId: string;
  parentId: string | null;
  title: string;
  description: string | null;
  status: PlanTaskStatus;
  priority: PlanTaskPriority;
  estimatedMinutes: number | null;
  dueDate: string | null;
  order: number;
  acceptanceCriteria: string | null;
  depth: number;
  children?: PlanTaskDto[];
  childCount?: number;
  completedChildCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanNextTaskDto {
  id: string;
  title: string;
  dueDate: string | null;
}

export interface PlanSummaryDto {
  id: string;
  title: string;
  description: string | null;
  status: PlanStatus;
  startDate: string | null;
  dueDate: string | null;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  nextTask: PlanNextTaskDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanDetailDto extends PlanSummaryDto {
  tasks: PlanTaskDto[];
}

// ===== AI Plan Breakdown =====

export interface AiPlanTaskDraft {
  title: string;
  description?: string;
  estimatedMinutes?: number | null;
  priority?: PlanTaskPriority;
  acceptanceCriteria?: string;
  dueDate?: string | null;
}

export interface AiPlanMilestoneDraft {
  title: string;
  description?: string;
  tasks: AiPlanTaskDraft[];
}

export interface AiPlanBreakdownDto {
  summary: string;
  milestones: AiPlanMilestoneDraft[];
  warnings: string[];
}
