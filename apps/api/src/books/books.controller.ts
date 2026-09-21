import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { StudyAdminGuard } from '../auth/study-auth.guard';
import { BooksService } from './books.service';
import { CreateBookRequest } from './dto/create-book.dto';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  findAll() {
    return this.booksService.findAll();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.booksService.findOne(slug);
  }

  @Post()
  @UseGuards(StudyAdminGuard)
  create(@Body() input: CreateBookRequest) {
    return this.booksService.create(input);
  }

  @Post('drafts')
  @UseGuards(StudyAdminGuard)
  saveDraft(@Body() input: CreateBookRequest) {
    return this.booksService.saveDraft(input);
  }
}
