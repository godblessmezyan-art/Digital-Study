import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { AiPlanService } from './ai-plan.service';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

@Module({
  imports: [AuthModule, AiModule],
  controllers: [PlansController],
  providers: [PlansService, AiPlanService],
})
export class PlansModule {}
