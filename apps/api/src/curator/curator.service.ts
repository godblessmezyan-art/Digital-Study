import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { AiStreamingService } from '../ai/ai-streaming.service';
import { AiContextService } from '../reading-ai/ai-context.service';
import type { SemanticResult, SemanticScope } from '../semantic/semantic.types';
import type { CuratorQueryRequest } from './dto/curator-query.dto';

@Injectable()
export class CuratorService {
  constructor(private readonly contexts: AiContextService, private readonly streaming: AiStreamingService) {}

  async search(ownerId: string, query: string, scope: SemanticScope = 'all') {
    const results = await this.contexts.buildCuratorContext(ownerId, query, scope);
    return results.map((result, index) => this.present(result, index));
  }

  async stream(ownerId: string, input: CuratorQueryRequest, response: Response, signal: AbortSignal) {
    const results = await this.contexts.buildCuratorContext(ownerId, input.query, input.scope || 'all');
    const sources = results.map((result, index) => this.present(result, index));
    this.send(response, { type: 'sources', sources });
    if (!sources.length) {
      this.send(response, { type: 'delta', text: '目前没有找到足够相关的个人资料。你可以换一种表达，或先重建 AI 索引后再试。' });
      this.send(response, { type: 'done' });
      return;
    }
    const context = results.slice(0, 8).map((item, index) => ({
      sourceId: `S${index + 1}`,
      category: item.type === 'book' ? '书籍内容' : item.type === 'note' ? '你的笔记' : item.type === 'excerpt' ? '你的书摘' : item.type === 'journal' ? '你的日记' : '你的计划',
      title: item.title,
      source: item.source,
      content: item.content.slice(0, 1800),
    }));
    const history = (input.messages || []).slice(-8).flatMap(item => {
      if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string') return [];
      return [{ role: item.role, content: item.content.trim().slice(0, 6000) } as { role: 'user' | 'assistant'; content: string }];
    });
    if (!history.length || history.at(-1)?.role !== 'user' || history.at(-1)?.content !== input.query) history.push({ role: 'user', content: input.query });
    await this.streaming.stream(this.prompt(context), history, response, signal, '已找到相关资料。请结合来源卡片查看书籍内容、笔记与书摘之间的联系。');
  }

  private prompt(context: Array<Record<string, unknown>>) {
    return [
      '你是“AI 馆长”，负责帮助用户检索和理解自己的数字书房。只能基于下方检索资料陈述个人书房中存在的内容。',
      '回答必须按存在的资料类型区分【书籍内容】【你的笔记】【你的书摘】【你的日记】【你的计划】，最后可给出【AI 综合分析】。不存在的类型不要硬写。',
      '关键结论后引用真实来源编号，如 [S1]。只能使用提供的编号，不得发明来源、书名、章节、笔记或引文。',
      '模型自身补充的通用知识必须放在【AI 综合分析】并明确是补充，不得冒充用户资料。资料不足时直接说明。',
      `检索资料：\n${JSON.stringify(context)}`,
    ].join('\n\n');
  }

  private present(result: SemanticResult, index: number) {
    const href = result.type === 'journal'
      ? `journal/${encodeURIComponent(result.sourceId)}`
      : result.type === 'plan'
        ? `plans/${encodeURIComponent(result.sourceId)}`
        : result.type === 'book'
          ? `index.html#shelf?book=${encodeURIComponent(result.bookSlug || '')}&chapter=${encodeURIComponent(result.chapterId || '')}&text=${encodeURIComponent(result.content.slice(0, 120))}`
          : result.type === 'note'
            ? `index.html#reading?tab=notes&entry=${encodeURIComponent(result.sourceId)}`
            : result.bookSlug
              ? `index.html#shelf?book=${encodeURIComponent(result.bookSlug)}&entry=${encodeURIComponent(result.sourceId)}`
              : `index.html#reading?tab=quotes&entry=${encodeURIComponent(result.sourceId)}`;
    return {
      id: `S${index + 1}`,
      type: result.type,
      sourceId: result.sourceId,
      title: result.title,
      source: result.source,
      bookSlug: result.bookSlug,
      chapterId: result.chapterId,
      excerpt: result.content.slice(0, 360),
      score: Number(result.score.toFixed(4)),
      createdAt: result.sourceCreatedAt?.toISOString() || null,
      href,
    };
  }

  private send(response: Response, value: Record<string, unknown>) {
    if (!response.writableEnded) response.write(`${JSON.stringify(value)}\n`);
  }
}
