import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { ReadingAiModule } from '../reading-ai/reading-ai.module';
import { SemanticModule } from '../semantic/semantic.module';
import { InscriptionsModule } from '../inscriptions/inscriptions.module';
import { AiContextResolverService } from './ai-context-resolver.service';
import { EchoesService } from './echoes.service';
import { EchoesController } from './echoes.controller';
import { CuratorInsightsService } from './curator-insights.service';
import { CuratorController } from './curator.controller';
import { CuratorService } from './curator.service';

@Module({
  imports: [AiModule, AuthModule, ReadingAiModule, SemanticModule, InscriptionsModule],
  controllers: [CuratorController, EchoesController],
  providers: [CuratorService, CuratorInsightsService, AiContextResolverService, EchoesService],
})
export class CuratorModule {}
