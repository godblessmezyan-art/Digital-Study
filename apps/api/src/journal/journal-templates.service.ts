import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { JournalTemplate, Prisma } from '@prisma/client';
import type { JournalTemplateDto } from '@digital-study/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveJournalTemplateRequest } from './dto/save-journal-template.dto';

interface BuiltinTemplate {
  key: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
  isDefault: boolean;
}

const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    key: 'blank',
    name: '空白日记',
    description: '从一个干净的画面开始，自由书写。',
    content: '今天发生了什么？\n\n',
    tags: ['自由书写'],
    isDefault: false,
  },
  {
    key: 'daily-review',
    name: '每日回顾',
    description: '用五个问题，为今天画上一个句点。',
    content: [
      '今天发生了什么？',
      '',
      '今天最值得记录的一件事是什么？',
      '',
      '今天有什么情绪或感受？',
      '',
      '今天学到了什么？',
      '',
      '明天最重要的一件事是什么？',
      '',
    ].join('\n'),
    tags: ['回顾', '日常'],
    isDefault: true,
  },
  {
    key: 'thinking',
    name: '思考记录',
    description: '把一个问题想透：判断、依据、反例与结论。',
    content: [
      '我正在思考什么问题？',
      '',
      '我现在的判断是什么？',
      '',
      '我为什么这么认为？',
      '',
      '有什么反例？',
      '',
      '还有哪些可能性？',
      '',
      '暂时的结论是什么？',
      '',
    ].join('\n'),
    tags: ['思考', '决策'],
    isDefault: false,
  },
  {
    key: 'reading-reflection',
    name: '阅读反思',
    description: '读完之后，把书里的东西变成自己的。',
    content: [
      '今天读了什么？',
      '',
      '哪个观点最触动我？',
      '',
      '我认同什么？',
      '',
      '我不同意什么？',
      '',
      '它和过去哪些想法有关？',
      '',
      '我准备如何应用？',
      '',
    ].join('\n'),
    tags: ['阅读', '反思'],
    isDefault: false,
  },
  {
    key: 'emotion',
    name: '情绪记录',
    description: '看见情绪，理解它从哪来，又带我去哪。',
    content: [
      '今天主要的情绪是什么？',
      '',
      '什么事情触发了它？',
      '',
      '当时我有哪些想法？',
      '',
      '我采取了什么行动？',
      '',
      '现在回看有什么不同理解？',
      '',
    ].join('\n'),
    tags: ['情绪', '觉察'],
    isDefault: false,
  },
];

@Injectable()
export class JournalTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerId: string, options: { activeOnly?: boolean } = {}): Promise<JournalTemplateDto[]> {
    await this.ensureBuiltins(ownerId);
    const where: Prisma.JournalTemplateWhereInput = { ownerId };
    if (options.activeOnly) where.isActive = true;
    const templates = await this.prisma.journalTemplate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    return templates.map((template) => this.toDto(template));
  }

  async create(ownerId: string, input: SaveJournalTemplateRequest): Promise<JournalTemplateDto> {
    const data = this.data(input);
    const template = await this.prisma.$transaction(async (tx) => {
      if (data.isDefault) await tx.journalTemplate.updateMany({ where: { ownerId }, data: { isDefault: false } });
      return tx.journalTemplate.create({ data: { ownerId, ...data } });
    });
    return this.toDto(template);
  }

  async update(ownerId: string, id: string, input: SaveJournalTemplateRequest): Promise<JournalTemplateDto> {
    await this.requireOwned(ownerId, id);
    const data = this.data(input);
    const template = await this.prisma.$transaction(async (tx) => {
      if (data.isDefault) await tx.journalTemplate.updateMany({ where: { ownerId }, data: { isDefault: false } });
      return tx.journalTemplate.update({ where: { id }, data });
    });
    return this.toDto(template);
  }

  async duplicate(ownerId: string, id: string): Promise<JournalTemplateDto> {
    const source = await this.requireOwned(ownerId, id);
    const template = await this.prisma.journalTemplate.create({
      data: {
        ownerId,
        name: `${source.name}（副本）`.slice(0, 120),
        description: source.description,
        content: source.content,
        tags: source.tags as Prisma.InputJsonValue,
        isDefault: false,
        isActive: source.isActive,
        isBuiltin: false,
      },
    });
    return this.toDto(template);
  }

  async setDefault(ownerId: string, id: string): Promise<JournalTemplateDto> {
    await this.requireOwned(ownerId, id);
    const template = await this.prisma.$transaction(async (tx) => {
      await tx.journalTemplate.updateMany({ where: { ownerId }, data: { isDefault: false } });
      return tx.journalTemplate.update({ where: { id }, data: { isDefault: true, isActive: true } });
    });
    return this.toDto(template);
  }

  async toggleActive(ownerId: string, id: string, isActive: boolean): Promise<JournalTemplateDto> {
    await this.requireOwned(ownerId, id);
    const data: Prisma.JournalTemplateUpdateInput = { isActive };
    if (!isActive) data.isDefault = false;
    const template = await this.prisma.journalTemplate.update({ where: { id }, data });
    return this.toDto(template);
  }

  async remove(ownerId: string, id: string) {
    await this.requireOwned(ownerId, id);
    await this.prisma.journalTemplate.delete({ where: { id } });
    return { id, deleted: true };
  }

  /**
   * Per-owner lazy seed: the first time a user opens the template list we create
   * the builtin set as ordinary editable rows. Deleted builtins never come back
   * because the seed only runs while the owner has zero templates.
   */
  private async ensureBuiltins(ownerId: string): Promise<void> {
    const count = await this.prisma.journalTemplate.count({ where: { ownerId } });
    if (count > 0) return;
    await this.prisma.journalTemplate.createMany({
      data: BUILTIN_TEMPLATES.map((template) => ({
        ownerId,
        name: template.name,
        description: template.description,
        content: template.content,
        tags: template.tags as unknown as Prisma.InputJsonValue,
        isDefault: template.isDefault,
        isActive: true,
        isBuiltin: true,
      })),
    });
  }

  private data(input: SaveJournalTemplateRequest) {
    const name = input.name.trim();
    if (!name) throw new BadRequestException('模板名称不能为空');
    return {
      name,
      description: input.description?.trim() || null,
      content: input.content ?? '',
      tags: [...new Set((input.tags ?? []).map((tag) => tag.trim()).filter(Boolean))] as unknown as Prisma.InputJsonValue,
      isDefault: input.isDefault ?? false,
      isActive: input.isActive ?? true,
      isBuiltin: false,
    };
  }

  private async requireOwned(ownerId: string, id: string): Promise<JournalTemplate> {
    const template = await this.prisma.journalTemplate.findFirst({ where: { id, ownerId } });
    if (!template) throw new NotFoundException('模板不存在或已被删除');
    return template;
  }

  private toDto(template: JournalTemplate): JournalTemplateDto {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      content: template.content,
      tags: Array.isArray(template.tags) ? (template.tags as unknown[]).filter((tag): tag is string => typeof tag === 'string') : [],
      isDefault: template.isDefault,
      isActive: template.isActive,
      isBuiltin: template.isBuiltin,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }
}
