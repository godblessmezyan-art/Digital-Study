import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { StudyAdminGuard } from '../auth/study-auth.guard';
import { CategoriesService } from './categories.service';
import { SaveCategoryRequest } from './dto/save-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Post()
  @UseGuards(StudyAdminGuard)
  create(@Body() input: SaveCategoryRequest) { return this.categoriesService.create(input); }

  @Patch(':slug')
  @UseGuards(StudyAdminGuard)
  update(@Param('slug') slug: string, @Body() input: SaveCategoryRequest) { return this.categoriesService.update(slug, input); }

  @Delete(':slug')
  @UseGuards(StudyAdminGuard)
  remove(@Param('slug') slug: string) { return this.categoriesService.remove(slug); }
}
