import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import type { AiPlanBreakdownDto, AiPlanMilestoneDraft, AiPlanTaskDraft } from '@digital-study/shared';
import { AiModelConfigsService, type AiRuntimeConfig } from '../ai/ai-model-configs.service';
import { InscriptionsService } from '../inscriptions/inscriptions.service';
import { BUILTIN_PLAN_PROMPT } from '../inscriptions/builtin-prompts';
import { PrismaService } from '../prisma/prisma.service';
import type { AiPlanBreakdownRequest, AiTaskBreakdownRequest } from './dto/ai-plan.dto';

const SYSTEM_PROMPT = [
  '你是「云天幻境」数字书房中的计划助手（Plan Assistant）。',
  '你的职责不是替用户决定人生目标，而是：理解目标、发现缺失步骤、分析依赖、拆分复杂任务、降低每一步的执行难度。',
  '优先生成清晰、具体、可执行、可验证的小任务。',
  '避免空洞建议、励志语言、重复任务和过度拆分。',
  '每个任务必须可以直接开始执行、结果明确、大小合理（建议 15–180 分钟）、能判断是否完成。',
  '错误示例：「提升听力」「努力学习英语」。正确示例：「完成 Cambridge IELTS 18 Test 1 Listening 并核对答案」「对错题逐句精听并记录生词」。',
  '如果目标信息不足，在 warnings 字段中指出缺少的信息，不要假装知道。',
  '只返回 JSON，不要输出任何其他文字。',
].join('\n');

const OUTPUT_SCHEMA_HINT = JSON.stringify({
  summary: '对整个拆解思路的简短说明（2-4 句）',
  warnings: ['缺少的信息或风险提示，没有则为空数组'],
  milestones: [
    {
      title: '阶段名称（如：第一阶段 · 摸底与基础）',
      description: '阶段目标说明',
      tasks: [
        {
          title: '可直接执行的具体任务',
          description: '任务补充说明（可选）',
          estimatedMinutes: 45,
          priority: 'high | medium | low',
          acceptanceCriteria: '怎样算完成（可验证的标准）',
          dueDate: 'YYYY-MM-DD 或省略',
        },
      ],
    },
  ],
});

@Injectable()
export class AiPlanService {
  constructor(
    private readonly modelConfigs: AiModelConfigsService,
    private readonly prisma: PrismaService,
    private readonly inscriptions: InscriptionsService,
  ) {}

  /** Break a whole goal/plan into milestones + actionable tasks (preview only, no DB writes). */
  async breakdown(input: AiPlanBreakdownRequest): Promise<AiPlanBreakdownDto> {
    const runtime = await this.modelConfigs.resolveRuntimeConfig();
    if (runtime.provider === 'mock') return this.mockBreakdown(input.goal, input.dueDate);
    const userPrompt = this.buildGoalPrompt(input);
    return this.requestBreakdown(runtime, userPrompt);
  }

  /** Break one existing task into subtasks (preview only, no DB writes). */
  async breakdownTask(ownerId: string, input: AiTaskBreakdownRequest): Promise<AiPlanBreakdownDto> {
    const plan = await this.prisma.plan.findFirst({ where: { id: input.planId, ownerId } });
    if (!plan) throw new BadRequestException('计划不存在或已被删除');
    const task = await this.prisma.planTask.findFirst({ where: { id: input.taskId, planId: plan.id } });
    if (!task) throw new BadRequestException('任务不存在或已被删除');
    const siblings = await this.prisma.planTask.findMany({
      where: { planId: plan.id, parentId: task.parentId },
      select: { title: true, status: true },
      orderBy: { order: 'asc' },
      take: 30,
    });
    const runtime = await this.modelConfigs.resolveRuntimeConfig();
    if (runtime.provider === 'mock') return this.mockBreakdown(task.title, task.dueDate ? task.dueDate.toISOString().slice(0, 10) : undefined);
    const userPrompt = this.buildTaskPrompt(plan.title, plan.description, plan.dueDate, task.title, task.description, siblings, input.instruction);
    return this.requestBreakdown(runtime, userPrompt);
  }

  /** The archive copy wins; the builtin constant is only a fallback. */
  private async systemPrompt(): Promise<string> {
    const inscription = await this.inscriptions.resolveForContext('plan.breakdown.prompt').catch(() => null);
    return inscription?.content?.trim() || BUILTIN_PLAN_PROMPT;
  }

