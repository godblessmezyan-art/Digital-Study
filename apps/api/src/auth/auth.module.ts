import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { LegacyStudyAuthService } from './legacy-study-auth.service';
import { StudyAdminGuard, StudyAuthGuard } from './study-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [LegacyStudyAuthService, StudyAuthGuard, StudyAdminGuard],
  exports: [LegacyStudyAuthService, StudyAuthGuard, StudyAdminGuard],
})
export class AuthModule {}
