import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SemanticModule } from '../semantic/semantic.module';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';
import { JournalTemplatesController } from './journal-templates.controller';
import { JournalTemplatesService } from './journal-templates.service';

@Module({
  imports: [AuthModule, SemanticModule],
  // Templates controller must stay first so /journal/templates is not captured by /journal/:id.
  controllers: [JournalTemplatesController, JournalController],
  providers: [JournalService, JournalTemplatesService],
})
export class JournalModule {}
