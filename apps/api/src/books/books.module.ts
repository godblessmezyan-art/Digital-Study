import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
  imports: [ContentModule],
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
