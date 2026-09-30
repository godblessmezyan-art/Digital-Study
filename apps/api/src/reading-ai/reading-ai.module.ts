import { InscriptionsModule } from '../inscriptions/inscriptions.module';
import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { AiContextService } from './ai-context.service';
import { ReadingAiController } from './reading-ai.controller';
import { ReadingAiService } from './reading-ai.service';
import { SemanticModule } from '../semantic/semantic.module';

@Module({
  imports: [InscriptionsModule, AiModule, AuthModule, SemanticModule],
  controllers: [ReadingAiController],
  providers: [AiContextService, ReadingAiService],
  exports: [AiContextService],
})
export class ReadingAiModule {}
