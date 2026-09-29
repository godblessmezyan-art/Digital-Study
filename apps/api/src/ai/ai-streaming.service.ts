import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { AiModelConfigsService } from './ai-model-configs.service';

type Message = { role: 'user' | 'assistant'; content: string };

@Injectable()
export class AiStreamingService {
  constructor(private readonly models: AiModelConfigsService) {}

  async stream(systemPrompt: string, messages: Message[], response: Response, signal: AbortSignal, mockText: string) {
    const runtime = await this.models.resolveRuntimeConfig();
    if (runtime.provider === 'mock') {
      for (const text of mockText.match(/.{1,12}/gs) || []) {
        if (signal.aborted) return;
        this.send(response, { type: 'delta', text });
      }
      this.send(response, { type: 'done' });
      return;
    }
    const upstream = await this.models.sendChat(runtime, {
      model: runtime.model,
      temperature: 0.25,
      stream: true,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }, signal);
    await this.relay(upstream, response, signal);
  }

  private async relay(upstream: globalThis.Response, response: Response, signal: AbortSignal) {
    const contentType = upstream.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const payload = await upstream.json() as { choices?: Array<{ message?: { content?: string } }> };
      const text = payload.choices?.[0]?.message?.content || '';
      if (text) this.send(response, { type: 'delta', text });
      this.send(response, { type: 'done' });
      return;
    }
    const reader = upstream.body?.getReader();
    if (!reader) throw new Error('AI provider did not return a readable stream');
    const decoder = new TextDecoder();
    let buffer = '';
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const chunk = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string }; text?: string }> };
          const text = chunk.choices?.[0]?.delta?.content || chunk.choices?.[0]?.text || '';
          if (text) this.send(response, { type: 'delta', text });
        } catch { /* Provider keep-alive frame. */ }
      }
    }
    if (!signal.aborted) this.send(response, { type: 'done' });
  }

  private send(response: Response, value: Record<string, unknown>) {
    if (!response.writableEnded) response.write(`${JSON.stringify(value)}\n`);
  }
}
