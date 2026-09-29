import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AiModelConfigsService } from '../ai/ai-model-configs.service';

@Injectable()
export class EmbeddingService {
  constructor(private readonly models: AiModelConfigsService) {}

  async embed(texts: string[], signal?: AbortSignal): Promise<{ model: string; vectors: number[][] }> {
    const normalized = texts.map(text => text.replace(/\s+/g, ' ').trim().slice(0, 8000));
    const runtime = await this.models.resolveRuntimeConfig();
    const configuredModel = process.env.AI_EMBEDDING_MODEL?.trim();
    if (runtime.provider === 'mock' || configuredModel === 'local-hybrid-v1') return this.local(normalized);
    try {
      return await this.models.sendEmbedding(runtime, normalized, signal);
    } catch (error) {
      if (configuredModel) throw error;
      return this.local(normalized);
    }
  }

  private localVector(text: string): number[] {
    const vector = Array<number>(256).fill(0);
    const concepts = [
      ['自由', '自主', '选择权', '不受约束'],
      ['时间管理', '效率', '规划', '日程', '优先级'],
      ['目标', '目的', '方向', '愿景', '追求'],
      ['变化', '改变', '调整', '转变', '演化'],
      ['环境', '处境', '条件', '情境', '现实'],
      ['相反', '反例', '反对', '冲突', '矛盾'],
    ];
    let enriched = text.toLowerCase();
    for (const group of concepts) if (group.some(term => enriched.includes(term))) enriched += ` ${group.join(' ')}`;
    const units = [...enriched].filter(unit => !/\s/.test(unit));
    for (let index = 0; index < units.length; index += 1) {
      for (const width of [1, 2, 3]) {
        const token = units.slice(index, index + width).join('');
        if (token.length !== width) continue;
        const digest = createHash('sha256').update(token).digest();
        vector[digest[0]] += digest[1] % 2 ? 1 : -1;
      }
    }
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map(value => value / norm);
  }

  private local(texts: string[]) {
    return { model: 'local-hybrid-v1', vectors: texts.map(text => this.localVector(text)) };
  }
}
