import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AiModelConfig } from '@prisma/client';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveModelConfigRequest } from './dto/save-model-config.dto';

export type AiRuntimeConfig = {
  provider: 'mock' | 'openai-compatible';
  model: string;
  displayName: string;
  requestUrl: string;
  apiKey: string;
  source: 'database' | 'environment' | 'mock';
  configured: boolean;
};

@Injectable()
export class AiModelConfigsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const models = await this.prisma.aiModelConfig.findMany({
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
    return models.map((model) => this.present(model));
  }

  async create(input: SaveModelConfigRequest) {
    const apiKey = input.apiKey?.trim();
    if (!apiKey) throw new BadRequestException('API Key is required when creating a model');
    const encrypted = this.encrypt(apiKey);
    const activate = input.activate ?? true;
    const model = await this.prisma.$transaction(async (tx) => {
      if (activate) await tx.aiModelConfig.updateMany({ data: { isActive: false } });
      return tx.aiModelConfig.create({
        data: {
          apiFormat: input.apiFormat,
          baseUrl: this.normalizeBaseUrl(input.baseUrl),
          useFullUrl: input.useFullUrl,
          modelId: input.modelId.trim(),
          displayName: input.displayName?.trim() || input.modelId.trim(),
          ...encrypted,
          isActive: activate,
        },
      });
    });
    return this.present(model);
  }

  async update(id: string, input: SaveModelConfigRequest) {
    const current = await this.requireModel(id);
    const apiKey = input.apiKey?.trim();
    const encrypted = apiKey ? this.encrypt(apiKey) : {};
    const model = await this.prisma.$transaction(async (tx) => {
      if (input.activate) await tx.aiModelConfig.updateMany({ data: { isActive: false } });
      return tx.aiModelConfig.update({
        where: { id },
        data: {
          apiFormat: input.apiFormat,
          baseUrl: this.normalizeBaseUrl(input.baseUrl),
          useFullUrl: input.useFullUrl,
          modelId: input.modelId.trim(),
          displayName: input.displayName?.trim() || input.modelId.trim(),
          ...encrypted,
          isActive: input.activate ? true : current.isActive,
        },
      });
    });
    return this.present(model);
  }

  async activate(id: string) {
    await this.requireModel(id);
    const model = await this.prisma.$transaction(async (tx) => {
      await tx.aiModelConfig.updateMany({ data: { isActive: false } });
      return tx.aiModelConfig.update({ where: { id }, data: { isActive: true } });
    });
    return this.present(model);
  }

  async remove(id: string) {
    const model = await this.requireModel(id);
    await this.prisma.aiModelConfig.delete({ where: { id } });
    return { id, deleted: true, wasActive: model.isActive };
  }

  async test(id: string) {
    const model = await this.requireModel(id);
    const runtime = this.runtimeFromModel(model);
    const startedAt = Date.now();
    const response = await this.request(runtime);
    await response.body?.cancel();
    return {
      ok: true,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      model: runtime.model,
      displayName: runtime.displayName,
    };
  }

  async resolveRuntimeConfig(): Promise<AiRuntimeConfig> {
    const active = await this.prisma.aiModelConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (active) return this.runtimeFromModel(active);

    const provider = process.env.AI_PROVIDER === 'mock' ? 'mock' : 'openai-compatible';
    const model = process.env.AI_MODEL ?? (provider === 'mock' ? 'mock-editor-v1' : '');
    const baseUrl = process.env.AI_BASE_URL ?? 'https://api.openai.com/v1';
    return {
      provider,
      model,
      displayName: model,
      requestUrl: this.buildRequestUrl(baseUrl, false),
      apiKey: process.env.AI_API_KEY ?? '',
      source: provider === 'mock' ? 'mock' : 'environment',
      configured: provider === 'mock' || Boolean(process.env.AI_API_KEY && model),
    };
  }

  async publicConfiguration() {
    const runtime = await this.resolveRuntimeConfig();
    return {
      configured: runtime.configured,
      provider: runtime.provider,
      model: runtime.model || null,
      displayName: runtime.displayName || null,
      source: runtime.source,
    };
  }

  async sendChat(runtime: AiRuntimeConfig, body: Record<string, unknown>): Promise<Response> {
    if (!runtime.configured || !runtime.apiKey) {
      throw new ServiceUnavailableException('AI provider is not configured');
    }
    const response = await fetch(runtime.requestUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${runtime.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS ?? 300000)),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new BadGatewayException(`AI provider returned ${response.status}: ${detail}`);
    }
    return response;
  }

  private async request(runtime: AiRuntimeConfig): Promise<Response> {
    return this.sendChat(runtime, {
      model: runtime.model,
      temperature: 0,
      messages: [{ role: 'user', content: 'Reply with OK.' }],
    });
  }

  private runtimeFromModel(model: AiModelConfig): AiRuntimeConfig {
    return {
      provider: 'openai-compatible',
      model: model.modelId,
      displayName: model.displayName,
      requestUrl: this.buildRequestUrl(model.baseUrl, model.useFullUrl),
      apiKey: this.decrypt(model),
      source: 'database',
      configured: true,
    };
  }

  private buildRequestUrl(baseUrl: string, useFullUrl: boolean): string {
    const normalized = this.normalizeBaseUrl(baseUrl);
    return useFullUrl ? normalized : `${normalized.replace(/\/+$/, '')}/chat/completions`;
  }

  private normalizeBaseUrl(value: string): string {
    return value.trim();
  }

  private encryptionKey(): Buffer {
    const secret = process.env.AI_SETTINGS_ENCRYPTION_KEY ?? '';
    if (secret.length < 32) {
      throw new ServiceUnavailableException('AI_SETTINGS_ENCRYPTION_KEY must contain at least 32 characters');
    }
    return createHash('sha256').update(secret).digest();
  }

  private encrypt(apiKey: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
    return {
      apiKeyCiphertext: ciphertext.toString('base64'),
      apiKeyIv: iv.toString('base64'),
      apiKeyAuthTag: cipher.getAuthTag().toString('base64'),
    };
  }

  private decrypt(model: AiModelConfig): string {
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey(),
        Buffer.from(model.apiKeyIv, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(model.apiKeyAuthTag, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(model.apiKeyCiphertext, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new ServiceUnavailableException('Unable to decrypt the saved API Key; check AI_SETTINGS_ENCRYPTION_KEY');
    }
  }

  private async requireModel(id: string): Promise<AiModelConfig> {
    const model = await this.prisma.aiModelConfig.findUnique({ where: { id } });
    if (!model) throw new NotFoundException(`AI model configuration not found: ${id}`);
    return model;
  }

  private present(model: AiModelConfig) {
    return {
      id: model.id,
      apiFormat: model.apiFormat,
      baseUrl: model.baseUrl,
      useFullUrl: model.useFullUrl,
      modelId: model.modelId,
      displayName: model.displayName,
      hasApiKey: Boolean(model.apiKeyCiphertext),
      isActive: model.isActive,
      createdAt: model.createdAt.toISOString(),
      updatedAt: model.updatedAt.toISOString(),
    };
  }
}
