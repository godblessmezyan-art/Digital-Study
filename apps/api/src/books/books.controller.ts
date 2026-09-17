import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
  create(@Body() input: CreateBookRequest) {
    return this.booksService.create(input);
  }

  @Post('drafts')
  saveDraft(@Body() input: CreateBookRequest) {
    return this.booksService.saveDraft(input);
  }
}
