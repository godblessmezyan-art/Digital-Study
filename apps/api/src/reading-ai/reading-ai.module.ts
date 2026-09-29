import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { AiContextService } from './ai-context.service';
import { ReadingAiController } from './reading-ai.controller';
import { ReadingAiService } from './reading-ai.service';

@Module({
  imports: [AiModule, AuthModule],
  controllers: [ReadingAiController],
  providers: [AiContextService, ReadingAiService],
})
export class ReadingAiModule {}
