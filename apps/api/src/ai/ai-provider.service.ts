import { BadGatewayException, Injectable } from '@nestjs/common';
import { AiModelConfigsService, type AiRuntimeConfig } from './ai-model-configs.service';
import type {
  AiTemplate,
  GeneratedBook,
  GeneratedBookDesign,
  GeneratedContentBlock,
  GeneratedSection,
  GenerationInput,
} from './ai.types';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable()
export class AiProviderService {
  constructor(private readonly modelConfigs: AiModelConfigsService) {}

  configuration() {
    return this.modelConfigs.publicConfiguration();
  }

  runtimeConfiguration() {
    return this.modelConfigs.resolveRuntimeConfig();
  }

  async generate(input: GenerationInput, template: AiTemplate): Promise<GeneratedBook> {
    const runtime = await this.runtimeConfiguration();
    if (runtime.provider === 'mock') return this.mockBook(input, template);
    return this.callCompatibleApi(input, template, runtime);
  }

  async completeBookMetadata(title: string): Promise<{ author: string; slug: string }> {
    const runtime = await this.runtimeConfiguration();
    if (runtime.provider === 'mock') return { author: '', slug: this.normalizeSlug(title) };
    const response = await this.modelConfigs.sendChat(runtime, {
      model: runtime.model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: '你是严谨的图书目录助手。根据书名识别作者，并生成简短、可读的英文 URL slug。不确定作者时返回空字符串，不得编造。',
        },
        {
          role: 'user',
          content: `书名：${title}\n仅返回 JSON：${JSON.stringify({ author: '作者姓名或空字符串', slug: 'lowercase-english-slug' })}`,
        },
      ],
    });
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new BadGatewayException('AI provider returned an empty response');
    const metadata = this.parseJson(content) as { author?: unknown; slug?: unknown };
    const author = typeof metadata?.author === 'string' ? metadata.author.trim().slice(0, 160) : '';
    const proposedSlug = typeof metadata?.slug === 'string' ? metadata.slug : '';
    return { author, slug: this.normalizeSlug(proposedSlug || title) };
  }

  async regenerateSection(
    input: GenerationInput,
    template: AiTemplate,
    sectionKey: string,
    instruction?: string,
  ): Promise<GeneratedSection> {
    const module = template.modules.find((item) => item.key === sectionKey);
    if (!module) throw new Error(`Unknown template module: ${sectionKey}`);
    const runtime = await this.runtimeConfiguration();
    if (runtime.provider === 'mock') {
      return {
        key: module.key,
        title: module.title,
        content: `${this.mockSection(input, module.title)}\n\n修订要求：${instruction || '保持原有结构并提升表达清晰度。'}`,
      };
    }
    const book = await this.callCompatibleApi(
      { ...input, modules: [sectionKey], style: `${input.style ?? ''}。额外修订要求：${instruction ?? '提升清晰度'}` },
      template,
      runtime,
    );
    return book.sections[0];
  }

  private async callCompatibleApi(
    input: GenerationInput,
    template: AiTemplate,
    runtime: AiRuntimeConfig,
  ): Promise<GeneratedBook> {
    const modules = template.modules.filter((item) => input.modules.includes(item.key));
    const sectionHint = modules.map((item) => ({ key: item.key, title: item.title }));
    const blockExamples = [
      { type: 'lead', content: '本章导语' },
      { type: 'paragraph', content: '有事实依据的正文段落' },
      { type: 'cards', title: '核心观点', items: [{ title: '观点名称', content: '解释与应用' }] },
      { type: 'steps', title: '实践步骤', items: [{ title: '第一步', content: '具体行动' }] },
      { type: 'comparison', title: '对照', left: { title: '常见误区', content: '说明' }, right: { title: '更好做法', content: '说明' } },
      { type: 'checklist', title: '行动清单', items: [{ content: '可执行且可核对的行动' }] },
    ];
    const lengthGuide = input.length === 'long' ? '每章约 1000–1500 个汉字' : input.length === 'short' ? '每章约 300–500 个汉字' : '每章约 600–900 个汉字';
    const knowledgePolicy = input.sourceText.trim()
      ? input.allowBackgroundKnowledge ? '可补充可靠背景知识，但必须与用户资料明确区分。' : '只能依据用户资料，不补充外部事实。'
      : '用户未提供参考资料，本次明确允许使用可靠的通用知识；不确定之处要说明，不得捏造引文、页码或具体数据。';
    const prompt = [
      `书名：${input.title}`,
      `作者：${input.author || '未知'}`,
      `目标读者：${input.audience || '普通读者'}`,
      `风格：${input.style || '清晰、克制、准确'}`,
      `篇幅：${input.length || 'medium'}`,
      `知识边界：${knowledgePolicy}`,
      `内容密度：${lengthGuide}。观点必须展开解释，并给出关系、例子或应用；不要用空泛口号凑字数。`,
      `模块要求：\n${modules.map((item) => `- ${item.key} / ${item.title}: ${item.instruction}`).join('\n')}`,
      input.sourceText.trim()
        ? `参考资料：\n${input.sourceText}`
        : '未提供参考资料。请仅基于可靠的通用知识生成；不确定的信息应明确说明，不得编造引文或具体数据。',
      `先为本书制定统一视觉策划，再写作各模块。章节必须使用丰富内容块，避免把所有内容塞进一个长段落。根据语义选择 lead、paragraph、callout、cards、steps、comparison、checklist、tags、stats；每章使用 2 至 5 个内容块，整本书至少使用 5 种不同块类型。quote 只能用于参考资料明确包含的原句，否则使用 callout。`,
      `视觉主题只能选择 cosmic、literary、forest、ocean、amber、rose、slate；视觉意象只能选择 constellation、orbit、path、waves、mountain、library。`,
      `章节顺序与标识必须严格使用：${JSON.stringify(sectionHint)}。内容块示例：${JSON.stringify(blockExamples)}。`,
      `仅返回 JSON：${JSON.stringify({ title: input.title, summary: '准确而有吸引力的简介', tags: ['标签'], design: { theme: 'literary', motif: 'library', eyebrow: '阅读专题', subtitle: '凝练而独特的副标题', heroQuote: '一句原创的主题提炼，不冒充原书引文' }, sections: sectionHint.map((section) => ({ ...section, content: '本章纯文本摘要，用于列表预览', blocks: [{ type: 'lead', content: '本章导语' }, { type: 'paragraph', content: '正文' }] })) })}`,
    ].join('\n\n');
    const response = await this.modelConfigs.sendChat(runtime, {
      model: runtime.model,
      temperature: 0.3,
      max_tokens: input.length === 'long' ? 14000 : input.length === 'short' ? 5000 : 9000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${template.systemPrompt}\n\n${knowledgePolicy}\n你同时是一名资深中文图书编辑与数字出版设计师。内容要准确、充实、有层次；结构要适合视觉化呈现，避免重复、空话和模板化小标题。` },
        { role: 'user', content: prompt },
      ],
    });
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new BadGatewayException('AI provider returned an empty response');
    return this.validateBook(this.parseJson(content), input, template);
  }

  private parseJson(content: string): unknown {
    const normalized = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      return JSON.parse(normalized);
    } catch {
      throw new BadGatewayException('AI provider returned invalid JSON');
    }
  }

  private normalizeSlug(value: string): string {
    const slug = value
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 160)
      .replace(/-+$/g, '');
    if (SLUG_PATTERN.test(slug)) return slug;
    const fallback = Array.from(value).reduce((hash, character) => ((hash * 31) + character.codePointAt(0)!) >>> 0, 2166136261);
    return `book-${fallback.toString(36)}`;
  }

  private validateBook(value: unknown, input: GenerationInput, template: AiTemplate): GeneratedBook {
    const book = value as Partial<GeneratedBook>;
    if (!book || !Array.isArray(book.sections)) {
      throw new BadGatewayException('AI response does not contain sections');
    }
    const allowed = new Map(template.modules.map((item) => [item.key, item]));
    const sections = book.sections
      .filter((section) => input.modules.includes(section.key) && allowed.has(section.key))
      .map((section) => {
        const validatedBlocks = this.validateBlocks(section.blocks);
        const blocks = validatedBlocks.length ? validatedBlocks : this.fallbackBlocks(section.content);
        const content = String(section.content || this.blocksToText(blocks)).trim();
        return {
          key: section.key,
          title: String(section.title || allowed.get(section.key)!.title).slice(0, 160),
          content,
          ...(blocks.length ? { blocks } : {}),
        };
      });
    if (!sections.length || sections.some((section) => !section.content)) {
      throw new BadGatewayException('AI response contains empty or unknown sections');
    }
    return {
      title: String(book.title || input.title).slice(0, 255),
      summary: String(book.summary || '').slice(0, 5000),
      tags: Array.isArray(book.tags) ? book.tags.map(String).slice(0, 12) : [],
      design: this.validateDesign(book.design),
      sections,
    };
  }

  private validateDesign(value: unknown): GeneratedBookDesign {
    const design = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const themes: GeneratedBookDesign['theme'][] = ['cosmic', 'literary', 'forest', 'ocean', 'amber', 'rose', 'slate'];
    const motifs: GeneratedBookDesign['motif'][] = ['constellation', 'orbit', 'path', 'waves', 'mountain', 'library'];
    const theme = themes.includes(design.theme as GeneratedBookDesign['theme']) ? design.theme as GeneratedBookDesign['theme'] : 'literary';
    const motif = motifs.includes(design.motif as GeneratedBookDesign['motif']) ? design.motif as GeneratedBookDesign['motif'] : 'library';
    return {
      theme,
      motif,
      eyebrow: this.text(design.eyebrow, 40) || '数字书房',
      subtitle: this.text(design.subtitle, 120),
      heroQuote: this.text(design.heroQuote, 240),
    };
  }

  private validateBlocks(value: unknown): GeneratedContentBlock[] {
    if (!Array.isArray(value)) return [];
    const supported = new Set(['lead', 'paragraph', 'quote', 'callout', 'cards', 'steps', 'comparison', 'checklist', 'tags', 'stats']);
    return value.slice(0, 10).flatMap((raw) => {
      if (!raw || typeof raw !== 'object') return [];
      const block = raw as Record<string, unknown>;
      const type = this.text(block.type, 20) as GeneratedContentBlock['type'];
      if (!supported.has(type)) return [];
      const content = this.text(block.content, 6000);
      const title = this.text(block.title, 160);
      const attribution = this.text(block.attribution, 160);
      const items = Array.isArray(block.items)
        ? block.items.slice(0, 8).flatMap((item) => {
            if (!item || typeof item !== 'object') return [];
            const entry = item as Record<string, unknown>;
            const itemContent = this.text(entry.content, 1800);
            if (!itemContent) return [];
            return [{
              content: itemContent,
              ...(this.text(entry.title, 120) ? { title: this.text(entry.title, 120) } : {}),
              ...(this.text(entry.label, 80) ? { label: this.text(entry.label, 80) } : {}),
              ...(this.text(entry.value, 80) ? { value: this.text(entry.value, 80) } : {}),
            }];
          })
        : [];
      const item = (side: unknown) => {
        if (!side || typeof side !== 'object') return undefined;
        const entry = side as Record<string, unknown>;
        const sideContent = this.text(entry.content, 2400);
        if (!sideContent) return undefined;
        return { content: sideContent, ...(this.text(entry.title, 120) ? { title: this.text(entry.title, 120) } : {}) };
      };
      const left = item(block.left);
      const right = item(block.right);
      if (type === 'comparison' && (!left || !right)) return [];
      if (['cards', 'steps', 'checklist', 'tags', 'stats'].includes(type) && !items.length) return [];
      if (!['cards', 'steps', 'comparison', 'checklist', 'tags', 'stats'].includes(type) && !content) return [];
      return [{ type, ...(title ? { title } : {}), ...(content ? { content } : {}), ...(attribution ? { attribution } : {}), ...(items.length ? { items } : {}), ...(left ? { left } : {}), ...(right ? { right } : {}) }];
    });
  }

  private blocksToText(blocks: GeneratedContentBlock[]): string {
    return blocks.flatMap((block) => [block.content, block.left?.content, block.right?.content, ...(block.items?.map((item) => item.content) ?? [])]).filter(Boolean).join('\n\n');
  }

  private fallbackBlocks(value: unknown): GeneratedContentBlock[] {
    const content = this.text(value, 12000);
    if (!content) return [];
    const paragraphs = content.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
    if (paragraphs.length < 2) return [{ type: 'paragraph', content }];
    return [
      { type: 'lead', content: paragraphs[0] },
      ...paragraphs.slice(1, 6).map((paragraph) => ({ type: 'paragraph' as const, content: paragraph })),
    ];
  }

  private text(value: unknown, max: number): string {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
  }

  private mockBook(input: GenerationInput, template: AiTemplate): GeneratedBook {
    const modules = template.modules.filter((item) => input.modules.includes(item.key));
    return {
      title: input.title,
      summary: `根据所提供资料整理的《${input.title}》内容草稿。`,
      tags: [template.name, input.categoryName ?? input.categorySlug ?? '未分类'],
      design: { theme: 'literary', motif: 'library', eyebrow: template.name, subtitle: '一份清晰、可靠的主题阅读', heroQuote: '从理解开始，把阅读转化为行动。' },
      sections: modules.map((module) => ({
        key: module.key,
        title: module.title,
        content: this.mockSection(input, module.title),
        blocks: [
          { type: 'lead', content: `${module.title}提要` },
          { type: 'paragraph', content: this.mockSection(input, module.title) },
        ],
      })),
    };
  }

  private mockSection(input: GenerationInput, title: string): string {
    const excerpt = input.sourceText.replace(/\s+/g, ' ').slice(0, 500);
    if (!excerpt) return `${title}基于公开常识生成。当前未提供参考资料，请在发布前核验关键事实。`;
    return `${title}基于用户提供的资料整理。\n\n${excerpt}${input.sourceText.length > 500 ? '……' : ''}`;
  }
}