  // ===== prompt building =====

  private buildGoalPrompt(input: AiPlanBreakdownRequest): string {
    const lines = [
      `目标：${input.goal}`,
      input.goalDescription ? `目标描述：${input.goalDescription}` : '目标描述：未提供',
      input.dueDate ? `截止日期：${input.dueDate}` : '截止日期：未提供（请在 warnings 中说明缺少期限，并按合理默认节奏拆解）',
      input.currentState ? `当前状态：${input.currentState}` : '当前状态：未提供',
      input.availableTime ? `可投入时间：${input.availableTime}` : '可投入时间：未提供（请在 warnings 中说明）',
      input.constraints ? `限制条件：${input.constraints}` : '限制条件：未提供',
      input.resources ? `已有资源：${input.resources}` : '已有资源：未提供',
      '',
      '请把该目标拆解为 2–6 个阶段（milestones），每个阶段包含 2–8 个具体任务。',
      '阶段之间要有明确的先后关系；任务要落到「今天就能开始做」的粒度。',
      `仅返回 JSON，结构如下：${OUTPUT_SCHEMA_HINT}`,
    ];
    return lines.join('\n');
  }

  private buildTaskPrompt(
    planTitle: string,
    planDescription: string | null,
    planDueDate: Date | null,
    taskTitle: string,
    taskDescription: string | null,
    siblings: Array<{ title: string; status: string }>,
    instruction?: string,
  ): string {
    const lines = [
      `所属计划：${planTitle}`,
      planDescription ? `计划说明：${planDescription}` : '',
      planDueDate ? `计划截止：${planDueDate.toISOString().slice(0, 10)}` : '',
      `需要拆解的任务：${taskTitle}`,
      taskDescription ? `任务说明：${taskDescription}` : '',
      `同级任务（避免重复）：${siblings.map((item) => `${item.title}(${item.status.toLowerCase()})`).join('、') || '无'}`,
      instruction ? `用户补充要求：${instruction}` : '',
      '',
      '请把这一个任务拆解为 1–3 组、每组 2–8 个可直接执行的子任务。',
      '子任务之间要有明确先后关系，避免与同级任务重复。',
      `仅返回 JSON，结构如下：${OUTPUT_SCHEMA_HINT}`,
    ];
    return lines.filter(Boolean).join('\n');
  }

  // ===== model call + strict validation =====

