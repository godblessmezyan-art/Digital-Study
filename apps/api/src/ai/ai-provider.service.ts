import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { AiTemplate, GeneratedBook, GeneratedSection, GenerationInput } from './ai.types';

@Injectable()
export class AiProviderService {
  get provider(): string {
    return process.env.AI_PROVIDER ?? 'openai-compatible';
  }

  get model(): string {
    return process.env.AI_MODEL ?? (this.provider === 'mock' ? 'mock-editor-v1' : '');
  }

  isConfigured(): boolean {
    return this.provider === 'mock' || Boolean(process.env.AI_API_KEY && this.model);
  }

  async generate(input: GenerationInput, template: AiTemplate): Promise<GeneratedBook> {
    if (this.provider === 'mock') return this.mockBook(input, template);
    return this.callCompatibleApi(input, template);
  }

  async regenerateSection(
    input: GenerationInput,
    template: AiTemplate,
    sectionKey: string,
    instruction?: string,
  ): Promise<GeneratedSection> {
    const module = template.modules.find((item) => item.key === sectionKey);
    if (!module) throw new Error(`Unknown template module: ${sectionKey}`);
    if (this.provider === 'mock') {
      return {
        key: module.key,
        title: module.title,
        content: `${this.mockSection(input, module.title)}\n\n修订要求：${instruction || '保持原有结构并提升表达清晰度。'}`,
      };
    }
    const book = await this.callCompatibleApi(
      { ...input, modules: [sectionKey], style: `${input.style ?? ''}。额外修订要求：${instruction ?? '提升清晰度'}` },
      template,
    );
    return book.sections[0];
  }

  private async callCompatibleApi(input: GenerationInput, template: AiTemplate): Promise<GeneratedBook> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('AI provider is not configured');
    }
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
      `参考资料：\n${input.sourceText}`,
      `仅返回 JSON：${JSON.stringify({ title: input.title, summary: '简介', tags: ['标签'], sections: schemaHint })}`,
    ].join('\n\n');
    const baseUrl = (process.env.AI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: template.systemPrompt },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS ?? 120000)),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new BadGatewayException(`AI provider returned ${response.status}: ${detail}`);
    }
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
    return `${title}基于用户提供的资料整理。\n\n${excerpt}${input.sourceText.length > 500 ? '……' : ''}`;
  }
}
