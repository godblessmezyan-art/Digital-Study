import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AiModelConfigsService } from './ai-model-configs.service';
import { AiProviderService } from './ai-provider.service';
import { AiTokenGuard } from './ai-token.guard';
import { CreateGenerationRequest } from './dto/create-generation.dto';
import { RegenerateSectionRequest } from './dto/regenerate-section.dto';
import { SaveModelConfigRequest } from './dto/save-model-config.dto';
import { GenerationsService } from './generations.service';
import { TemplatesService } from './templates.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly templates: TemplatesService,
    private readonly generations: GenerationsService,
    private readonly provider: AiProviderService,
    private readonly modelConfigs: AiModelConfigsService,
  ) {}

  @Get('config')
  async config() {
    return {
      ...(await this.provider.configuration()),
      tokenRequired: Boolean(process.env.AI_WORKSHOP_TOKEN),
    };
  }

  @Get('models')
  @UseGuards(AiTokenGuard)
  listModels() {
    return this.modelConfigs.list();
  }

  @Post('models')
  @UseGuards(AiTokenGuard)
  createModel(@Body() input: SaveModelConfigRequest) {
    return this.modelConfigs.create(input);
  }

  @Patch('models/:id')
  @UseGuards(AiTokenGuard)
  updateModel(@Param('id') id: string, @Body() input: SaveModelConfigRequest) {
    return this.modelConfigs.update(id, input);
  }

  @Post('models/:id/activate')
  @UseGuards(AiTokenGuard)
  activateModel(@Param('id') id: string) {
    return this.modelConfigs.activate(id);
  }

  @Post('models/:id/test')
  @UseGuards(AiTokenGuard)
  testModel(@Param('id') id: string) {
    return this.modelConfigs.test(id);
  }

  @Delete('models/:id')
  @UseGuards(AiTokenGuard)
  removeModel(@Param('id') id: string) {
    return this.modelConfigs.remove(id);
  }

  @Get('templates')
  async listTemplates() {
    return (await this.templates.list()).map(({ systemPrompt: _systemPrompt, schemaVersion: _schemaVersion, ...template }) => template);
  }

  @Post('generations')
  @UseGuards(AiTokenGuard)
  @HttpCode(202)
  create(@Body() input: CreateGenerationRequest) {
    return this.generations.create(input);
  }

  @Get('generations')
  @UseGuards(AiTokenGuard)
  list() {
    return this.generations.list();
  }

  @Get('generations/:id')
  @UseGuards(AiTokenGuard)
  get(@Param('id') id: string) {
    return this.generations.get(id);
  }

  @Post('generations/:id/cancel')
  @UseGuards(AiTokenGuard)
  cancel(@Param('id') id: string) {
    return this.generations.cancel(id);
  }

  @Post('generations/:id/sections/:key/regenerate')
  @UseGuards(AiTokenGuard)
  regenerate(
    @Param('id') id: string,
    @Param('key') key: string,
    @Body() input: RegenerateSectionRequest,
  ) {
    return this.generations.regenerateSection(id, key, input.instruction);
  }

  @Post('generations/:id/save-draft')
  @UseGuards(AiTokenGuard)
  saveDraft(@Param('id') id: string) {
    return this.generations.saveDraft(id);
  }

  @Post('generations/:id/publish')
  @UseGuards(AiTokenGuard)
  publish(@Param('id') id: string) {
    return this.generations.publish(id);
  }
}
