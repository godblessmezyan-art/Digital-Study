import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { StudyAuthGuard } from '../auth/study-auth.guard';
import { SaveJournalEntryRequest } from './dto/save-journal-entry.dto';
import { JournalService } from './journal.service';

type UserRequest = Request & { user: { username: string } };

@Controller('journal')
@UseGuards(StudyAuthGuard)
export class JournalController {
  constructor(private readonly journal: JournalService) {}

  @Get()
  list(
    @Req() request: UserRequest,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('mood') mood?: string,
  ) {
    return this.journal.list(request.user.username, { year, month, tag, search, mood });
  }

  @Get(':id')
  findOne(@Req() request: UserRequest, @Param('id') id: string) {
    return this.journal.findOne(request.user.username, id);
  }

  @Post()
  create(@Req() request: UserRequest, @Body() input: SaveJournalEntryRequest) {
    return this.journal.create(request.user.username, input);
  }

  @Put(':id')
  update(@Req() request: UserRequest, @Param('id') id: string, @Body() input: SaveJournalEntryRequest) {
    return this.journal.update(request.user.username, id, input);
  }

  @Delete(':id')
  remove(@Req() request: UserRequest, @Param('id') id: string) {
    return this.journal.remove(request.user.username, id);
  }
}
