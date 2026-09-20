import { Module } from '@nestjs/common';
import { AiTokenGuard } from '../ai/ai-token.guard';
import { ContentModule } from '../content/content.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
  imports: [ContentModule],
  controllers: [BooksController],
  providers: [BooksService, AiTokenGuard],
})
export class BooksModule {}
