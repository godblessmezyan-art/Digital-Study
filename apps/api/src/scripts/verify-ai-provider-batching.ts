import { strict as assert } from 'node:assert';
import { AiProviderService } from '../ai/ai-provider.service';
import type { AiTemplate, GenerationInput } from '../ai/ai.types';

const moduleKeys = ['night-intro', 'book-map', 'core-ideas', 'gentle-practice', 'night-reflection', 'goodnight-note'];
const batches = [moduleKeys.slice(0, 2), moduleKeys.slice(2, 4), moduleKeys.slice(4, 6)];
const requests: Record<string, unknown>[] = [];

const modelConfigs = {
  resolveRuntimeConfig: async () => ({
    provider: 'openai-compatible',
    model: 'batch-test-model',
    displayName: 'Batch test model',
    requestUrl: 'https://example.invalid/chat/completions',
    apiKey: 'test-key',
    source: 'database',
    configured: true,
  }),
  sendChat: async (_runtime: unknown, body: Record<string, unknown>) => {
    const keys = batches[requests.length];
    requests.push(body);
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            title: '奇迹公式',
            summary: '分批生成验证',
            tags: ['晚安阅读'],
            design: { theme: 'night', motif: 'library', eyebrow: '睡前阅读', subtitle: '温柔而坚定', heroQuote: '今晚，只向前一步。' },
            sections: keys.map((key) => ({
              key,
              title: key,
              content: `${key} 正文`,
              blocks: [{ type: 'paragraph', content: `${key} 正文` }],
            })),
          }),
        },
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  },
};

const template: AiTemplate = {
  schemaVersion: 1,
  id: 'goodnight-reading',
  name: '晚安睡前阅读',
  description: '测试模板',
  contentType: 'goodnight-book-guide',
  systemPrompt: '生成准确、温柔的睡前阅读内容。',
  defaultModules: moduleKeys,
  modules: moduleKeys.map((key) => ({ key, title: key, instruction: `${key} 要求` })),
};

const input: GenerationInput = {
  title: '奇迹公式',
  slug: 'the-miracle-equation',
  author: '哈尔·埃尔罗德',
  templateId: template.id,
  modules: moduleKeys,
  sourceText: '',
  length: 'long',
};

async function main() {
  const provider = new AiProviderService(modelConfigs as never);
  const result = await provider.generate(input, template);

  assert.equal(requests.length, 3);
  assert.deepEqual(result.sections.map((section) => section.key), moduleKeys);
  assert.equal(result.sections.length, 6);
  assert.equal(result.design?.theme, 'literary');
  console.log('AI provider long-form batching verification passed.');
}

void main();
