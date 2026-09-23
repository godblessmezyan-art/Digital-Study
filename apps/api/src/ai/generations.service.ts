import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { GenerationStatus, Prisma, type GenerationTask } from '@prisma/client';
import { ContentService } from '../content/content.service';
import { GitSyncService } from '../git-sync/git-sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiProviderService } from './ai-provider.service';
import type { GenerationInput, StoredGenerationResult } from './ai.types';
import type { CreateGenerationRequest } from './dto/create-generation.dto';
import { HtmlRendererService } from './html-renderer.service';
import { TemplatesService } from './templates.service';

@Injectable()
export class GenerationsService implements OnApplicationBootstrap {
  private active = 0;
  private draining = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: TemplatesService,
    private readonly provider: AiProviderService,
    private readonly renderer: HtmlRendererService,
    private readonly content: ContentService,
    private readonly gitSync: GitSyncService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.prisma.generationTask.updateMany({
      where: { status: { in: [GenerationStatus.GENERATING, GenerationStatus.REVIEWING] } },
      data: { status: GenerationStatus.QUEUED, progress: 0, currentStep: '等待恢复' },
    });
    this.kick();
  }

  async createForOwner(input: CreateGenerationRequest, ownerId: string) {
    const runtime = await this.provider.runtimeConfiguration();
    if (!runtime.configured) {
      throw new BadRequestException('AI provider is not configured. Add a model in AI Workshop settings or configure the environment fallback.');
    }
    const template = await this.templates.get(input.templateId);
    const allowed = new Set(template.modules.map((module) => module.key));
    const modules = [...new Set(input.modules)];
    if (modules.some((module) => !allowed.has(module))) {
      throw new BadRequestException('One or more modules do not belong to the selected template');
    }
    if (input.clientRequestId) {
      const duplicate = await this.prisma.generationTask.findUnique({ where: { clientRequestId: input.clientRequestId } });
      if (duplicate && duplicate.ownerId === ownerId) return { ...this.present(duplicate), reused: true };
    }
    const active = await this.findActive(ownerId, input.slug);
    if (active) return { ...this.present(active), reused: true };
    const { clientRequestId, ...generationInput } = input;
    const normalized: GenerationInput = { ...generationInput, modules };
    let task: GenerationTask;
    try {
      task = await this.prisma.generationTask.create({
        data: {
          ownerId,
          clientRequestId: clientRequestId ?? null,
          templateId: input.templateId,
          title: input.title,
          author: input.author ?? null,
          slug: input.slug,
          provider: runtime.provider,
          model: runtime.model,
          inputJson: normalized as unknown as Prisma.InputJsonValue,
          currentStep: '等待生成',
        },
      });
    } catch (error) {
      if (clientRequestId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicate = await this.prisma.generationTask.findUnique({ where: { clientRequestId } });
        if (duplicate && duplicate.ownerId === ownerId) return { ...this.present(duplicate), reused: true };
      }
      throw error;
    }
    this.kick();
    return { ...this.present(task), reused: false };
  }

  async list(ownerId: string) {
    const tasks = await this.prisma.generationTask.findMany({
      where: this.ownerWhere(ownerId),
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return tasks.map((task) => this.present(task, false));
  }

  async recover(ownerId: string) {
    const active = await this.prisma.generationTask.findFirst({
      where: { ...this.ownerWhere(ownerId), status: { in: [GenerationStatus.QUEUED, GenerationStatus.GENERATING, GenerationStatus.REVIEWING] } },
      orderBy: { updatedAt: 'desc' },
    });
    if (active) return this.present(active);
    const latest = await this.prisma.generationTask.findFirst({
      where: this.ownerWhere(ownerId),
      orderBy: { updatedAt: 'desc' },
    });
    return latest ? this.present(latest) : null;
  }

  async get(id: string, ownerId?: string) {
    return this.present(ownerId ? await this.requireOwnedTask(id, ownerId) : await this.requireTask(id));
  }

  async cancel(id: string, ownerId: string) {
    const task = await this.requireOwnedTask(id, ownerId);
    const cancellableStatuses: GenerationStatus[] = [
      GenerationStatus.QUEUED,
      GenerationStatus.GENERATING,
      GenerationStatus.REVIEWING,
    ];
    if (!cancellableStatuses.includes(task.status)) {
      throw new ConflictException('Only active generation tasks can be cancelled');
    }
    return this.present(
      await this.prisma.generationTask.update({
        where: { id },
        data: { status: GenerationStatus.CANCELLED, currentStep: '已取消' },
      }),
    );
  }

  async retry(id: string, ownerId: string, clientRequestId?: string) {
    const source = await this.requireOwnedTask(id, ownerId);
    if (source.status !== GenerationStatus.FAILED && source.status !== GenerationStatus.CANCELLED) {
      throw new ConflictException('Only failed or cancelled tasks can be retried');
    }
    if (clientRequestId) {
      const duplicate = await this.prisma.generationTask.findUnique({ where: { clientRequestId } });
      if (duplicate && duplicate.ownerId === ownerId) return { ...this.present(duplicate), reused: true };
    }
    const active = await this.findActive(ownerId, source.slug);
    if (active) return { ...this.present(active), reused: true };
    const input = source.inputJson as unknown as GenerationInput;
    const runtime = await this.provider.runtimeConfiguration();
    if (!runtime.configured) throw new BadRequestException('AI provider is not configured');
    const task = await this.prisma.generationTask.create({
      data: {
        ownerId,
        clientRequestId: clientRequestId ?? null,
        parentTaskId: source.id,
        attempt: source.attempt + 1,
        templateId: input.templateId,
        title: input.title,
        author: input.author ?? null,
        slug: input.slug,
        provider: runtime.provider,
        model: runtime.model,
        inputJson: input as unknown as Prisma.InputJsonValue,
        currentStep: '等待重新生成',
      },
    });
    this.kick();
    return { ...this.present(task), reused: false };
  }

  async regenerateSection(id: string, sectionKey: string, instruction: string | undefined, ownerId: string) {
    const task = await this.requireOwnedTask(id, ownerId);
    const result = this.requireResult(task);
    const input = task.inputJson as unknown as GenerationInput;
    const template = await this.templates.get(task.templateId);
    if (!result.sections.some((section) => section.key === sectionKey)) {
      throw new NotFoundException(`Generated section not found: ${sectionKey}`);
    }
    await this.prisma.generationTask.update({
      where: { id },
      data: { status: GenerationStatus.GENERATING, progress: 70, currentStep: `重新生成：${sectionKey}` },
    });
    try {
      const section = await this.provider.regenerateSection(input, template, sectionKey, instruction);
      const sections = result.sections.map((item) => (item.key === sectionKey ? section : item));
      const next = { ...result, sections };
      next.renderedHtml = this.renderer.render(next, input);
      const version =
        (await this.prisma.generationRevision.count({ where: { taskId: id, sectionKey } })) + 1;
      await this.prisma.$transaction([
        this.prisma.generationRevision.create({
          data: {
            taskId: id,
            sectionKey,
            version,
            instruction: instruction ?? null,
            resultJson: section as unknown as Prisma.InputJsonValue,
          },
        }),
        this.prisma.generationTask.update({
          where: { id },
          data: {
            status: GenerationStatus.COMPLETED,
            progress: 100,
            currentStep: '修订完成',
            resultJson: next as unknown as Prisma.InputJsonValue,
          },
        }),
      ]);
      return this.get(id, ownerId);
    } catch (error) {
      await this.prisma.generationTask.update({
        where: { id },
        data: {
          status: GenerationStatus.COMPLETED,
          progress: 100,
          currentStep: '模块修订失败，已保留原结果',
          error: error instanceof Error ? error.message.slice(0, 4000) : 'Unknown revision error',
        },
      });
      throw error;
    }
  }

  async saveDraft(id: string, ownerId: string) {
    const task = await this.requireOwnedTask(id, ownerId);
    const result = this.requireResult(task);
    const input = task.inputJson as unknown as GenerationInput;
    await this.content.saveGeneratedDraft(
      {
        slug: input.slug,
        title: result.title || input.title,
        author: input.author,
        summary: result.summary,
        categorySlug: input.categorySlug,
        categoryName: input.categoryName,
        contentHtml: result.renderedHtml,
      },
      task.bookSlug === input.slug,
    );
    await this.content.syncBook(input.slug, true);
    await this.prisma.generationTask.update({ where: { id }, data: { bookSlug: input.slug } });
    return { slug: input.slug, status: 'draft' };
  }

  async publish(id: string, syncToGit: boolean, ownerId: string) {
    const task = await this.requireOwnedTask(id, ownerId);
    if (!task.bookSlug) await this.saveDraft(id, ownerId);
    const refreshed = await this.requireOwnedTask(id, ownerId);
    const book = await this.content.publishDraft(refreshed.bookSlug!);
    let gitSync = null;
    if (syncToGit) {
      try { gitSync = await this.gitSync.enqueue(book.slug); }
      catch (error) { gitSync = { status: 'error', error: error instanceof Error ? error.message : 'Git sync failed' }; }
    }
    return { slug: book.slug, status: 'published', gitSyncJob: gitSync };
  }

  private kick(): void {
    queueMicrotask(() => void this.drain());
  }

  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      const requestedConcurrency = Number(process.env.AI_MAX_CONCURRENCY ?? 1);
      const concurrency = Number.isFinite(requestedConcurrency) ? Math.max(1, requestedConcurrency) : 1;
      while (this.active < concurrency) {
        const queued = await this.prisma.generationTask.findFirst({
          where: { status: GenerationStatus.QUEUED },
          orderBy: { createdAt: 'asc' },
        });
        if (!queued) break;
        const claimed = await this.prisma.generationTask.updateMany({
          where: { id: queued.id, status: GenerationStatus.QUEUED },
          data: {
            status: GenerationStatus.GENERATING,
            progress: 10,
            currentStep: '分析输入资料',
            startedAt: new Date(),
            error: null,
          },
        });
        if (!claimed.count) continue;
        this.active += 1;
        void this.run(queued.id).finally(() => {
          this.active -= 1;
          this.kick();
        });
      }
    } finally {
      this.draining = false;
    }
  }

  private async run(id: string): Promise<void> {
    try {
      const task = await this.requireTask(id);
      const input = task.inputJson as unknown as GenerationInput;
      const template = await this.templates.get(task.templateId);
      await this.prisma.generationTask.update({
        where: { id },
        data: { progress: 30, currentStep: '生成结构化内容' },
      });
      const generated = await this.provider.generate(input, template);
      const latest = await this.requireTask(id);
      if (latest.status === GenerationStatus.CANCELLED) return;
      await this.prisma.generationTask.update({
        where: { id },
        data: { status: GenerationStatus.REVIEWING, progress: 85, currentStep: '渲染并校验 HTML' },
      });
      const result: StoredGenerationResult = {
        ...generated,
        renderedHtml: this.renderer.render(generated, input),
      };
      await this.prisma.generationTask.update({
        where: { id },
        data: {
          status: GenerationStatus.COMPLETED,
          progress: 100,
          currentStep: '生成完成',
          resultJson: result as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      await this.markFailed(id, error);
    }
  }

  private async markFailed(id: string, error: unknown): Promise<void> {
    const task = await this.prisma.generationTask.findUnique({ where: { id } });
    if (!task || task.status === GenerationStatus.CANCELLED) return;
    await this.prisma.generationTask.update({
      where: { id },
      data: {
        status: GenerationStatus.FAILED,
        currentStep: '生成失败',
        error: this.friendlyError(error),
        completedAt: new Date(),
      },
    });
  }

  private friendlyError(error: unknown): string {
    const message = error instanceof Error ? error.message : 'Unknown generation error';
    if (/timeout|timed out|aborted due to timeout/i.test(message)) {
      const minutes = Math.max(1, Math.round(Number(process.env.AI_TIMEOUT_MS ?? 300000) / 60000));
      return `模型响应超时：等待 ${minutes} 分钟仍未返回结果。你的输入已保存，可以直接重新生成或切换更快的模型。`;
    }
    if (/\b401\b|unauthorized|api.?key/i.test(message)) return '模型认证失败：请检查 API Key 是否有效。';
    if (/\b429\b|rate.?limit|too many requests/i.test(message)) return '模型请求过于频繁：请稍后重新生成。';
    if (/invalid json/i.test(message)) return '模型返回的内容格式不完整，可以直接重新生成或更换模型。';
    return message.slice(0, 4000);
  }

  private ownerWhere(ownerId: string) {
    return { OR: [{ ownerId }, { ownerId: null }] };
  }

  private findActive(ownerId: string, slug: string) {
    return this.prisma.generationTask.findFirst({
      where: {
        ownerId,
        slug,
        status: { in: [GenerationStatus.QUEUED, GenerationStatus.GENERATING, GenerationStatus.REVIEWING] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async requireOwnedTask(id: string, ownerId: string): Promise<GenerationTask> {
    const task = await this.prisma.generationTask.findFirst({
      where: { id, ...this.ownerWhere(ownerId) },
    });
    if (!task) throw new NotFoundException(`Generation task not found: ${id}`);
    return task;
  }

  private async requireTask(id: string): Promise<GenerationTask> {
    const task = await this.prisma.generationTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException(`Generation task not found: ${id}`);
    return task;
  }

  private requireResult(task: GenerationTask): StoredGenerationResult {
    if (task.status !== GenerationStatus.COMPLETED || !task.resultJson) {
      throw new ConflictException('Generation task has no completed result');
    }
    return task.resultJson as unknown as StoredGenerationResult;
  }

  private present(task: GenerationTask, includeResult = true) {
    return {
      id: task.id,
      attempt: task.attempt,
      parentTaskId: task.parentTaskId,
      templateId: task.templateId,
      title: task.title,
      author: task.author,
      slug: task.slug,
      provider: task.provider,
      model: task.model,
      status: task.status.toLowerCase(),
      progress: task.progress,
      currentStep: task.currentStep,
      error: task.error,
      bookSlug: task.bookSlug,
      input: task.inputJson,
      result: includeResult ? task.resultJson : undefined,
      createdAt: task.createdAt.toISOString(),
      startedAt: task.startedAt?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}
