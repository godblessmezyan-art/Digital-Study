import { BadRequestException, ConflictException, Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { getBundledTemplatesRoot, getTemplatesRoot } from '../config/paths';
import { InscriptionsService } from '../inscriptions/inscriptions.service';
import type { AiTemplate } from './ai.types';
import type { CreateTemplateRequest, UpdateTemplateRequest } from './dto/update-template.dto';

const TEMPLATE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable()
export class TemplatesService implements OnApplicationBootstrap {
  private readonly templatesRoot = getTemplatesRoot();
  private readonly bundledTemplatesRoot = getBundledTemplatesRoot();

  constructor(private readonly prisma: PrismaService, private readonly inscriptions: InscriptionsService) {}

  async onApplicationBootstrap(): Promise<void> {
    await mkdir(this.templatesRoot, { recursive: true });
    const bundled = (await readdir(this.bundledTemplatesRoot)).filter((file) => file.endsWith('.json'));
    const existing = new Set(await readdir(this.templatesRoot));
    await Promise.all(bundled.filter((file) => !existing.has(file)).map((file) => copyFile(join(this.bundledTemplatesRoot, file), join(this.templatesRoot, file))));
  }

  async list(): Promise<AiTemplate[]> {
    const archived = await this.listFromArchive();
    const archivedIds = new Set(archived.map((template) => template.id));
    const files = (await readdir(this.templatesRoot))
      .filter((file) => file.endsWith('.json'))
      .sort();
    const fromFiles = (await Promise.all(files.map((file) => this.readFile(file).catch(() => null))))
      .filter((template): template is AiTemplate => Boolean(template) && !archivedIds.has(template!.id));
    return [...archived, ...fromFiles];
  }

  /** The Inscription Archive is the source of truth; files remain as legacy fallback. */
  private async listFromArchive(): Promise<AiTemplate[]> {
    const rows = await this.inscriptions.listFullForContext('ai_workshop.generate.template');
    const parsed: AiTemplate[] = [];
    for (const row of rows) {
      if (row.templateKind !== 'BOOK_TEMPLATE') continue;
      try {
        const value = JSON.parse(row.content) as Partial<AiTemplate>;
        if (value.schemaVersion === 1 && value.id && value.name && value.systemPrompt && Array.isArray(value.modules) && Array.isArray(value.defaultModules)) {
          parsed.push(value as AiTemplate);
        }
      } catch { /* corrupted archive row: fall back to file copy */ }
    }
    return parsed;
  }

  async get(id: string): Promise<AiTemplate> {
    const archived = await this.prisma.inscription.findUnique({ where: { legacyKey: `template:${id}` } });
    if (archived && archived.enabled) {
      try {
        const value = JSON.parse(archived.content) as Partial<AiTemplate>;
        if (value.schemaVersion === 1 && value.id && value.name && value.systemPrompt && Array.isArray(value.modules) && Array.isArray(value.defaultModules)) {
          return value as AiTemplate;
        }
      } catch { /* fall through to file */ }
    }
    const templates = await this.list();
    const template = templates.find((item) => item.id === id);
    if (!template) throw new NotFoundException(`AI template not found: ${id}`);
    return template;
  }

  async update(id: string, input: UpdateTemplateRequest): Promise<AiTemplate> {
    if (!TEMPLATE_ID.test(id)) throw new NotFoundException(`AI template not found: ${id}`);
    const current = await this.get(id);
    const template = this.buildTemplate(id, input, current);
    await this.upsertArchiveTemplate(id, template);
    return template;
  }

  async create(input: CreateTemplateRequest): Promise<AiTemplate> {
    if (!TEMPLATE_ID.test(input.id)) throw new BadRequestException(`Invalid AI template id: ${input.id}`);
    try {
      await this.get(input.id);
      throw new ConflictException(`AI template already exists: ${input.id}`);
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (!(error instanceof NotFoundException)) throw error;
    }
    const template = this.buildTemplate(input.id, input);
    await this.upsertArchiveTemplate(input.id, template);
    return template;
  }

  /** Writes the template into the Inscription Archive (versioned). */
  private async upsertArchiveTemplate(id: string, template: AiTemplate): Promise<void> {
    const legacyKey = `template:${id}`;
    const content = `${JSON.stringify(template, null, 2)}\n`;
    const existing = await this.prisma.inscription.findUnique({ where: { legacyKey } });
    if (existing) {
      const version = existing.currentVersion + 1;
      await this.prisma.inscription.update({
        where: { id: existing.id },
        data: { name: template.name, description: template.description, content, systemPrompt: template.systemPrompt, currentVersion: version },
      });
      await this.prisma.inscriptionVersion.create({
        data: { inscriptionId: existing.id, version, content, systemPrompt: template.systemPrompt, changeNote: '\u94ed\u6587\u53f0\u4fdd\u5b58' },
      });
      return;
    }
    const category = await this.prisma.inscriptionCategory.findUnique({ where: { slug: 'book-generation' } });
    const inscription = await this.prisma.inscription.create({
      data: {
        type: 'TEMPLATE', templateKind: 'BOOK_TEMPLATE', legacyKey,
        name: template.name, description: template.description, content, systemPrompt: template.systemPrompt,
        categoryId: category?.id ?? null, tags: ['\u4e66\u7c4d\u751f\u6210'],
        bindings: { create: [{ contextKey: 'ai_workshop.generate.template' }] },
      },
    });
    await this.prisma.inscriptionVersion.create({
      data: { inscriptionId: inscription.id, version: 1, content, systemPrompt: template.systemPrompt, changeNote: '\u81ea\u65e7\u6a21\u677f\u4f53\u7cfb\u8fc1\u79fb' },
    });
  }

  private buildTemplate(id: string, input: UpdateTemplateRequest, current?: AiTemplate): AiTemplate {
    const keys = new Set<string>();
    const modules = input.modules.map((module) => {
      const key = String(module?.key ?? '').trim();
      const title = String(module?.title ?? '').trim();
      const instruction = String(module?.instruction ?? '').trim();
      if (!TEMPLATE_ID.test(key) || !title || !instruction || keys.has(key)) {
        throw new BadRequestException(`Invalid AI template module: ${key || '(empty)'}`);
      }
      keys.add(key);
      return { key, title, instruction };
    });
    const defaultModules = [...new Set(input.defaultModules)].filter((key) => keys.has(key));
    if (!defaultModules.length) throw new BadRequestException('AI template requires at least one default module');
    const template: AiTemplate = {
      schemaVersion: 1,
      id,
      ...current,
      name: input.name.trim(),
      description: input.description.trim(),
      contentType: input.contentType.trim(),
      systemPrompt: input.systemPrompt.trim(),
      defaultModules,
      modules,
    };
    return template;
  }

  private async readFile(file: string): Promise<AiTemplate> {
    const value = JSON.parse(await readFile(join(this.templatesRoot, file), 'utf8')) as Partial<AiTemplate>;
    if (
      value.schemaVersion !== 1 ||
      !value.id ||
      !value.name ||
      !value.systemPrompt ||
      !Array.isArray(value.modules) ||
      !Array.isArray(value.defaultModules)
    ) {
      throw new Error(`Invalid AI template: ${file}`);
    }
    return value as AiTemplate;
  }
}
