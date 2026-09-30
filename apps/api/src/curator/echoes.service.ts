import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { AiContextService } from '../reading-ai/ai-context.service';
import type { SemanticResult } from '../semantic/semantic.types';
import { AiExecutionService } from '../ai/ai-execution.service';
import type { AiRuntimeConfig } from '../ai/ai-model-configs.service';
import { BUILTIN_ECHO_PROMPT } from '../inscriptions/builtin-prompts';
import { InscriptionsService } from '../inscriptions/inscriptions.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiContextResolverService, type ContextBlock } from './ai-context-resolver.service';
import type { EchoChatRequest, SaveEchoJournalRequest, SaveEchoNoteRequest } from './dto/echo-chat.dto';

/**
 * Echoes of the Archive — the unified AI conversation & execution center.
 * Prompts come from the Inscription Archive, context from the Context Layer,
 * streaming from the shared AiExecutionService. Sessions are persisted.
 */
@Injectable()
export class EchoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inscriptions: InscriptionsService,
    private readonly resolver: AiContextResolverService,
    private readonly aiContext: AiContextService,
    private readonly execution: AiExecutionService,
  ) {}

  async chat(ownerId: string, dto: EchoChatRequest, response: Response): Promise<void> {
    const message = dto.message.trim();
    if (!message) throw new BadRequestException('请输入你的问题');

    // ===== session =====
    let sessionId = dto.sessionId;
    if (sessionId) await this.requireSession(sessionId, ownerId);
    const session = sessionId
      ? await this.prisma.echoSession.update({ where: { id: sessionId }, data: { inscriptionId: dto.inscriptionId ?? null, model: dto.model ?? null } })
      : await this.prisma.echoSession.create({
        data: { ownerId, title: message.slice(0, 40), inscriptionId: dto.inscriptionId ?? null, model: dto.model ?? null },
      });
    sessionId = session.id;

    // ===== system prompt: inscription first, archive default next, builtin last =====
    let systemPrompt: string;
    let inscriptionVersion: number | null = null;
    if (dto.inscriptionId) {
      const inscription = await this.inscriptions.get(dto.inscriptionId);
      if (inscription.type !== 'PROMPT' || !inscription.enabled) {
        throw new BadRequestException('所选铭文不可用（已停用或不是提示词）');
      }
      const renderedContent = this.execution.renderPrompt(inscription.content, dto.variables);
      systemPrompt = inscription.systemPrompt
        ? `${this.execution.renderPrompt(inscription.systemPrompt, dto.variables)}\n\n${renderedContent}`
        : renderedContent;
      inscriptionVersion = inscription.currentVersion;
    } else {
      const archiveDefault = await this.inscriptions.resolveForContext('curator.echo.prompt').catch(() => null);
      systemPrompt = archiveDefault?.content?.trim() || BUILTIN_ECHO_PROMPT;
    }

    // ===== context layer =====
    const blocks = await this.resolver.resolve(dto.contextRefs, ownerId);
    let semantic: string[] = [];
    if (dto.useLibrary) {
      const results = await this.aiContext.buildCuratorContext(ownerId, message, 'all');
      semantic = results.slice(0, 8).map((entry, index) => this.presentSource(entry, index));
    }
    const contextText = [
      ...blocks.map((block) => `【${block.label}】\n${block.content}`),
      ...(semantic.length ? [`【知识库检索】\n${semantic.join('\n\n')}`] : []),
    ].join('\n\n');
    const userContent = contextText ? `${contextText}\n\n旅者提问：${message}` : message;

    // ===== history =====
    const stored = await this.prisma.echoMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    const history = stored.slice(-12).map((row) => ({ role: row.role === 'assistant' ? 'assistant' as const : 'user' as const, content: row.content }));

    await this.prisma.echoMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: message,
        inscriptionId: dto.inscriptionId ?? null,
        inscriptionVersion,
        contextJson: (dto.contextRefs ?? []) as unknown as Prisma.InputJsonValue,
      },
    });

    // ===== stream =====
    response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.setHeader('X-Echo-Session', sessionId);
    response.flushHeaders?.();

    const controller = new AbortController();
    response.on('close', () => controller.abort());

    let collected = '';
    let runtime: AiRuntimeConfig | null = null;
    try {
      const executed = await this.execution.stream(
        {
          systemPrompt,
          messages: [...history, { role: 'user', content: userContent }],
          modelId: dto.model,
          mockText: `（mock 回响）关于「${message.slice(0, 40)}」：当前未配置真实模型，请在铭文台设置中添加模型后重试。${contextText ? '（已注入站内上下文）' : ''}`,
        },
        response,
        controller.signal,
        (text) => { collected += text; },
      );
      runtime = executed.runtime;
    } catch (error) {
      const payload = { type: 'error', message: error instanceof Error ? error.message : 'AI 服务暂时不可用' };
      if (!response.writableEnded) response.write(`${JSON.stringify(payload)}\n`);
      collected = collected || `[执行失败] ${payload.message}`;
    }

    if (collected.trim()) {
      await this.prisma.echoMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: collected,
          model: runtime?.displayName || runtime?.model || null,
          inscriptionId: dto.inscriptionId ?? null,
          inscriptionVersion,
        },
      }).catch(() => undefined);
    }
    if (!response.writableEnded) response.end();
  }

  // ===== sessions =====

  listSessions(ownerId: string) {
    return this.prisma.echoSession.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: { id: true, title: true, inscriptionId: true, model: true, createdAt: true, updatedAt: true, _count: { select: { messages: true } } },
    });
  }

  async getSession(ownerId: string, id: string) {
    const session = await this.requireSession(id, ownerId);
    const messages = await this.prisma.echoMessage.findMany({ where: { sessionId: id }, orderBy: { createdAt: 'asc' } });
    return { ...session, messages };
  }

  async deleteSession(ownerId: string, id: string) {
    await this.requireSession(id, ownerId);
    await this.prisma.echoSession.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ===== save outputs via existing business tables =====

  async saveAsNote(ownerId: string, dto: SaveEchoNoteRequest) {
    const note = await this.prisma.readingEntry.create({
      data: { ownerId, type: 'NOTE', title: dto.title?.trim() || '秘典回响摘录', content: dto.content.trim(), source: '秘典回响' },
    });
    return { id: note.id, saved: 'note' as const };
  }

  async saveAsJournal(ownerId: string, dto: SaveEchoJournalRequest) {
    const entry = await this.prisma.journalEntry.create({
      data: { ownerId, title: dto.title?.trim() || '秘典回响', entryDate: new Date(), content: dto.content.trim(), tags: [] as unknown as Prisma.InputJsonValue },
    });
    return { id: entry.id, saved: 'journal' as const };
  }

  // ===== inscription & model pickers =====

  async promptInscriptions() {
    const rows = await this.inscriptions.list({ type: 'PROMPT', enabled: '1', sort: 'name' });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category?.name ?? null,
      currentVersion: row.currentVersion,
      hasVariables: /\{\{\s*[\w-]+\s*\}\}/.test(row.content),
    }));
  }

  inscriptionDetail(id: string) {
    return this.inscriptions.get(id);
  }

  // ===== internals =====

  private async requireSession(id: string, ownerId: string) {
    const session = await this.prisma.echoSession.findFirst({ where: { id, ownerId } });
    if (!session) throw new NotFoundException('会话不存在');
    return session;
  }

  // flat SemanticResult
  private presentSource(result: SemanticResult, index: number): string {
    const category = result.type === 'book' ? '书籍内容'
      : result.type === 'note' ? '你的笔记'
        : result.type === 'excerpt' ? '你的书摘'
          : result.type === 'journal' ? '你的日记' : '你的计划';
    const source = result.source ? `（${result.source}）` : '';
    return `${index + 1}. 【${category}】${result.title}${source}
${result.content.slice(0, 400)}`;
  }
}
