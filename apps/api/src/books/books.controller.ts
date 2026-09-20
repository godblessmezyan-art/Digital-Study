import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AiTokenGuard } from '../ai/ai-token.guard';
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
  @UseGuards(AiTokenGuard)
  create(@Body() input: CreateBookRequest) {
    return this.booksService.create(input);
  }

  @Post('drafts')
  @UseGuards(AiTokenGuard)
  saveDraft(@Body() input: CreateBookRequest) {
    return this.booksService.saveDraft(input);
  }
}
