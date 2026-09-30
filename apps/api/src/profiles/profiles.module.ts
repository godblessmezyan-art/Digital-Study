import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AvatarStoreService } from './avatar-store.service';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [AuthModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, AvatarStoreService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
