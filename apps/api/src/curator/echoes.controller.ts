import { Body, Controller, Delete, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { StudyAuthGuard } from '../auth/study-auth.guard';

type UserRequest = Request & { user: { username: string } };
import { AiModelConfigsService } from '../ai/ai-model-configs.service';
import { EchoChatRequest, SaveEchoJournalRequest, SaveEchoNoteRequest } from './dto/echo-chat.dto';
import { EchoesService } from './echoes.service';

@Controller('curator/echoes')
@UseGuards(StudyAuthGuard)
export class EchoesController {
  constructor(
    private readonly echoes: EchoesService,
    private readonly models: AiModelConfigsService,
  ) {}

  @Post('chat')
  chat(@Req() request: UserRequest, @Body() dto: EchoChatRequest, @Res() response: Response) {
    return this.echoes.chat(request.user.username, dto, response);
  }

  @Get('sessions')
  sessions(@Req() request: UserRequest) {
    return this.echoes.listSessions(request.user.username);
  }

  @Get('inscriptions')
  inscriptions() {
    return this.echoes.promptInscriptions();
  }

  @Get('inscriptions/:id')
  inscription(@Param('id') id: string) {
    return this.echoes.inscriptionDetail(id);
  }

  @Get('models')
  async modelsList() {
    const [available, current] = await Promise.all([this.models.availableModels(), this.models.publicConfiguration()]);
    return { available, current };
  }

  @Get('sessions/:id')
  session(@Req() request: UserRequest, @Param('id') id: string) {
    return this.echoes.getSession(request.user.username, id);
  }

  @Delete('sessions/:id')
  deleteSession(@Req() request: UserRequest, @Param('id') id: string) {
    return this.echoes.deleteSession(request.user.username, id);
  }

  @Post('save-note')
  saveNote(@Req() request: UserRequest, @Body() dto: SaveEchoNoteRequest) {
    return this.echoes.saveAsNote(request.user.username, dto);
  }

  @Post('save-journal')
  saveJournal(@Req() request: UserRequest, @Body() dto: SaveEchoJournalRequest) {
    return this.echoes.saveAsJournal(request.user.username, dto);
  }
}
