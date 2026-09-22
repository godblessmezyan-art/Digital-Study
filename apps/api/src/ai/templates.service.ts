import { BadRequestException, ConflictException, Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getBundledTemplatesRoot, getTemplatesRoot } from '../config/paths';
import type { AiTemplate } from './ai.types';
import type { CreateTemplateRequest, UpdateTemplateRequest } from './dto/update-template.dto';

const TEMPLATE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable()
export class TemplatesService implements OnApplicationBootstrap {
  private readonly templatesRoot = getTemplatesRoot();
  private readonly bundledTemplatesRoot = getBundledTemplatesRoot();

  async onApplicationBootstrap(): Promise<void> {
    await mkdir(this.templatesRoot, { recursive: true });
    const bundled = (await readdir(this.bundledTemplatesRoot)).filter((file) => file.endsWith('.json'));
    const existing = new Set(await readdir(this.templatesRoot));
    await Promise.all(bundled.filter((file) => !existing.has(file)).map((file) => copyFile(join(this.bundledTemplatesRoot, file), join(this.templatesRoot, file))));
  }

  async list(): Promise<AiTemplate[]> {
    const files = (await readdir(this.templatesRoot))
      .filter((file) => file.endsWith('.json'))
      .sort();
    return Promise.all(files.map((file) => this.readFile(file)));
  }

  async get(id: string): Promise<AiTemplate> {
    const templates = await this.list();
    const template = templates.find((item) => item.id === id);
    if (!template) throw new NotFoundException(`AI template not found: ${id}`);
    return template;
  }

  async update(id: string, input: UpdateTemplateRequest): Promise<AiTemplate> {
    if (!TEMPLATE_ID.test(id)) throw new NotFoundException(`AI template not found: ${id}`);
    const current = await this.get(id);
    const template = this.buildTemplate(id, input, current);
    const file = join(this.templatesRoot, `${id}.json`);
    await writeFile(file, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
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
    await writeFile(join(this.templatesRoot, `${input.id}.json`), `${JSON.stringify(template, null, 2)}\n`, 'utf8');
    return template;
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
