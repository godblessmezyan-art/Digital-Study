import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { AiStreamingService } from '../ai/ai-streaming.service';
import { InscriptionsService } from '../inscriptions/inscriptions.service';
import { BUILTIN_READING_PROMPT } from '../inscriptions/builtin-prompts';
import { AiContextService, type ReadingAiContext } from './ai-context.service';
import type { ReadingAiRequest } from './dto/reading-ai-request.dto';

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

@Injectable()
export class ReadingAiService {
  constructor(
    private readonly contexts: AiContextService,
    private readonly streaming: AiStreamingService,
    private readonly inscriptions: InscriptionsService,
  ) {}

  async stream(ownerId: string, input: ReadingAiRequest, response: Response, signal: AbortSignal) {
    const context = await this.contexts.build(ownerId, input);
    const messages = this.messages(input.messages);
    this.send(response, { type: 'sources', sources: this.sources(context) });
    await this.streaming.stream(
      await this.systemPrompt(context),
      messages,
      response,
      signal,
      `这段文字的核心是在当前章节语境中强调“${context.selectedText.slice(0, 80)}”。\n\n这是 AI 分析示例，请结合原文与自己的阅读判断继续追问。`,
    );
  }

  private async systemPrompt(context: ReadingAiContext): Promise<string> {
    return [
      await this.readingRole(),
      '必须清楚区分三类来源：书中内容、用户自己的笔记/书摘、AI 分析。',
      '只有“选中文字”和“附近上下文”中的原句可以作为书中引用；不得编造书中原句、页码、作者观点或章节内容。',
      '若依据不足，明确说“当前上下文不足以确认”。回答以“AI 分析”作为主体，需要引用时标注“书中内容”，参考用户记录时标注“你的记录”。',
      `当前书籍：${context.currentBook.title}${context.currentBook.author ? ` / ${context.currentBook.author}` : ''}`,
      `当前章节：${context.currentChapter.title || '正文'}`,
      `选中文字：\n${context.selectedText}`,
      context.nearbyText ? `附近上下文：\n${context.nearbyText}` : '附近上下文：未提供',
      context.relatedNotes.length ? `你的相关笔记：\n${JSON.stringify(context.relatedNotes)}` : '你的相关笔记：无',
      context.relatedExcerpts.length ? `你的相关书摘：\n${JSON.stringify(context.relatedExcerpts)}` : '你的相关书摘：无',
    ].join('\n\n');
  }

  private async readingRole(): Promise<string> {
    const inscription = await this.inscriptions.resolveForContext('reading.summary.prompt').catch(() => null);
    return inscription?.content?.trim() || BUILTIN_READING_PROMPT;
  }

  private messages(value: unknown): ConversationMessage[] {
    if (!Array.isArray(value)) return [];
    return value.slice(-12).flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const role = (item as Record<string, unknown>).role;
      const content = (item as Record<string, unknown>).content;
      if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || !content.trim()) return [];
      return [{ role, content: content.trim().slice(0, 8000) }];
    });
  }

  private sources(context: ReadingAiContext) {
    return {
      book: context.currentBook,
      chapter: context.currentChapter,
      selectedText: context.selectedText,
      noteCount: context.relatedNotes.length,
      excerptCount: context.relatedExcerpts.length,
    };
  }

  private send(response: Response, value: Record<string, unknown>) {
    if (!response.writableEnded) response.write(`${JSON.stringify(value)}\n`);
  }
}
