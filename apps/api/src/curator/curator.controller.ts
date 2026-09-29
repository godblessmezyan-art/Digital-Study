import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { StudyAdminGuard, StudyAuthGuard } from '../auth/study-auth.guard';
import { AiIndexService } from '../semantic/ai-index.service';
import { CuratorService } from './curator.service';
import { CuratorQueryRequest } from './dto/curator-query.dto';

type UserRequest = Request & { user: { username: string } };

@Controller('curator')
export class CuratorController {
  constructor(private readonly curator: CuratorService, private readonly index: AiIndexService) {}

  @Post('search')
  @UseGuards(StudyAuthGuard)
  search(@Req() request: UserRequest, @Body() input: CuratorQueryRequest) {
    return this.curator.search(request.user.username, input.query, input.scope || 'all');
  }

  @Post('stream')
  @UseGuards(StudyAuthGuard)
  async stream(@Req() request: UserRequest, @Body() input: CuratorQueryRequest, @Res() response: Response) {
    response.status(200);
    response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();
    const abort = new AbortController();
    response.on('close', () => { if (!response.writableEnded) abort.abort(); });
    try {
      await this.curator.stream(request.user.username, input, response, abort.signal);
    } catch (error) {
      if (!abort.signal.aborted && !response.writableEnded) response.write(`${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'AI 馆长暂时不可用' })}\n`);
    } finally {
      if (!response.writableEnded) response.end();
    }
  }

  @Post('index/rebuild')
  @UseGuards(StudyAdminGuard)
  rebuild() { return this.index.rebuildAll(); }
}
