import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { InscriptionsModule } from '../inscriptions/inscriptions.module';
import { AuthModule } from '../auth/auth.module';
import { AiController } from './ai.controller';
import { AiModelConfigsService } from './ai-model-configs.service';
import { AiProviderService } from './ai-provider.service';
import { GenerationsService } from './generations.service';
import { HtmlRendererService } from './html-renderer.service';
import { TemplatesService } from './templates.service';
import { AiStreamingService } from './ai-streaming.service';

@Module({
  imports: [ContentModule, AuthModule, InscriptionsModule],
  controllers: [AiController],
  providers: [
    AiModelConfigsService,
    AiProviderService,
    GenerationsService,
    HtmlRendererService,
    TemplatesService,
    AiStreamingService,
  ],
  exports: [AiModelConfigsService, AiStreamingService],
})
export class AiModule {}
