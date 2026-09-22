import { BadGatewayException, Injectable } from '@nestjs/common';
import { AiModelConfigsService, type AiRuntimeConfig } from './ai-model-configs.service';
import type { AiTemplate, GeneratedBook, GeneratedSection, GenerationInput } from './ai.types';

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
    const schemaHint = modules.map((item) => ({ key: item.key, title: item.title, content: '正文' }));
    const prompt = [
      `书名：${input.title}`,
      `作者：${input.author || '未知'}`,
      `目标读者：${input.audience || '普通读者'}`,
      `风格：${input.style || '清晰、克制、准确'}`,
      `篇幅：${input.length || 'medium'}`,
      `是否允许补充背景知识：${input.allowBackgroundKnowledge ? '可以，但必须明确标注' : '不允许'}`,
      `模块要求：\n${modules.map((item) => `- ${item.key} / ${item.title}: ${item.instruction}`).join('\n')}`,
      input.sourceText.trim()
        ? `参考资料：\n${input.sourceText}`
        : '未提供参考资料。请仅基于可靠的通用知识生成；不确定的信息应明确说明，不得编造引文或具体数据。',
      `仅返回 JSON：${JSON.stringify({ title: input.title, summary: '简介', tags: ['标签'], sections: schemaHint })}`,
    ].join('\n\n');
    const response = await this.modelConfigs.sendChat(runtime, {
      model: runtime.model,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: template.systemPrompt },
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
      .map((section) => ({
        key: section.key,
        title: String(section.title || allowed.get(section.key)!.title).slice(0, 160),
        content: String(section.content || '').trim(),
      }));
    if (!sections.length || sections.some((section) => !section.content)) {
      throw new BadGatewayException('AI response contains empty or unknown sections');
    }
    return {
      title: String(book.title || input.title).slice(0, 255),
      summary: String(book.summary || '').slice(0, 5000),
      tags: Array.isArray(book.tags) ? book.tags.map(String).slice(0, 12) : [],
      sections,
    };
  }

  private mockBook(input: GenerationInput, template: AiTemplate): GeneratedBook {
    const modules = template.modules.filter((item) => input.modules.includes(item.key));
    return {
      title: input.title,
      summary: `根据所提供资料整理的《${input.title}》内容草稿。`,
      tags: [template.name, input.categoryName ?? input.categorySlug ?? '未分类'],
      sections: modules.map((module) => ({
        key: module.key,
        title: module.title,
        content: this.mockSection(input, module.title),
      })),
    };
  }

  private mockSection(input: GenerationInput, title: string): string {
    const excerpt = input.sourceText.replace(/\s+/g, ' ').slice(0, 500);
    if (!excerpt) return `${title}基于公开常识生成。当前未提供参考资料，请在发布前核验关键事实。`;
    return `${title}基于用户提供的资料整理。\n\n${excerpt}${input.sourceText.length > 500 ? '……' : ''}`;
  }
}
