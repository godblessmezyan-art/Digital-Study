import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { AiController } from './ai.controller';
import { AiProviderService } from './ai-provider.service';
import { AiTokenGuard } from './ai-token.guard';
import { GenerationsService } from './generations.service';
import { HtmlRendererService } from './html-renderer.service';
import { TemplatesService } from './templates.service';

@Module({
  imports: [ContentModule],
  controllers: [AiController],
  providers: [
    AiProviderService,
    AiTokenGuard,
    GenerationsService,
    HtmlRendererService,
    TemplatesService,
  ],
})
export class AiModule {}
