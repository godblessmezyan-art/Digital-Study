import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getTemplatesRoot } from '../config/paths';
import type { AiTemplate } from './ai.types';
import type { UpdateTemplateRequest } from './dto/update-template.dto';

const TEMPLATE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable()
export class TemplatesService {
  private readonly templatesRoot = getTemplatesRoot();

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
      ...current,
      name: input.name.trim(),
      description: input.description.trim(),
      contentType: input.contentType.trim(),
      systemPrompt: input.systemPrompt.trim(),
      defaultModules,
      modules,
    };
    const file = join(this.templatesRoot, `${id}.json`);
    await writeFile(file, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
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
