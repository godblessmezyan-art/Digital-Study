import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { StudyAuthGuard } from '../auth/study-auth.guard';
import { ReadingAiRequest } from './dto/reading-ai-request.dto';
import { ReadingAiService } from './reading-ai.service';

type UserRequest = Request & { user: { username: string } };

@Controller('reading/ai')
@UseGuards(StudyAuthGuard)
export class ReadingAiController {
  constructor(private readonly assistant: ReadingAiService) {}

  @Post('stream')
  async stream(
    @Req() request: UserRequest,
    @Body() input: ReadingAiRequest,
    @Res() response: Response,
  ) {
    response.status(200);
    response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();
    const abort = new AbortController();
    response.on('close', () => { if (!response.writableEnded) abort.abort(); });
    try {
      await this.assistant.stream(request.user.username, input, response, abort.signal);
    } catch (error) {
      if (!abort.signal.aborted && !response.writableEnded) {
        response.write(`${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'AI 阅读助手暂时不可用' })}\n`);
      }
    } finally {
      if (!response.writableEnded) response.end();
    }
  }
}
