import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PickupController } from './pickup.controller.js';
import { PickupService } from './pickup.service.js';
import { PickupTransitionService } from './pickup-transition.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PickupController],
  providers: [PickupService, PickupTransitionService],
  exports: [PickupTransitionService, PickupService],
})
export class PickupModule {}
