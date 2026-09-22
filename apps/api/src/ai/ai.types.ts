export interface AiTemplateModule {
  key: string;
  title: string;
  instruction: string;
}

export interface AiTemplate {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  contentType: string;
  systemPrompt: string;
  defaultModules: string[];
  modules: AiTemplateModule[];
}

export interface GenerationInput {
  title: string;
  slug: string;
  author?: string;
  categorySlug?: string;
  categoryName?: string;
  templateId: string;
  modules: string[];
  sourceText: string;
  audience?: string;
  style?: string;
  length?: 'short' | 'medium' | 'long';
  allowBackgroundKnowledge?: boolean;
}

export interface GeneratedSection {
  key: string;
  title: string;
  content: string;
  blocks?: GeneratedContentBlock[];
}

export type GeneratedBlockType =
  | 'lead'
  | 'paragraph'
  | 'quote'
  | 'callout'
  | 'cards'
  | 'steps'
  | 'comparison'
  | 'checklist'
  | 'tags'
  | 'stats';

export interface GeneratedBlockItem {
  title?: string;
  content: string;
  label?: string;
  value?: string;
}

export interface GeneratedContentBlock {
  type: GeneratedBlockType;
  title?: string;
  content?: string;
  attribution?: string;
  items?: GeneratedBlockItem[];
  left?: GeneratedBlockItem;
  right?: GeneratedBlockItem;
}

export interface GeneratedBookDesign {
  theme: 'cosmic' | 'literary' | 'forest' | 'ocean' | 'amber' | 'rose' | 'slate';
  motif: 'constellation' | 'orbit' | 'path' | 'waves' | 'mountain' | 'library';
  eyebrow: string;
  subtitle: string;
  heroQuote: string;
}

export interface GeneratedBook {
  title: string;
  summary: string;
  tags: string[];
  design?: GeneratedBookDesign;
  sections: GeneratedSection[];
}

export interface StoredGenerationResult extends GeneratedBook {
  renderedHtml: string;
}
