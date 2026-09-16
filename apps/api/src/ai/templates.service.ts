import { Injectable, NotFoundException } from '@nestjs/common';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getTemplatesRoot } from '../config/paths';
import type { AiTemplate } from './ai.types';

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
