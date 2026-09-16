import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { BooksModule } from './books/books.module';
import { CategoriesModule } from './categories/categories.module';
import { WORKSPACE_ROOT } from './config/paths';
import { AiModule } from './ai/ai.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(WORKSPACE_ROOT, '.env'), join(process.cwd(), '.env')],
    }),
    PrismaModule,
    AiModule,
    BooksModule,
    CategoriesModule,
  ],
})
export class AppModule {}
