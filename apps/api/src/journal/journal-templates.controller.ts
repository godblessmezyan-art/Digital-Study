import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { StudyAuthGuard } from '../auth/study-auth.guard';
import { SaveJournalTemplateRequest } from './dto/save-journal-template.dto';
import { JournalTemplatesService } from './journal-templates.service';

type UserRequest = Request & { user: { username: string } };

@Controller('journal/templates')
@UseGuards(StudyAuthGuard)
export class JournalTemplatesController {
  constructor(private readonly templates: JournalTemplatesService) {}

  @Get()
  list(@Req() request: UserRequest, @Query('activeOnly') activeOnly?: string) {
    return this.templates.list(request.user.username, { activeOnly: activeOnly === '1' || activeOnly === 'true' });
  }

  @Post()
  create(@Req() request: UserRequest, @Body() input: SaveJournalTemplateRequest) {
    return this.templates.create(request.user.username, input);
  }

  @Put(':id')
  update(@Req() request: UserRequest, @Param('id') id: string, @Body() input: SaveJournalTemplateRequest) {
    return this.templates.update(request.user.username, id, input);
  }

  @Post(':id/duplicate')
  duplicate(@Req() request: UserRequest, @Param('id') id: string) {
    return this.templates.duplicate(request.user.username, id);
  }

  @Post(':id/default')
  setDefault(@Req() request: UserRequest, @Param('id') id: string) {
    return this.templates.setDefault(request.user.username, id);
  }

  @Post(':id/active')
  toggleActive(@Req() request: UserRequest, @Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.templates.toggleActive(request.user.username, id, Boolean(isActive));
  }

  @Delete(':id')
  remove(@Req() request: UserRequest, @Param('id') id: string) {
    return this.templates.remove(request.user.username, id);
  }
}
