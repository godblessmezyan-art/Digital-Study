import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { BooksModule } from './books/books.module';
import { CategoriesModule } from './categories/categories.module';
import { WORKSPACE_ROOT } from './config/paths';
import { AiModule } from './ai/ai.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GitSyncModule } from './git-sync/git-sync.module';
import { ReadingModule } from './reading/reading.module';
import { JournalModule } from './journal/journal.module';
import { ChroniclesModule } from './chronicles/chronicles.module';
import { ReadingAiModule } from './reading-ai/reading-ai.module';
import { CuratorModule } from './curator/curator.module';
import { PlansModule } from './plans/plans.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(WORKSPACE_ROOT, '.env'), join(process.cwd(), '.env')],
    }),
    PrismaModule,
    GitSyncModule,
    AuthModule,
    AiModule,
    BooksModule,
    CategoriesModule,
    ReadingModule,
    JournalModule,
    ChroniclesModule,
    ReadingAiModule,
    CuratorModule,
    PlansModule,
  ],
})
export class AppModule {}