  private async requestBreakdown(runtime: AiRuntimeConfig, userPrompt: string): Promise<AiPlanBreakdownDto> {
    const response = await this.modelConfigs.sendChat(runtime, {
      model: runtime.model,
      temperature: 0.3,
      max_tokens: 8000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: await this.systemPrompt() },
        { role: 'user', content: userPrompt },
      ],
    });
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new BadGatewayException('AI 服务返回了空响应');
    return this.validateBreakdown(this.parseJson(content));
  }

  private parseJson(content: string): unknown {
    const normalized = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      return JSON.parse(normalized);
    } catch {
      throw new BadGatewayException('AI 返回的内容不是合法 JSON，未写入任何数据');
    }
  }

  /**
   * Strict structural validation. Anything invalid is rejected here so that
   * malformed model output can never reach the database (the preview step
   * additionally requires explicit user confirmation before apply).
   */
  validateBreakdown(value: unknown): AiPlanBreakdownDto {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadGatewayException('AI 返回的结构无效，未写入任何数据');
    }
    const raw = value as Record<string, unknown>;
    const milestonesRaw = Array.isArray(raw.milestones) ? raw.milestones : null;
    if (!milestonesRaw || !milestonesRaw.length) {
      throw new BadGatewayException('AI 返回中缺少 milestones，未写入任何数据');
    }
    const milestones: AiPlanMilestoneDraft[] = milestonesRaw.slice(0, 12).flatMap((rawMilestone) => {
      if (!rawMilestone || typeof rawMilestone !== 'object') return [];
      const milestone = rawMilestone as Record<string, unknown>;
      const title = this.text(milestone.title, 255);
      const tasksRaw = Array.isArray(milestone.tasks) ? milestone.tasks : [];
      const tasks = tasksRaw.slice(0, 40).flatMap((rawTask): AiPlanTaskDraft[] => {
        if (!rawTask || typeof rawTask !== 'object') return [];
        const task = rawTask as Record<string, unknown>;
        const taskTitle = this.text(task.title, 255);
        if (!taskTitle) return [];
        const minutes = this.minutes(task.estimatedMinutes);
        const priority = this.priority(task.priority);
        const dueDate = this.dueDate(task.dueDate);
        return [{
          title: taskTitle,
          ...(this.text(task.description, 5000) ? { description: this.text(task.description, 5000) } : {}),
          ...(minutes ? { estimatedMinutes: minutes } : {}),
          ...(priority ? { priority } : {}),
          ...(this.text(task.acceptanceCriteria, 2000) ? { acceptanceCriteria: this.text(task.acceptanceCriteria, 2000) } : {}),
          ...(dueDate ? { dueDate } : {}),
        }];
      });
      if (!title || !tasks.length) return [];
      return [{
        title,
        ...(this.text(milestone.description, 5000) ? { description: this.text(milestone.description, 5000) } : {}),
        tasks,
      }];
    });
    if (!milestones.length) throw new BadGatewayException('AI 返回的任务内容全部无效，未写入任何数据');
    const warnings = Array.isArray(raw.warnings)
      ? raw.warnings.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 10).map((item) => item.trim().slice(0, 500))
      : [];
    return {
      summary: this.text(raw.summary, 2000),
      milestones,
      warnings,
    };
  }

  private text(value: unknown, max: number): string {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
  }

  private minutes(value: unknown): number | undefined {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) return undefined;
    const rounded = Math.round(numeric);
    return rounded >= 1 && rounded <= 100000 ? rounded : undefined;
  }

  private priority(value: unknown): AiPlanTaskDraft['priority'] | undefined {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return ['low', 'medium', 'high'].includes(normalized) ? normalized as AiPlanTaskDraft['priority'] : undefined;
  }

  private dueDate(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return undefined;
    const date = new Date(`${match[0]}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? undefined : match[0];
  }

  // ===== mock =====

  private mockBreakdown(goal: string, dueDate?: string): AiPlanBreakdownDto {
    return {
      summary: `（示例拆解，当前为 mock 模式）围绕「${goal}」拆出三个阶段：先摸清现状，再进入主线推进，最后收尾验证。配置真实模型后可获得针对性拆解。`,
      warnings: dueDate ? [] : ['未提供截止日期，建议补充后重新拆解，以便为阶段分配时间。'],
      milestones: [
        {
          title: '第一阶段 · 摸底与准备',
          description: '确认现状、准备材料，让后续执行不卡在起步上。',
          tasks: [
            { title: `明确「${goal}」的可验证完成标准`, description: '用一句话写出做到什么程度算完成。', estimatedMinutes: 30, priority: 'high', acceptanceCriteria: '写下一条可判断真伪的完成标准' },
            { title: '盘点现有水平与差距', estimatedMinutes: 60, priority: 'high', acceptanceCriteria: '列出当前水平与目标差距清单' },
            { title: '准备所需材料与工具', estimatedMinutes: 45, priority: 'medium', acceptanceCriteria: '材料清单全部就位' },
          ],
        },
        {
          title: '第二阶段 · 主线推进',
          description: '按周推进核心练习，每周末检查一次进度。',
          tasks: [
            { title: '完成第 1 轮核心练习', estimatedMinutes: 90, priority: 'high', acceptanceCriteria: '完成并记录结果' },
            { title: '复盘第 1 轮问题并调整方法', estimatedMinutes: 45, priority: 'medium', acceptanceCriteria: '写下 3 条调整项' },
            { title: '完成第 2 轮核心练习', estimatedMinutes: 90, priority: 'high', acceptanceCriteria: '完成并对比第 1 轮结果' },
          ],
        },
        {
          title: '第三阶段 · 收尾与验证',
          description: '用一次完整演练验证目标是否达成。',
          tasks: [
            { title: '进行一次完整模拟验证', estimatedMinutes: 120, priority: 'high', acceptanceCriteria: '模拟结果达到完成标准' },
            { title: '总结整个计划的经验教训', estimatedMinutes: 30, priority: 'low', acceptanceCriteria: '在旅者手记中写下一段总结' },
          ],
        },
      ],
    };
  }
}
