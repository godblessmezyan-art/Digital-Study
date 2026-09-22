import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContentModule } from '../content/content.module';
import { AdminBooksController, BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
  imports: [ContentModule, AuthModule],
  controllers: [BooksController, AdminBooksController],
  providers: [BooksService],
})
export class BooksModule {}
