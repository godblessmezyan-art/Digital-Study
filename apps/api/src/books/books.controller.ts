import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { StudyAdminGuard, StudyAuthGuard } from '../auth/study-auth.guard';
import { BooksService } from './books.service';
import { CreateBookRequest } from './dto/create-book.dto';
import { DeleteBookRequest, PublishBookRequest, PublishOptionsRequest } from './dto/publish-book.dto';
import { UpdateShelfBookRequest } from './dto/update-shelf-book.dto';

type UserRequest = Request & { user: { username: string } };

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
  create(@Body() input: PublishBookRequest, @Req() request: UserRequest) {
    return this.booksService.create(input, request.user.username);
  }

  @Post('drafts')
  @UseGuards(StudyAdminGuard)
  saveDraft(@Body() input: CreateBookRequest, @Req() request: UserRequest) {
    return this.booksService.saveDraft(input, request.user.username);
  }
}

@Controller('admin/books')
@UseGuards(StudyAdminGuard)
export class AdminBooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  findAll() { return this.booksService.findAllAdmin(); }

  @Post(':slug/publish')
  publish(@Param('slug') slug: string, @Body() input: PublishOptionsRequest, @Req() request: UserRequest) {
    return this.booksService.publish(slug, Boolean(input.syncToGit), request.user.username);
  }

  @Post(':slug/git-sync')
  syncGit(@Param('slug') slug: string) { return this.booksService.syncGit(slug); }

  @Delete(':slug')
  remove(@Param('slug') slug: string, @Body() input: DeleteBookRequest) {
    return this.booksService.remove(slug, Boolean(input?.deleteFromGit));
  }
}

@Controller('shelf')
@UseGuards(StudyAuthGuard)
export class ShelfController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  list(@Req() request: UserRequest) {
    return this.booksService.listShelf(request.user.username);
  }

  @Post(':slug')
  add(@Param('slug') slug: string, @Req() request: UserRequest) {
    return this.booksService.addToShelf(slug, request.user.username);
  }

  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() input: UpdateShelfBookRequest, @Req() request: UserRequest) {
    return this.booksService.updateShelf(slug, request.user.username, input);
  }

  @Delete(':slug')
  remove(@Param('slug') slug: string, @Req() request: UserRequest) {
    return this.booksService.removeFromShelf(slug, request.user.username);
  }
}
