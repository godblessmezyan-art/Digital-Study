import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContentModule } from '../content/content.module';
import { AdminBooksController, BooksController, ShelfController } from './books.controller';
import { BooksService } from './books.service';
import { SemanticModule } from '../semantic/semantic.module';

@Module({
  imports: [ContentModule, AuthModule, SemanticModule],
  controllers: [BooksController, AdminBooksController, ShelfController],
  providers: [BooksService],
})
export class BooksModule {}
