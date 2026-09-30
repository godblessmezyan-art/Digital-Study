import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Response } from 'express';
import { AiModelConfigsService, type AiRuntimeConfig } from './ai-model-configs.service';
import { AiStreamingService } from './ai-streaming.service';

export interface ExecutionMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ExecutionRequest {
  systemPrompt: string;
  messages: ExecutionMessage[];
  modelId?: string;
  mockText?: string;
}

export interface ExecutionRuntime {
  runtime: AiRuntimeConfig;
}

/**
 * Unified AI execution layer. Every AI feature (Echo workspace, page actions,
 * global panel) streams through this service — no page owns its own provider
 * wiring. Prompt content itself always comes from the Inscription Archive.
 */
@Injectable()
export class AiExecutionService {
  constructor(
    private readonly models: AiModelConfigsService,
    private readonly streaming: AiStreamingService,
  ) {}

  /** Replaces {{variable}} placeholders with user-provided values. */
  renderPrompt(template: string, variables?: Record<string, string>): string {
    return template.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, key: string) => {
      const value = variables?.[key];
      return value === undefined || value === '' ? match : String(value);
    });
  }

  /** Resolves the runtime for an optional model picker selection. */
  async resolveRuntime(modelId?: string): Promise<AiRuntimeConfig> {
    if (modelId) {
      const runtime = await this.models.resolveRuntimeById(modelId);
      if (!runtime || !runtime.configured) {
        throw new BadRequestException('所选模型不可用，请重新选择');
      }
      return runtime;
    }
    const runtime = await this.models.resolveRuntimeConfig();
    if (!runtime.configured) {
      throw new ServiceUnavailableException('尚未配置可用的 AI 模型，请先在铭文台设置中添加模型');
    }
    return runtime;
  }

  async stream(request: ExecutionRequest, response: Response, signal: AbortSignal, onDelta?: (text: string) => void): Promise<ExecutionRuntime> {
    const runtime = await this.resolveRuntime(request.modelId);
    await this.streaming.stream(
      request.systemPrompt,
      request.messages,
      response,
      signal,
      request.mockText ?? '（mock）已收到你的问题，但当前未配置真实模型。',
      runtime,
      onDelta,
    );
    return { runtime };
  }
}
