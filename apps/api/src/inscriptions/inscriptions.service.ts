import { BadRequestException, ConflictException, Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Inscription, Prisma } from '@prisma/client';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getBundledTemplatesRoot } from '../config/paths';
import { BUILTIN_CURATOR_PROMPT, BUILTIN_PLAN_PROMPT, BUILTIN_READING_PROMPT, BUILTIN_WORKSHOP_PROMPT } from './builtin-prompts';
import { contextKind, INSCRIPTION_CONTEXTS } from './contexts';
import type { SaveInscriptionCategoryRequest, SaveInscriptionRequest } from './dto/save-inscription.dto';

export interface InscriptionFilters {
  q?: string;
  type?: string;
  categoryId?: string;
  context?: string;
  enabled?: string;
  sort?: string;
}

const JOURNAL_BUILTINS = [
  { key: 'blank', name: '空白日记', description: '从一个干净的画面开始，自由书写。', content: '今天发生了什么？\n\n', tags: ['自由书写'] },
  {
    key: 'daily-review', name: '每日回顾', description: '用五个问题，为今天画上一个句点。',
    content: ['今天发生了什么？', '', '今天最值得记录的一件事是什么？', '', '今天有什么情绪或感受？', '', '今天学到了什么？', '', '明天最重要的一件事是什么？', ''].join('\n'),
    tags: ['回顾', '日常'],
  },
  {
    key: 'thinking', name: '思考记录', description: '把一个问题想透：判断、依据、反例与结论。',
    content: ['我正在思考什么问题？', '', '我现在的判断是什么？', '', '我为什么这么认为？', '', '有什么反例？', '', '还有哪些可能性？', '', '暂时的结论是什么？', ''].join('\n'),
    tags: ['思考', '决策'],
  },
  {
    key: 'reading-reflection', name: '阅读反思', description: '读完之后，把书里的东西变成自己的。',
    content: ['今天读了什么？', '', '哪个观点最触动我？', '', '我认同什么？', '', '我不同意什么？', '', '它和过去哪些想法有关？', '', '我准备如何应用？', ''].join('\n'),
    tags: ['阅读', '反思'],
  },
  {
    key: 'emotion', name: '情绪记录', description: '看见情绪，理解它从哪来，又带我去哪。',
    content: ['今天主要的情绪是什么？', '', '什么事情触发了它？', '', '当时我有哪些想法？', '', '我采取了什么行动？', '', '现在回看有什么不同理解？', ''].join('\n'),
    tags: ['情绪', '觉察'],
  },
];

