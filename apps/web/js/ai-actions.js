/**
 * Action Registry: recommended AI actions per context type.
 * Actions carry short user-facing instructions (not system prompts —
 * those always come from the Inscription Archive).
 */

export const AI_ACTIONS = {
  SELECTED_TEXT: [
    { label: '解释这段文字', instruction: '请解释下面这段选中文字的含义与背景。' },
    { label: '总结要点', instruction: '请提炼下面这段选中文字的要点。' },
    { label: '找反例', instruction: '请指出下面这段文字的观点可能存在的反例或局限。' },
  ],
  BOOK: [
    { label: '总结核心内容', instruction: '请总结这本书的核心内容与关键洞见。' },
    { label: '解释概念', instruction: '请解释这本书中的重要概念，用通俗语言说明。' },
    { label: '找反例', instruction: '请指出这本书观点的反例、争议或适用边界。' },
    { label: '联系旧笔记', instruction: '请分析这本书与我的历史笔记、书摘之间的联系。' },
  ],
  NOTE: [
    { label: '深化这条笔记', instruction: '请基于这条笔记提出深化思考的方向。' },
    { label: '转化为行动', instruction: '请把这条笔记转化为可执行的行动建议。' },
    { label: '联系相关内容', instruction: '请分析这条笔记与我的其他记录之间的联系。' },
  ],
  JOURNAL: [
    { label: '回顾这段经历', instruction: '请帮助我回顾这段手记中的经历与情绪。' },
    { label: '寻找重复主题', instruction: '请从这段手记中找出可能重复出现的主题或模式。' },
    { label: '生成反思问题', instruction: '请基于这段手记生成 3 个值得我继续反思的问题。' },
  ],
  PLAN: [
    { label: '拆解下一步', instruction: '请帮我拆解这个计划的下一步具体行动。' },
    { label: '识别阻碍', instruction: '请分析这个计划可能遇到的阻碍与应对方式。' },
    { label: '生成今日任务', instruction: '请基于这个计划生成今天可以完成的 1-3 个任务。' },
  ],
  PAGE: [
    { label: '总结当前页面', instruction: '请总结当前页面内容的关键信息。' },
  ],
};

/** Actions for the highest-priority current context. */
export function actionsForContexts(contexts) {
  const primary = contexts[0]?.type;
  return AI_ACTIONS[primary] || AI_ACTIONS.PAGE;
}
