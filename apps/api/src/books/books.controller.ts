import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { StudyAdminGuard } from '../auth/study-auth.guard';
import { BooksService } from './books.service';
import { CreateBookRequest } from './dto/create-book.dto';
import { DeleteBookRequest, PublishBookRequest, PublishOptionsRequest } from './dto/publish-book.dto';

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
  create(@Body() input: PublishBookRequest) {
    return this.booksService.create(input);
  }

  @Post('drafts')
  @UseGuards(StudyAdminGuard)
  saveDraft(@Body() input: CreateBookRequest) {
    return this.booksService.saveDraft(input);
  }
}

@Controller('admin/books')
@UseGuards(StudyAdminGuard)
export class AdminBooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  findAll() { return this.booksService.findAllAdmin(); }

  @Post(':slug/publish')
  publish(@Param('slug') slug: string, @Body() input: PublishOptionsRequest) {
    return this.booksService.publish(slug, Boolean(input.syncToGit));
  }

  @Post(':slug/git-sync')
  syncGit(@Param('slug') slug: string) { return this.booksService.syncGit(slug); }

  @Delete(':slug')
  remove(@Param('slug') slug: string, @Body() input: DeleteBookRequest) {
    return this.booksService.remove(slug, Boolean(input?.deleteFromGit));
  }
}
