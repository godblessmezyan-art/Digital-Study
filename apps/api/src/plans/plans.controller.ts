import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { StudyAuthGuard } from '../auth/study-auth.guard';
import { AiPlanService } from './ai-plan.service';
import { AiApplyBreakdownRequest, AiPlanBreakdownRequest, AiTaskBreakdownRequest } from './dto/ai-plan.dto';
import { ReorderPlanTasksRequest } from './dto/reorder-plan-tasks.dto';
import { SavePlanRequest } from './dto/save-plan.dto';
import { SavePlanTaskRequest, UpdatePlanTaskRequest } from './dto/save-plan-task.dto';
import { PlansService } from './plans.service';

type UserRequest = Request & { user: { username: string } };

@Controller('plans')
@UseGuards(StudyAuthGuard)
export class PlansController {
  constructor(
    private readonly plans: PlansService,
    private readonly aiPlan: AiPlanService,
  ) {}

  // ===== AI breakdown (declared before :id routes) =====

  @Post('ai/breakdown')
  aiBreakdown(@Body() input: AiPlanBreakdownRequest) {
    return this.aiPlan.breakdown(input);
  }

  @Post('ai/breakdown-task')
  aiBreakdownTask(@Req() request: UserRequest, @Body() input: AiTaskBreakdownRequest) {
    return this.aiPlan.breakdownTask(request.user.username, input);
  }

  @Post('ai/apply')
  aiApply(@Req() request: UserRequest, @Body() input: AiApplyBreakdownRequest) {
    return this.plans.applyBreakdown(request.user.username, input);
  }

  @Get('today')
  today(@Req() request: UserRequest) {
    return this.plans.today(request.user.username);
  }

  // ===== Plans =====

  @Get()
  list(@Req() request: UserRequest, @Query('status') status?: string) {
    return this.plans.list(request.user.username, status);
  }

  @Post()
  create(@Req() request: UserRequest, @Body() input: SavePlanRequest) {
    return this.plans.create(request.user.username, input);
  }

  @Get(':id')
  findOne(@Req() request: UserRequest, @Param('id') id: string) {
    return this.plans.findOne(request.user.username, id);
  }

  @Put(':id')
  update(@Req() request: UserRequest, @Param('id') id: string, @Body() input: SavePlanRequest) {
    return this.plans.update(request.user.username, id, input);
  }

  @Delete(':id')
  remove(@Req() request: UserRequest, @Param('id') id: string) {
    return this.plans.remove(request.user.username, id);
  }

  // ===== Tasks =====

  @Post(':id/tasks')
  createTask(@Req() request: UserRequest, @Param('id') id: string, @Body() input: SavePlanTaskRequest) {
    return this.plans.createTask(request.user.username, id, input);
  }

  @Post(':id/tasks/reorder')
  reorderTasks(@Req() request: UserRequest, @Param('id') id: string, @Body() input: ReorderPlanTasksRequest) {
    return this.plans.reorder(request.user.username, id, input);
  }

  @Put(':id/tasks/:taskId')
  updateTask(@Req() request: UserRequest, @Param('id') id: string, @Param('taskId') taskId: string, @Body() input: UpdatePlanTaskRequest) {
    return this.plans.updateTask(request.user.username, id, taskId, input);
  }

  @Delete(':id/tasks/:taskId')
  removeTask(@Req() request: UserRequest, @Param('id') id: string, @Param('taskId') taskId: string) {
    return this.plans.removeTask(request.user.username, id, taskId);
  }
}
