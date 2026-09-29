import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChroniclesController } from './chronicles.controller';
import { ChroniclesService } from './chronicles.service';

@Module({
  imports: [AuthModule],
  controllers: [ChroniclesController],
  providers: [ChroniclesService],
  exports: [ChroniclesService],
})
export class ChroniclesModule {}
