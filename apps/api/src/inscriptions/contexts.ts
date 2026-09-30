/**
 * Usage-context registry (Binding layer).
 *
 * Category answers "what kind of resource is this"; context answers
 * "which page / feature / slot may consume it". UI never shows raw keys.
 */
export interface InscriptionContext {
  key: string;
  page: string;
  feature: string;
  slot: string;
  kind: 'PROMPT' | 'TEMPLATE';
}

export const INSCRIPTION_CONTEXTS: InscriptionContext[] = [
  { key: 'ai_workshop.generate.prompt', page: '铭文台', feature: 'AI 生成', slot: '提示词', kind: 'PROMPT' },
  { key: 'ai_workshop.generate.template', page: '铭文台', feature: 'AI 生成', slot: '模板', kind: 'TEMPLATE' },
  { key: 'plan.breakdown.prompt', page: '远征计划', feature: 'AI 任务拆解', slot: '提示词', kind: 'PROMPT' },
  { key: 'reading.summary.prompt', page: '静阅室', feature: 'AI 总结', slot: '提示词', kind: 'PROMPT' },
  { key: 'journal.review.prompt', page: '旅者手记', feature: 'AI 反思', slot: '提示词', kind: 'PROMPT' },
  { key: 'journal.new.template', page: '旅者手记', feature: '新建手记', slot: '模板', kind: 'TEMPLATE' },
  { key: 'curator.deep.prompt', page: '秘典回响', feature: '深度思考', slot: '提示词', kind: 'PROMPT' },
  { key: 'curator.echo.prompt', page: '秘典回响', feature: '通用问答', slot: '提示词', kind: 'PROMPT' },
  { key: 'reading.note.ai', page: '静阅室', feature: '笔记助手', slot: '提示词', kind: 'PROMPT' },
  { key: 'plan.assistant.ai', page: '远征计划', feature: '计划助手', slot: '提示词', kind: 'PROMPT' },
  { key: 'journal.reflect.ai', page: '旅者手记', feature: '反思助手', slot: '提示词', kind: 'PROMPT' },
];

export function contextLabel(key: string): string {
  const context = INSCRIPTION_CONTEXTS.find((item) => item.key === key);
  return context ? `${context.page} / ${context.feature} / ${context.slot}` : key;
}

export function contextKind(key: string): 'PROMPT' | 'TEMPLATE' | null {
  return INSCRIPTION_CONTEXTS.find((item) => item.key === key)?.kind ?? null;
}

export const TEMPLATE_KINDS = [
  'HTML_TEMPLATE',
  'BOOK_TEMPLATE',
  'JOURNAL_TEMPLATE',
  'PLAN_TEMPLATE',
  'NOTE_TEMPLATE',
] as const;
