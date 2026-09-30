import { strict as assert } from 'node:assert';
import { writeFileSync } from 'node:fs';
import { HtmlRendererService } from '../ai/html-renderer.service';
import type { GeneratedBook, GenerationInput } from '../ai/ai.types';

const renderer = new HtmlRendererService();
const input: GenerationInput = {
  title: '高质量阅读测试',
  slug: 'rich-renderer-test',
  author: '测试作者',
  categoryName: '阅读',
  templateId: 'ten-minute-reading',
  modules: ['overview'],
  sourceText: '',
};
const book: GeneratedBook = {
  title: input.title,
  summary: '验证主题、丰富组件、响应式布局与安全转义。',
  tags: ['设计', '阅读'],
  design: {
    theme: 'cosmic',
    motif: 'constellation',
    eyebrow: '测试专题',
    subtitle: '结构化视觉阅读',
    heroQuote: '让内容与设计彼此支撑。',
  },
  sections: [{
    key: 'overview',
    title: '章节标题',
    content: '章节摘要',
    blocks: [
      { type: 'lead', content: '导语内容' },
      { type: 'cards', title: '观点卡片', items: [{ title: '观点一', content: '解释内容' }] },
      { type: 'comparison', title: '方法对照', left: { title: '误区', content: '旧方法' }, right: { title: '改进', content: '新方法' } },
      { type: 'checklist', title: '行动清单', items: [{ content: '完成一次实践<script>alert(1)</script>' }] },
    ],
  }],
};

const html = renderer.render(book, input);
assert.match(html, /data-theme="cosmic"/);
assert.match(html, /class="hero-art"/);
assert.match(html, /class="card-grid"/);
assert.match(html, /class="comparison"/);
assert.match(html, /class="block-group checklist"/);
assert.match(html, /@media\(max-width:760px\)/);
assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
if (process.env.RENDERER_OUTPUT) writeFileSync(process.env.RENDERER_OUTPUT, html, 'utf8');

const goodnightHtml = renderer.render(book, {
  ...input,
  templateId: 'goodnight-reading',
  modules: ['night-intro', 'core-ideas', 'gentle-practice', 'goodnight-note'],
});
assert.match(goodnightHtml, /class="theme-select"/);
assert.equal((goodnightHtml.match(/<option value="theme-/g) ?? []).length, 16);
assert.match(goodnightHtml, /value="theme-deepsea"/);
assert.match(goodnightHtml, /class="chapter-static mindmap-section"/);
assert.match(goodnightHtml, /\.markmap-foreign/);
assert.match(goodnightHtml, /cdn\.jsdelivr\.net\/npm\/markmap-autoloader/);
assert.match(goodnightHtml, /class="goodnight"/);
assert.match(goodnightHtml, /晚安/);
assert.match(goodnightHtml, /@media\(max-width:760px\)/);
assert.doesNotMatch(goodnightHtml, /<script>alert\(1\)<\/script>/);
assert.match(goodnightHtml, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
if (process.env.GOODNIGHT_RENDERER_OUTPUT) writeFileSync(process.env.GOODNIGHT_RENDERER_OUTPUT, goodnightHtml, 'utf8');
console.log('Rich HTML renderer verification passed.');
