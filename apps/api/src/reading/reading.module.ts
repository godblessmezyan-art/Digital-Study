import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReadingController } from './reading.controller';
import { ReadingService } from './reading.service';
import { SemanticModule } from '../semantic/semantic.module';

@Module({
  imports: [AuthModule, SemanticModule],
  controllers: [ReadingController],
  providers: [ReadingService],
})
export class ReadingModule {}
