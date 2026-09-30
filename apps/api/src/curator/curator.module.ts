import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { ReadingAiModule } from '../reading-ai/reading-ai.module';
import { SemanticModule } from '../semantic/semantic.module';
import { CuratorInsightsService } from './curator-insights.service';
import { CuratorController } from './curator.controller';
import { CuratorService } from './curator.service';

@Module({
  imports: [AiModule, AuthModule, ReadingAiModule, SemanticModule],
  controllers: [CuratorController],
  providers: [CuratorService, CuratorInsightsService],
})
export class CuratorModule {}