@Injectable()
export class InscriptionsService implements OnApplicationBootstrap {
  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureDefaults().catch(() => undefined);
  }

  // ===== query =====

  async list(filters: InscriptionFilters) {
    const where: Prisma.InscriptionWhereInput = {};
    if (filters.type) where.type = filters.type === 'TEMPLATE' ? 'TEMPLATE' : 'PROMPT';
    if (filters.categoryId) where.categoryId = Number(filters.categoryId);
    if (filters.enabled === '1' || filters.enabled === 'true') where.enabled = true;
    if (filters.enabled === '0' || filters.enabled === 'false') where.enabled = false;
    if (filters.context) where.bindings = { some: { contextKey: filters.context } };
    const q = filters.q?.trim();
    if (q) {
      where.OR = [{ name: { contains: q } }, { description: { contains: q } }, { content: { contains: q } }];
    }
    const orderBy = filters.sort === 'name'
      ? [{ name: 'asc' as const }]
      : filters.sort === 'version'
        ? [{ currentVersion: 'desc' as const }]
        : [{ updatedAt: 'desc' as const }];
    return this.prisma.inscription.findMany({
      where,
      orderBy,
      include: { category: true, bindings: true },
    });
  }

  /** Lightweight list for business pages: only enabled resources bound to the context. */
  async available(context: string) {
    const kind = contextKind(context);
    const rows = await this.prisma.inscription.findMany({
      where: { enabled: true, bindings: { some: { contextKey: context } }, ...(kind ? { type: kind } : {}) },
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true, name: true, description: true, type: true, templateKind: true,
        currentVersion: true, tags: true, modelId: true, updatedAt: true,
      },
    });
    return rows.map((row) => ({ ...row, tags: this.strings(row.tags) }));
  }

  /** Full rows (with content) for runtime consumers such as the workshop template list. */
  async listFullForContext(context: string) {
    const kind = contextKind(context);
    return this.prisma.inscription.findMany({
      where: { enabled: true, bindings: { some: { contextKey: context } }, ...(kind ? { type: kind } : {}) },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async get(id: string) {
    const inscription = await this.prisma.inscription.findUnique({
      where: { id },
      include: { category: true, bindings: true, variables: true, versions: { orderBy: { version: 'desc' }, take: 20 } },
    });
    if (!inscription) throw new NotFoundException('铭文不存在或已被删除');
    return inscription;
  }

  /** Runtime consumption: the enabled inscription bound to a context (newest update wins). */
  async resolveForContext(context: string): Promise<Inscription | null> {
    const kind = contextKind(context);
    return this.prisma.inscription.findFirst({
      where: { enabled: true, bindings: { some: { contextKey: context } }, ...(kind ? { type: kind } : {}) },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ===== mutations =====

  async create(input: SaveInscriptionRequest) {
    this.validateContexts(input.bindings, input.type);
    return this.prisma.$transaction(async (tx) => {
      const inscription = await tx.inscription.create({
        data: {
          type: input.type,
          templateKind: input.type === 'TEMPLATE' ? input.templateKind ?? 'HTML_TEMPLATE' : null,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          content: input.content,
          systemPrompt: input.systemPrompt?.trim() || null,
          categoryId: input.categoryId ?? null,
          tags: [...new Set(input.tags ?? [])] as unknown as Prisma.InputJsonValue,
          modelId: input.modelId?.trim() || null,
          modelParams: (input.modelParams ?? {}) as Prisma.InputJsonValue,
          enabled: input.enabled ?? true,
          bindings: { create: (input.bindings ?? []).map((contextKey) => ({ contextKey })) },
          variables: { create: (input.variables ?? []).map((variable) => ({ ...variable, defaultValue: variable.defaultValue ?? null, placeholder: variable.placeholder ?? null, required: variable.required ?? false })) },
        },
      });
      await tx.inscriptionVersion.create({
        data: { inscriptionId: inscription.id, version: 1, content: inscription.content, systemPrompt: inscription.systemPrompt, changeNote: input.changeNote?.trim() || '初始版本' },
      });
      return this.get(inscription.id);
    });
  }

  async update(id: string, input: SaveInscriptionRequest) {
    const current = await this.get(id);
    this.validateContexts(input.bindings, input.type);
    const contentChanged = input.content !== current.content || (input.systemPrompt?.trim() || null) !== current.systemPrompt;
    return this.prisma.$transaction(async (tx) => {
      const nextVersion = contentChanged ? current.currentVersion + 1 : current.currentVersion;
      const inscription = await tx.inscription.update({
        where: { id },
        data: {
          type: input.type,
          templateKind: input.type === 'TEMPLATE' ? input.templateKind ?? current.templateKind ?? 'HTML_TEMPLATE' : null,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          content: input.content,
          systemPrompt: input.systemPrompt?.trim() || null,
          categoryId: input.categoryId ?? null,
          tags: [...new Set(input.tags ?? [])] as unknown as Prisma.InputJsonValue,
          modelId: input.modelId?.trim() || null,
          modelParams: (input.modelParams ?? {}) as Prisma.InputJsonValue,
          enabled: input.enabled ?? current.enabled,
          currentVersion: nextVersion,
        },
      });
      if (contentChanged) {
        await tx.inscriptionVersion.create({
          data: { inscriptionId: id, version: nextVersion, content: input.content, systemPrompt: input.systemPrompt?.trim() || null, changeNote: input.changeNote?.trim() || null },
        });
      }
      await tx.inscriptionBinding.deleteMany({ where: { inscriptionId: id } });
      await tx.inscriptionBinding.createMany({ data: (input.bindings ?? []).map((contextKey) => ({ inscriptionId: id, contextKey })) });
      await tx.inscriptionVariable.deleteMany({ where: { inscriptionId: id } });
      await tx.inscriptionVariable.createMany({
        data: (input.variables ?? []).map((variable) => ({
          inscriptionId: id, key: variable.key, label: variable.label,
          defaultValue: variable.defaultValue ?? null, required: variable.required ?? false, placeholder: variable.placeholder ?? null,
        })),
      });
      return this.get(id);
    });
  }

  async duplicate(id: string) {
    const source = await this.get(id);
    return this.create({
      type: source.type,
      templateKind: source.templateKind ?? undefined,
      name: `${source.name}（副本）`.slice(0, 160),
      description: source.description ?? undefined,
      content: source.content,
      systemPrompt: source.systemPrompt ?? undefined,
      categoryId: source.categoryId ?? undefined,
      tags: this.strings(source.tags),
      bindings: source.bindings.map((binding) => binding.contextKey),
      variables: source.variables.map((variable) => ({ key: variable.key, label: variable.label, defaultValue: variable.defaultValue ?? undefined, required: variable.required, placeholder: variable.placeholder ?? undefined })),
      enabled: false,
    } as SaveInscriptionRequest);
  }

  async setEnabled(id: string, enabled: boolean) {
    await this.get(id);
    return this.prisma.inscription.update({ where: { id }, data: { enabled } });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.inscription.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ===== categories =====

  listCategories() {
    return this.prisma.inscriptionCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { inscriptions: true } } },
    });
  }

  async createCategory(input: SaveInscriptionCategoryRequest) {
    const slug = input.slug.trim().toLowerCase();
    const exists = await this.prisma.inscriptionCategory.findUnique({ where: { slug } });
    if (exists) throw new ConflictException('分类 slug 已存在');
    return this.prisma.inscriptionCategory.create({
      data: { slug, name: input.name.trim(), description: input.description?.trim() || null, sortOrder: input.sortOrder ?? 0 },
    });
  }

  async updateCategory(id: number, input: SaveInscriptionCategoryRequest) {
    await this.requireCategory(id);
    return this.prisma.inscriptionCategory.update({
      where: { id },
      data: { slug: input.slug.trim().toLowerCase(), name: input.name.trim(), description: input.description?.trim() || null, sortOrder: input.sortOrder ?? 0 },
    });
  }

  async removeCategory(id: number) {
    await this.requireCategory(id);
    const used = await this.prisma.inscription.count({ where: { categoryId: id } });
    if (used > 0) {
      throw new ConflictException(`仍有 ${used} 条铭文使用该分类，请先移动或删除它们`);
    }
    await this.prisma.inscriptionCategory.delete({ where: { id } });
    return { id, deleted: true };
  }

  async reorderCategories(items: Array<{ id: number; sortOrder: number }>) {
    await this.prisma.$transaction(items.map((item) => this.prisma.inscriptionCategory.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })));
    return this.listCategories();
  }

  // ===== seed / migration of legacy resources =====

  /** Idempotent migration of legacy prompt/template sources into the archive. */
  async ensureDefaults(): Promise<{ created: number }> {
    let created = 0;
    const categories: Array<{ slug: string; name: string; sortOrder: number }> = [
      { slug: 'book-generation', name: '书籍生成', sortOrder: 1 },
      { slug: 'learning', name: '学习', sortOrder: 2 },
      { slug: 'reading', name: '阅读', sortOrder: 3 },
      { slug: 'writing', name: '写作', sortOrder: 4 },
      { slug: 'planning', name: '计划', sortOrder: 5 },
      { slug: 'agent', name: 'Agent', sortOrder: 6 },
    ];
    const categoryIds = new Map<string, number>();
    for (const category of categories) {
      const row = await this.prisma.inscriptionCategory.upsert({
        where: { slug: category.slug },
        update: {},
        create: category,
      });
      categoryIds.set(category.slug, row.id);
    }

    const seedOne = async (legacyKey: string, data: Omit<Prisma.InscriptionUncheckedCreateInput, 'legacyKey'>, bindings: string[]) => {
      const exists = await this.prisma.inscription.findUnique({ where: { legacyKey } });
      if (exists) return;
      await this.prisma.$transaction(async (tx) => {
        const inscription = await tx.inscription.create({ data: { ...data, legacyKey } });
        await tx.inscriptionBinding.createMany({ data: bindings.map((contextKey) => ({ inscriptionId: inscription.id, contextKey })) });
        await tx.inscriptionVersion.create({ data: { inscriptionId: inscription.id, version: 1, content: inscription.content, systemPrompt: inscription.systemPrompt, changeNote: '自旧体系迁移' } });
      });
      created += 1;
    };

    // Legacy file templates (content/templates/*.json) become BOOK_TEMPLATE inscriptions.
    try {
      const root = getBundledTemplatesRoot();
      const files = (await readdir(root)).filter((file) => file.endsWith('.json')).sort();
      for (const file of files) {
        const raw = await readFile(join(root, file), 'utf8');
        const template = JSON.parse(raw) as { id?: string; name?: string; description?: string };
        if (!template.id || !template.name) continue;
        await seedOne(`template:${template.id}`, {
          type: 'TEMPLATE',
          templateKind: 'BOOK_TEMPLATE',
          name: template.name,
          description: template.description ?? null,
          content: raw.trim(),
          categoryId: categoryIds.get('book-generation') ?? null,
          tags: ['书籍生成', '迁移'] as unknown as Prisma.InputJsonValue,
          enabled: true,
        }, ['ai_workshop.generate.template']);
      }
    } catch { /* bundled templates unreadable: skip, file fallback remains */ }

    // Built-in prompts extracted from hardcoded service constants.
    await seedOne('prompt:workshop-generate', {
      type: 'PROMPT', name: '书籍生成主指令', description: '铭文台 AI 生成默认遵循的创作指令。',
      content: BUILTIN_WORKSHOP_PROMPT, categoryId: categoryIds.get('book-generation') ?? null,
      tags: ['书籍生成'] as unknown as Prisma.InputJsonValue, enabled: true,
    }, ['ai_workshop.generate.prompt']);
    await seedOne('prompt:plan-breakdown', {
      type: 'PROMPT', name: '计划拆解准则', description: '远征计划 AI 拆解的系统准则：可执行、可验证、拒绝空话。',
      content: BUILTIN_PLAN_PROMPT, categoryId: categoryIds.get('planning') ?? null,
      tags: ['计划', '拆解'] as unknown as Prisma.InputJsonValue, enabled: true,
    }, ['plan.breakdown.prompt']);
    await seedOne('prompt:reading-summary', {
      type: 'PROMPT', name: '阅读助手基调', description: '静阅室 AI 总结与追问的基础角色设定。',
      content: BUILTIN_READING_PROMPT, categoryId: categoryIds.get('reading') ?? null,
      tags: ['阅读'] as unknown as Prisma.InputJsonValue, enabled: true,
    }, ['reading.summary.prompt']);
    await seedOne('prompt:curator-deep', {
      type: 'PROMPT', name: '秘典回响准则', description: '秘典回响检索回答的来源分类与引用准则。',
      content: BUILTIN_CURATOR_PROMPT, categoryId: categoryIds.get('agent') ?? null,
      tags: ['检索', '回响'] as unknown as Prisma.InputJsonValue, enabled: true,
    }, ['curator.deep.prompt']);
    await seedOne('prompt:journal-review', {
      type: 'PROMPT', name: '手记反思引导', description: '旅者手记深度反思的引导准则（预留接入）。',
      content: '你是旅者手记的反思引导者。基于用户提供的日记内容，帮助其看见情绪、假设与变化，不评判、不代写。',
      categoryId: categoryIds.get('writing') ?? null,
      tags: ['写作', '反思'] as unknown as Prisma.InputJsonValue, enabled: true,
    }, ['journal.review.prompt']);

    // Built-in journal templates become public JOURNAL_TEMPLATE inscriptions.
    for (const template of JOURNAL_BUILTINS) {
      await seedOne(`journal:${template.key}`, {
        type: 'TEMPLATE', templateKind: 'JOURNAL_TEMPLATE', name: template.name,
        description: template.description, content: template.content,
        categoryId: categoryIds.get('writing') ?? null,
        tags: template.tags as unknown as Prisma.InputJsonValue, enabled: true,
      }, ['journal.new.template']);
    }

    return { created };
  }

  // ===== internals =====

  private validateContexts(bindings: string[] | undefined, type: string) {
    for (const key of bindings ?? []) {
      if (!INSCRIPTION_CONTEXTS.some((context) => context.key === key)) {
        throw new BadRequestException(`未知应用场景：${key}`);
      }
      const kind = contextKind(key);
      if (kind && kind !== type) {
        throw new BadRequestException(`应用场景 ${key} 仅接受 ${kind} 类型资源`);
      }
    }
  }

  private async requireCategory(id: number) {
    const category = await this.prisma.inscriptionCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('分类不存在');
    return category;
  }

  private strings(value: Prisma.JsonValue | null | undefined): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }
}
