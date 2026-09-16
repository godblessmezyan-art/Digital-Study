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
}

export interface GeneratedBook {
  title: string;
  summary: string;
  tags: string[];
  sections: GeneratedSection[];
}

export interface StoredGenerationResult extends GeneratedBook {
  renderedHtml: string;
}
