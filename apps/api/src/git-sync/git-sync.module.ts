import { Global, Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { GitSyncService } from './git-sync.service';

@Global()
@Module({
  imports: [ContentModule],
  providers: [GitSyncService],
  exports: [GitSyncService],
})
export class GitSyncModule {}
