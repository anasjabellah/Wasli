import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PickupModule } from '../pickup/pickup.module.js';
import { OperationsController } from './operations.controller.js';
import { OperationsService } from './operations.service.js';

@Module({
  imports: [AuthModule, PickupModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}
