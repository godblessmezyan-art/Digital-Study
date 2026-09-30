import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Plan, PlanTask, Prisma } from '@prisma/client';
import type { PlanDetailDto, PlanSummaryDto, PlanTaskDto } from '@digital-study/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AiIndexService } from '../semantic/ai-index.service';
import type { AiApplyBreakdownRequest } from './dto/ai-plan.dto';
import type { ReorderPlanTasksRequest } from './dto/reorder-plan-tasks.dto';
import type { SavePlanRequest } from './dto/save-plan.dto';
import type { SavePlanTaskRequest, UpdatePlanTaskRequest } from './dto/save-plan-task.dto';

type TaskWithRelations = PlanTask & { children?: TaskWithRelations[] };

/** Root tasks are depth 0; the tree is capped at 3 visible levels (depth 0..2). */
const MAX_TASK_DEPTH = 2;

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService, private readonly index: AiIndexService) {}

  // ===== Plans =====

  async list(ownerId: string, status?: string): Promise<PlanSummaryDto[]> {
    const where: Prisma.PlanWhereInput = { ownerId };
    if (status) where.status = this.planStatus(status);
    const plans = await this.prisma.plan.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      include: { tasks: { select: { id: true, title: true, status: true, dueDate: true, order: true, parentId: true } } },
    });
    return plans.map((plan) => this.toSummary(plan, plan.tasks));
  }

  async create(ownerId: string, input: SavePlanRequest): Promise<PlanSummaryDto> {
    const plan = await this.prisma.plan.create({ data: { ownerId, ...this.planData(input) } });
    this.touchPlan(plan.id);
    return this.toSummary(plan, []);
  }

  async findOne(ownerId: string, id: string): Promise<PlanDetailDto> {
    const plan = await this.prisma.plan.findFirst({ where: { id, ownerId }, include: { tasks: true } });
    if (!plan) throw new NotFoundException('计划不存在或已被删除');
    const summary = this.toSummary(plan, plan.tasks);
    return { ...summary, tasks: this.buildTree(plan.tasks) };
  }

  async update(ownerId: string, id: string, input: SavePlanRequest): Promise<PlanSummaryDto> {
    await this.requirePlan(ownerId, id);
    const plan = await this.prisma.plan.update({ where: { id }, data: this.planData(input) });
    const tasks = await this.prisma.planTask.findMany({ where: { planId: id } });
    this.touchPlan(plan.id);
    return this.toSummary(plan, tasks);
  }

  async remove(ownerId: string, id: string) {
    await this.requirePlan(ownerId, id);
    await this.prisma.plan.delete({ where: { id } });
    void this.index.removePlan(id, ownerId).catch(() => undefined);
    return { id, deleted: true };
  }

  /** Tasks due today or overdue, plus in-progress tasks, across all active plans. */
  async today(ownerId: string): Promise<PlanTaskDto[]> {
    const todayEnd = this.endOfTodayUtc();
    const tasks = await this.prisma.planTask.findMany({
      where: {
        plan: { ownerId, status: { in: ['ACTIVE', 'DRAFT'] } },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        OR: [{ dueDate: { lte: todayEnd } }, { status: 'IN_PROGRESS' }],
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { order: 'asc' }],
      take: 50,
    });
    return tasks.map((task) => this.toTaskDto(task, 0));
  }

  // ===== Tasks =====

  async createTask(ownerId: string, planId: string, input: SavePlanTaskRequest): Promise<PlanTaskDto> {
    await this.requirePlan(ownerId, planId);
    const depth = await this.resolveDepth(planId, input.parentId);
    if (depth > MAX_TASK_DEPTH) throw new BadRequestException('任务层级最多三层，无法继续添加子任务');
    const order = input.order ?? (await this.nextOrder(planId, input.parentId ?? null));
    const task = await this.prisma.planTask.create({
      data: {
        planId,
        parentId: input.parentId?.trim() || null,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        status: input.status ?? 'PENDING',
        priority: input.priority ?? 'MEDIUM',
        estimatedMinutes: input.estimatedMinutes ?? null,
        dueDate: this.date(input.dueDate),
        acceptanceCriteria: input.acceptanceCriteria?.trim() || null,
        order,
      },
    });
    await this.refreshPlanProgress(planId);
    this.touchPlan(planId);
    return this.toTaskDto(task, depth);
  }

  async updateTask(ownerId: string, planId: string, taskId: string, input: UpdatePlanTaskRequest): Promise<PlanTaskDto> {
    const task = await this.requireTask(ownerId, planId, taskId);
    let parentId = task.parentId;
    if (input.parentId !== undefined) {
      const nextParent = input.parentId?.trim() || null;
      if (nextParent === taskId) throw new BadRequestException('不能把任务移动到自己下面');
      if (nextParent !== task.parentId) {
        await this.assertMoveAllowed(planId, taskId, nextParent);
        parentId = nextParent;
      }
    }
    const data: Prisma.PlanTaskUncheckedUpdateInput = {
      parentId,
      title: input.title?.trim() || task.title,
      description: input.description !== undefined ? input.description?.trim() || null : task.description,
      status: input.status ?? task.status,
      priority: input.priority ?? task.priority,
      estimatedMinutes: input.estimatedMinutes !== undefined ? input.estimatedMinutes ?? null : task.estimatedMinutes,
      dueDate: input.dueDate !== undefined ? this.date(input.dueDate) : task.dueDate,
      acceptanceCriteria: input.acceptanceCriteria !== undefined ? input.acceptanceCriteria?.trim() || null : task.acceptanceCriteria,
      order: input.order ?? task.order,
    };
    const previousStatus = task.status;
    const updated = await this.prisma.planTask.update({ where: { id: taskId }, data });
    if (previousStatus !== updated.status) await this.cascadeParentStatus(planId, parentId, updated.status);
    await this.refreshPlanProgress(planId);
    this.touchPlan(planId);
    const depth = await this.depthOf(planId, updated.parentId);
    return this.toTaskDto(updated, depth);
  }

  async removeTask(ownerId: string, planId: string, taskId: string) {
    await this.requireTask(ownerId, planId, taskId);
    await this.prisma.planTask.delete({ where: { id: taskId } });
    await this.refreshPlanProgress(planId);
    this.touchPlan(planId);
    return { id: taskId, deleted: true };
  }

  async reorder(ownerId: string, planId: string, input: ReorderPlanTasksRequest): Promise<{ updated: number }> {
    await this.requirePlan(ownerId, planId);
    const existing = await this.prisma.planTask.findMany({ where: { planId }, select: { id: true } });
    const known = new Set(existing.map((task) => task.id));
    const items = input.items.filter((item) => known.has(item.id));
    for (const item of items) {
      if (item.parentId && !known.has(item.parentId)) throw new BadRequestException('排序数据中包含未知的父任务');
      if (item.parentId === item.id) throw new BadRequestException('不能把任务移动到自己下面');
    }
    await this.prisma.$transaction(items.map((item) => this.prisma.planTask.update({
      where: { id: item.id },
      data: { order: item.order, ...(item.parentId !== undefined ? { parentId: item.parentId || null } : {}) },
    })));
    await this.refreshPlanProgress(planId);
    this.touchPlan(planId);
    return { updated: items.length };
  }

  // ===== AI breakdown apply =====

  /**
   * Writes a user-confirmed AI preview into the database. Milestones become
   * parent tasks, their tasks become children. Without parentTaskId the
   * milestones are appended at root level.
   */
  async applyBreakdown(ownerId: string, input: AiApplyBreakdownRequest): Promise<PlanDetailDto & { appliedTaskIds: string[] }> {
    const planId = input.planId;
    await this.requirePlan(ownerId, planId);
    let baseDepth = -1;
    if (input.parentTaskId) {
      const parent = await this.requireTask(ownerId, planId, input.parentTaskId);
      baseDepth = await this.depthOf(planId, parent.id);
      if (baseDepth + 1 > MAX_TASK_DEPTH) throw new BadRequestException('该任务层级过深，无法再应用 AI 拆解结果');
    }
    if (!input.milestones.length) throw new BadRequestException('没有可应用的拆解结果');

    let startOrder = await this.nextOrder(planId, input.parentTaskId ?? null);
    const created: string[] = [];
    for (const milestone of input.milestones.slice(0, 12)) {
      const parentTask = await this.prisma.planTask.create({
        data: {
          planId,
          parentId: input.parentTaskId || null,
          title: milestone.title.trim().slice(0, 255),
          description: milestone.description?.trim().slice(0, 5000) || null,
          status: 'PENDING',
          priority: 'MEDIUM',
          order: startOrder++,
        },
      });
      created.push(parentTask.id);
      let childOrder = 0;
      for (const draft of milestone.tasks.slice(0, 40)) {
        const depth = baseDepth + 2;
        const child = await this.prisma.planTask.create({
          data: {
            planId,
            parentId: depth > MAX_TASK_DEPTH ? (input.parentTaskId || null) : parentTask.id,
            title: draft.title.trim().slice(0, 255),
            description: draft.description?.trim().slice(0, 5000) || null,
            status: 'PENDING',
            priority: draft.priority ?? 'MEDIUM',
            estimatedMinutes: draft.estimatedMinutes ?? null,
            dueDate: this.date(draft.dueDate),
            acceptanceCriteria: draft.acceptanceCriteria?.trim().slice(0, 2000) || null,
            order: childOrder++,
          },
        });
        created.push(child.id);
      }
    }
    await this.refreshPlanProgress(planId);
    this.touchPlan(planId);
    const detail = await this.findOne(ownerId, planId);
    return { ...detail, appliedTaskIds: created };
  }

  // ===== internals =====

  /** Fire-and-forget reindex so the curator always sees the latest plan text. */
  private touchPlan(planId: string): void {
    void this.index.indexPlan(planId).catch(() => undefined);
  }

  private planData(input: SavePlanRequest) {
    const title = input.title.trim();
    if (!title) throw new BadRequestException('计划标题不能为空');
    const startDate = this.date(input.startDate);
    const dueDate = this.date(input.dueDate);
    if (startDate && dueDate && dueDate < startDate) throw new BadRequestException('截止日期不能早于开始日期');
    return {
      title,
      description: input.description?.trim() || null,
      status: input.status ? this.planStatus(input.status) : undefined,
      startDate,
      dueDate,
    };
  }

  private planStatus(value: string): 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' {
    const normalized = value.toUpperCase();
    if (!['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'].includes(normalized)) throw new BadRequestException('计划状态无效');
    return normalized as 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  }

  private async requirePlan(ownerId: string, id: string): Promise<Plan> {
    const plan = await this.prisma.plan.findFirst({ where: { id, ownerId } });
    if (!plan) throw new NotFoundException('计划不存在或已被删除');
    return plan;
  }

  private async requireTask(ownerId: string, planId: string, taskId: string): Promise<PlanTask> {
    await this.requirePlan(ownerId, planId);
    const task = await this.prisma.planTask.findFirst({ where: { id: taskId, planId } });
    if (!task) throw new NotFoundException('任务不存在或已被删除');
    return task;
  }

  /** Depth of a task slot: children of `parentId` sit at depthOf(parentId)+1. */
  private async depthOf(planId: string, taskId: string | null): Promise<number> {
    let depth = 0;
    let current = taskId;
    while (current) {
      const parent = await this.prisma.planTask.findFirst({ where: { id: current, planId }, select: { parentId: true } });
      if (!parent) break;
      current = parent.parentId;
      depth += 1;
      if (depth > 10) throw new BadRequestException('任务层级异常');
    }
    return depth;
  }

  private async resolveDepth(planId: string, parentId?: string | null): Promise<number> {
    const trimmed = parentId?.trim() || null;
    if (!trimmed) return 0;
    const parent = await this.prisma.planTask.findFirst({ where: { id: trimmed, planId }, select: { id: true, parentId: true } });
    if (!parent) throw new BadRequestException('父任务不存在');
    return (await this.depthOf(planId, parent.parentId)) + 1;
  }

  private async assertMoveAllowed(planId: string, taskId: string, nextParentId: string | null): Promise<void> {
    if (!nextParentId) return;
    // Cannot move under one of its own descendants.
    let cursor: string | null = nextParentId;
    while (cursor) {
      if (cursor === taskId) throw new BadRequestException('不能把任务移动到它的子任务下面');
      const node: { parentId: string | null } | null = await this.prisma.planTask.findFirst({ where: { id: cursor, planId }, select: { parentId: true } });
      cursor = node?.parentId ?? null;
    }
    const subtreeDepth = await this.subtreeDepth(planId, taskId);
    const targetDepth = (await this.depthOf(planId, nextParentId)) + 1;
    if (targetDepth + subtreeDepth - 1 > MAX_TASK_DEPTH) throw new BadRequestException('移动后任务层级将超过三层');
  }

  private async subtreeDepth(planId: string, taskId: string): Promise<number> {
    const children = await this.prisma.planTask.findMany({ where: { planId, parentId: taskId }, select: { id: true } });
    if (!children.length) return 1;
    return 1 + Math.max(...(await Promise.all(children.map((child) => this.subtreeDepth(planId, child.id)))));
  }

  private async nextOrder(planId: string, parentId: string | null): Promise<number> {
    const last = await this.prisma.planTask.findFirst({
      where: { planId, parentId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? -1) + 1;
  }

  /**
   * Keep parent tasks in sync with their children:
   * all children completed -> parent completed; a child reopened -> parent reopened.
   */
  private async cascadeParentStatus(planId: string, parentId: string | null, childStatus: string): Promise<void> {
    if (!parentId) return;
    const parent = await this.prisma.planTask.findFirst({ where: { id: parentId, planId } });
    if (!parent || parent.status === 'CANCELLED') return;
    const children = await this.prisma.planTask.findMany({ where: { planId, parentId }, select: { status: true } });
    if (!children.length) return;
    const allCompleted = children.every((child) => child.status === 'COMPLETED' || child.status === 'CANCELLED')
      && children.some((child) => child.status === 'COMPLETED');
    if (allCompleted && parent.status !== 'COMPLETED') {
      await this.prisma.planTask.update({ where: { id: parentId }, data: { status: 'COMPLETED' } });
      await this.cascadeParentStatus(planId, parent.parentId, 'COMPLETED');
      return;
    }
    if (!allCompleted && parent.status === 'COMPLETED') {
      await this.prisma.planTask.update({ where: { id: parentId }, data: { status: childStatus === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING' } });
      await this.cascadeParentStatus(planId, parent.parentId, 'PENDING');
      return;
    }
    if (childStatus === 'IN_PROGRESS' && parent.status === 'PENDING') {
      await this.prisma.planTask.update({ where: { id: parentId }, data: { status: 'IN_PROGRESS' } });
      await this.cascadeParentStatus(planId, parent.parentId, 'IN_PROGRESS');
    }
  }

  private async refreshPlanProgress(planId: string): Promise<void> {
    const tasks = await this.prisma.planTask.findMany({ where: { planId }, select: { status: true } });
    const countable = tasks.filter((task) => task.status !== 'CANCELLED');
    const completed = countable.filter((task) => task.status === 'COMPLETED').length;
    const progress = countable.length ? Math.round((completed / countable.length) * 100) : 0;
    await this.prisma.plan.update({ where: { id: planId }, data: { progress } });
  }

  private buildTree(tasks: PlanTask[]): PlanTaskDto[] {
    const byId = new Map<string, TaskWithRelations>();
    tasks.forEach((task) => byId.set(task.id, { ...task, children: [] }));
    const roots: TaskWithRelations[] = [];
    byId.forEach((task) => {
      const parent = task.parentId ? byId.get(task.parentId) : null;
      if (parent) parent.children!.push(task);
      else roots.push(task);
    });
    const sortRecursive = (list: TaskWithRelations[]) => {
      list.sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime());
      list.forEach((task) => sortRecursive(task.children!));
    };
    sortRecursive(roots);
    const toDto = (task: TaskWithRelations, depth: number): PlanTaskDto => ({
      ...this.toTaskDto(task, depth),
      children: (task.children || []).map((child) => toDto(child, depth + 1)),
      childCount: (task.children || []).length,
      completedChildCount: (task.children || []).filter((child) => child.status === 'COMPLETED').length,
    });
    return roots.map((task) => toDto(task, 0));
  }

  private toSummary(plan: Plan, tasks: Array<Pick<PlanTask, 'id' | 'title' | 'status' | 'dueDate' | 'order' | 'parentId'>>): PlanSummaryDto {
    const countable = tasks.filter((task) => task.status !== 'CANCELLED');
    const completed = countable.filter((task) => task.status === 'COMPLETED');
    const next = countable
      .filter((task) => task.status !== 'COMPLETED')
      .sort((a, b) => {
        const byDue = (a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER);
        return byDue !== 0 ? byDue : a.order - b.order;
      })[0] ?? null;
    return {
      id: plan.id,
      title: plan.title,
      description: plan.description,
      status: plan.status.toLowerCase() as PlanSummaryDto['status'],
      startDate: plan.startDate ? plan.startDate.toISOString().slice(0, 10) : null,
      dueDate: plan.dueDate ? plan.dueDate.toISOString().slice(0, 10) : null,
      progress: plan.progress,
      totalTasks: countable.length,
      completedTasks: completed.length,
      nextTask: next ? { id: next.id, title: next.title, dueDate: next.dueDate ? next.dueDate.toISOString().slice(0, 10) : null } : null,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  private toTaskDto(task: PlanTask, depth: number): PlanTaskDto {
    return {
      id: task.id,
      planId: task.planId,
      parentId: task.parentId,
      title: task.title,
      description: task.description,
      status: task.status.toLowerCase() as PlanTaskDto['status'],
      priority: task.priority.toLowerCase() as PlanTaskDto['priority'],
      estimatedMinutes: task.estimatedMinutes,
      dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
      order: task.order,
      acceptanceCriteria: task.acceptanceCriteria,
      depth,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private date(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('日期无效');
    return date;
  }

  private endOfTodayUtc(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
