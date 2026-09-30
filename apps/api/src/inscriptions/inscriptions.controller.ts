import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { StudyAdminGuard, StudyAuthGuard } from '../auth/study-auth.guard';
import { INSCRIPTION_CONTEXTS, contextLabel } from './contexts';
import { ReorderCategoriesRequest, SaveInscriptionCategoryRequest, SaveInscriptionRequest } from './dto/save-inscription.dto';
import { InscriptionsService } from './inscriptions.service';

@Controller('inscriptions')
export class InscriptionsController {
  constructor(private readonly inscriptions: InscriptionsService) {}

  /** Business pages consume resources by usage context (lightweight payload). */
  @Get('available')
  @UseGuards(StudyAuthGuard)
  available(@Query('context') context: string) {
    return this.inscriptions.available(context || '');
  }

  @Get('contexts')
  @UseGuards(StudyAuthGuard)
  contexts() {
    return INSCRIPTION_CONTEXTS.map((context) => ({ ...context, label: contextLabel(context.key) }));
  }

  @Get('categories')
  @UseGuards(StudyAuthGuard)
  listCategories() {
    return this.inscriptions.listCategories();
  }

  @Post('categories')
  @UseGuards(StudyAdminGuard)
  createCategory(@Body() input: SaveInscriptionCategoryRequest) {
    return this.inscriptions.createCategory(input);
  }

  @Post('categories/reorder')
  @UseGuards(StudyAdminGuard)
  reorderCategories(@Body() input: ReorderCategoriesRequest) {
    return this.inscriptions.reorderCategories(input.items);
  }

  @Put('categories/:id')
  @UseGuards(StudyAdminGuard)
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body() input: SaveInscriptionCategoryRequest) {
    return this.inscriptions.updateCategory(id, input);
  }

  @Delete('categories/:id')
  @UseGuards(StudyAdminGuard)
  removeCategory(@Param('id', ParseIntPipe) id: number) {
    return this.inscriptions.removeCategory(id);
  }

  @Get()
  @UseGuards(StudyAdminGuard)
  list(
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('context') context?: string,
    @Query('enabled') enabled?: string,
    @Query('sort') sort?: string,
  ) {
    return this.inscriptions.list({ q, type, categoryId, context, enabled, sort });
  }

  @Post()
  @UseGuards(StudyAdminGuard)
  create(@Body() input: SaveInscriptionRequest) {
    return this.inscriptions.create(input);
  }

  @Get(':id')
  @UseGuards(StudyAdminGuard)
  get(@Param('id') id: string) {
    return this.inscriptions.get(id);
  }

  @Put(':id')
  @UseGuards(StudyAdminGuard)
  update(@Param('id') id: string, @Body() input: SaveInscriptionRequest) {
    return this.inscriptions.update(id, input);
  }

  @Post(':id/duplicate')
  @UseGuards(StudyAdminGuard)
  duplicate(@Param('id') id: string) {
    return this.inscriptions.duplicate(id);
  }

  @Post(':id/enabled')
  @UseGuards(StudyAdminGuard)
  setEnabled(@Param('id') id: string, @Body('enabled') enabled: boolean) {
    return this.inscriptions.setEnabled(id, Boolean(enabled));
  }

  @Delete(':id')
  @UseGuards(StudyAdminGuard)
  remove(@Param('id') id: string) {
    return this.inscriptions.remove(id);
  }

  @Get(':id/versions')
  @UseGuards(StudyAdminGuard)
  async versions(@Param('id') id: string) {
    const inscription = await this.inscriptions.get(id);
    return inscription.versions;
  }
}
