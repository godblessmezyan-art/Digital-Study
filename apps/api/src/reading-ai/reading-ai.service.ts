import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { AiModelConfigsService } from '../ai/ai-model-configs.service';
import { AiContextService, type ReadingAiContext } from './ai-context.service';
import type { ReadingAiRequest } from './dto/reading-ai-request.dto';

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

@Injectable()
export class ReadingAiService {
  constructor(
    private readonly contexts: AiContextService,
    private readonly models: AiModelConfigsService,
  ) {}

  async stream(ownerId: string, input: ReadingAiRequest, response: Response, signal: AbortSignal) {
    const context = await this.contexts.build(ownerId, input);
    const messages = this.messages(input.messages);
    this.send(response, { type: 'sources', sources: this.sources(context) });
    const runtime = await this.models.resolveRuntimeConfig();
    if (runtime.provider === 'mock') {
      const text = `这段文字的核心是在当前章节语境中强调“${context.selectedText.slice(0, 80)}”。\n\n这是 AI 分析示例，请结合原文与自己的阅读判断继续追问。`;
      for (const piece of text.match(/.{1,12}/gs) || []) {
        if (signal.aborted) return;
        this.send(response, { type: 'delta', text: piece });
      }
      this.send(response, { type: 'done' });
      return;
    }
    const upstream = await this.models.sendChat(runtime, {
      model: runtime.model,
      temperature: 0.25,
      stream: true,
      messages: [
        { role: 'system', content: this.systemPrompt(context) },
        ...messages,
      ],
    }, signal);
    await this.relay(upstream, response, signal);
  }

  private systemPrompt(context: ReadingAiContext): string {
    return [
      '你是嵌入书籍阅读过程的阅读助手。回答要克制、准确、帮助理解，不替用户做最终判断。',
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

  private async relay(upstream: globalThis.Response, response: Response, signal: AbortSignal) {
    const contentType = upstream.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const payload = await upstream.json() as { choices?: Array<{ message?: { content?: string } }> };
      const text = payload.choices?.[0]?.message?.content || '';
      if (text) this.send(response, { type: 'delta', text });
      this.send(response, { type: 'done' });
      return;
    }
    const reader = upstream.body?.getReader();
    if (!reader) throw new Error('AI provider did not return a readable stream');
    const decoder = new TextDecoder();
    let buffer = '';
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const chunk = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string }; text?: string }> };
          const text = chunk.choices?.[0]?.delta?.content || chunk.choices?.[0]?.text || '';
          if (text) this.send(response, { type: 'delta', text });
        } catch { /* Ignore provider keep-alive frames. */ }
      }
    }
    if (!signal.aborted) this.send(response, { type: 'done' });
  }

  private send(response: Response, value: Record<string, unknown>) {
    if (!response.writableEnded) response.write(`${JSON.stringify(value)}\n`);
  }
}
