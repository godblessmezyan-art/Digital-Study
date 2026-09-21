import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AiModelConfigsService } from './ai-model-configs.service';
import { AiProviderService } from './ai-provider.service';
import { StudyAdminGuard } from '../auth/study-auth.guard';
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
      authRequired: true,
    };
  }

  @Get('models')
  @UseGuards(StudyAdminGuard)
  listModels() {
    return this.modelConfigs.list();
  }

  @Post('models')
  @UseGuards(StudyAdminGuard)
  createModel(@Body() input: SaveModelConfigRequest) {
    return this.modelConfigs.create(input);
  }

  @Patch('models/:id')
  @UseGuards(StudyAdminGuard)
  updateModel(@Param('id') id: string, @Body() input: SaveModelConfigRequest) {
    return this.modelConfigs.update(id, input);
  }

  @Post('models/:id/activate')
  @UseGuards(StudyAdminGuard)
  activateModel(@Param('id') id: string) {
    return this.modelConfigs.activate(id);
  }

  @Post('models/:id/test')
  @UseGuards(StudyAdminGuard)
  testModel(@Param('id') id: string) {
    return this.modelConfigs.test(id);
  }

  @Delete('models/:id')
  @UseGuards(StudyAdminGuard)
  removeModel(@Param('id') id: string) {
    return this.modelConfigs.remove(id);
  }

  @Get('templates')
  async listTemplates() {
    return (await this.templates.list()).map(({ systemPrompt: _systemPrompt, schemaVersion: _schemaVersion, ...template }) => template);
  }

  @Post('generations')
  @UseGuards(StudyAdminGuard)
  @HttpCode(202)
  create(@Body() input: CreateGenerationRequest) {
    return this.generations.create(input);
  }

  @Get('generations')
  @UseGuards(StudyAdminGuard)
  list() {
    return this.generations.list();
  }

  @Get('generations/:id')
  @UseGuards(StudyAdminGuard)
  get(@Param('id') id: string) {
    return this.generations.get(id);
  }

  @Post('generations/:id/cancel')
  @UseGuards(StudyAdminGuard)
  cancel(@Param('id') id: string) {
    return this.generations.cancel(id);
  }

  @Post('generations/:id/sections/:key/regenerate')
  @UseGuards(StudyAdminGuard)
  regenerate(
    @Param('id') id: string,
    @Param('key') key: string,
    @Body() input: RegenerateSectionRequest,
  ) {
    return this.generations.regenerateSection(id, key, input.instruction);
  }

  @Post('generations/:id/save-draft')
  @UseGuards(StudyAdminGuard)
  saveDraft(@Param('id') id: string) {
    return this.generations.saveDraft(id);
  }

  @Post('generations/:id/publish')
  @UseGuards(StudyAdminGuard)
  publish(@Param('id') id: string) {
    return this.generations.publish(id);
  }
}
