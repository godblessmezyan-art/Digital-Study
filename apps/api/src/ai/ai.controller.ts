import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AiModelConfigsService } from './ai-model-configs.service';
import { AiProviderService } from './ai-provider.service';
import { StudyAdminGuard } from '../auth/study-auth.guard';
import { CreateGenerationRequest } from './dto/create-generation.dto';
import { RegenerateSectionRequest } from './dto/regenerate-section.dto';
import { SaveModelConfigRequest } from './dto/save-model-config.dto';
import { GenerationsService } from './generations.service';
import { TemplatesService } from './templates.service';
import { CreateTemplateRequest, UpdateTemplateRequest } from './dto/update-template.dto';
import { CompleteBookMetadataRequest } from './dto/complete-book-metadata.dto';
import { PublishOptionsRequest } from '../books/dto/publish-book.dto';
import { RetryGenerationRequest } from './dto/retry-generation.dto';

type AdminRequest = Request & { user: { username: string } };

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

  @Get('templates/:id')
  @UseGuards(StudyAdminGuard)
  getTemplate(@Param('id') id: string) {
    return this.templates.get(id);
  }

  @Post('templates')
  @UseGuards(StudyAdminGuard)
  createTemplate(@Body() input: CreateTemplateRequest) {
    return this.templates.create(input);
  }

  @Patch('templates/:id')
  @UseGuards(StudyAdminGuard)
  updateTemplate(@Param('id') id: string, @Body() input: UpdateTemplateRequest) {
    return this.templates.update(id, input);
  }

  @Post('generations')
  @UseGuards(StudyAdminGuard)
  @HttpCode(202)
  create(@Body() input: CreateGenerationRequest, @Req() request: AdminRequest) {
    return this.generations.createForOwner(input, request.user.username);
  }

  @Post('book-metadata')
  @UseGuards(StudyAdminGuard)
  completeBookMetadata(@Body() input: CompleteBookMetadataRequest) {
    return this.provider.completeBookMetadata(input.title);
  }

  @Get('generations')
  @UseGuards(StudyAdminGuard)
  list(@Req() request: AdminRequest) {
    return this.generations.list(request.user.username);
  }

  @Get('generations-recovery')
  @UseGuards(StudyAdminGuard)
  recover(@Req() request: AdminRequest) {
    return this.generations.recover(request.user.username);
  }

  @Get('generations/:id')
  @UseGuards(StudyAdminGuard)
  get(@Param('id') id: string, @Req() request: AdminRequest) {
    return this.generations.get(id, request.user.username);
  }

  @Post('generations/:id/cancel')
  @UseGuards(StudyAdminGuard)
  cancel(@Param('id') id: string, @Req() request: AdminRequest) {
    return this.generations.cancel(id, request.user.username);
  }

  @Post('generations/:id/retry')
  @UseGuards(StudyAdminGuard)
  @HttpCode(202)
  retry(@Param('id') id: string, @Body() input: RetryGenerationRequest, @Req() request: AdminRequest) {
    return this.generations.retry(id, request.user.username, input.clientRequestId);
  }

  @Post('generations/:id/sections/:key/regenerate')
  @UseGuards(StudyAdminGuard)
  regenerate(
    @Param('id') id: string,
    @Param('key') key: string,
    @Body() input: RegenerateSectionRequest,
    @Req() request: AdminRequest,
  ) {
    return this.generations.regenerateSection(id, key, input.instruction, request.user.username);
  }

  @Post('generations/:id/save-draft')
  @UseGuards(StudyAdminGuard)
  saveDraft(@Param('id') id: string, @Req() request: AdminRequest) {
    return this.generations.saveDraft(id, request.user.username);
  }

  @Post('generations/:id/publish')
  @UseGuards(StudyAdminGuard)
  publish(@Param('id') id: string, @Body() input: PublishOptionsRequest, @Req() request: AdminRequest) {
    return this.generations.publish(id, Boolean(input?.syncToGit), request.user.username);
  }
}
