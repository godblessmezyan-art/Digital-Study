import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { StudyAuthGuard } from '../auth/study-auth.guard';
import { SaveReadingEntryRequest } from './dto/save-reading-entry.dto';
import { ReadingService } from './reading.service';

type UserRequest = Request & { user: { username: string } };

@Controller('reading/entries')
@UseGuards(StudyAuthGuard)
export class ReadingController {
  constructor(private readonly reading: ReadingService) {}

  @Get()
  list(@Req() request: UserRequest, @Query('type') type?: 'note' | 'quote', @Query('bookSlug') bookSlug?: string, @Query('chapterId') chapterId?: string) {
    return this.reading.list(request.user.username, type, bookSlug, chapterId);
  }

  @Post()
  create(@Req() request: UserRequest, @Body() input: SaveReadingEntryRequest) {
    return this.reading.create(request.user.username, input);
  }

  @Patch(':id')
  update(@Req() request: UserRequest, @Param('id') id: string, @Body() input: SaveReadingEntryRequest) {
    return this.reading.update(request.user.username, id, input);
  }

  @Delete(':id')
  remove(@Req() request: UserRequest, @Param('id') id: string) {
    return this.reading.remove(request.user.username, id);
  }
}
