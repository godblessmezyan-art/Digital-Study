import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { StudyAdminGuard, StudyAuthGuard } from '../auth/study-auth.guard';
import { ChroniclesService, type TriggerContext } from './chronicles.service';

type UserRequest = Request & { user: { username: string } };

@Controller('chronicles')
@UseGuards(StudyAuthGuard)
export class ChroniclesController {
  constructor(private readonly chronicles: ChroniclesService) {}

  @Get()
  list(@Req() request: UserRequest) {
    return this.chronicles.list(request.user.username);
  }

  @Get('discovered')
  discovered(@Req() request: UserRequest) {
    return this.chronicles.discovered(request.user.username);
  }

  @Get('check-triggers')
  checkTriggers(
    @Req() request: UserRequest,
    @Query('page') page?: string,
    @Query('weather') weather?: string,
    @Query('period') period?: string,
    @Query('date') date?: string,
  ) {
    return this.chronicles.checkTriggers(request.user.username, { page, weather, period, date });
  }

  @Get(':id')
  findOne(@Req() request: UserRequest, @Param('id') id: string) {
    return this.chronicles.findOne(request.user.username, id);
  }

  @Post(':id/read')
  read(@Req() request: UserRequest, @Param('id') id: string) {
    return this.chronicles.markRead(request.user.username, id);
  }

  @Post(':id/discover')
  @UseGuards(StudyAdminGuard)
  discover(
    @Req() request: UserRequest,
    @Param('id') id: string,
    @Body() context: TriggerContext = {},
  ) {
    return this.chronicles.discoverManual(request.user.username, id, context);
  }
}
