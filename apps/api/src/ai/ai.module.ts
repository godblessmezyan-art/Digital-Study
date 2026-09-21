import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { AuthModule } from '../auth/auth.module';
import { AiController } from './ai.controller';
import { AiModelConfigsService } from './ai-model-configs.service';
import { AiProviderService } from './ai-provider.service';
import { GenerationsService } from './generations.service';
import { HtmlRendererService } from './html-renderer.service';
import { TemplatesService } from './templates.service';

@Module({
  imports: [ContentModule, AuthModule],
  controllers: [AiController],
  providers: [
    AiModelConfigsService,
    AiProviderService,
    GenerationsService,
    HtmlRendererService,
    TemplatesService,
  ],
})
export class AiModule {}
