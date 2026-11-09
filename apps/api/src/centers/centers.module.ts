import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CenterRegistrationController, PlatformCentersController } from './centers.controller.js';
import { CentersService } from './centers.service.js';

@Module({
  imports: [AuthModule],
  controllers: [CenterRegistrationController, PlatformCentersController],
  providers: [CentersService],
})
export class CentersModule {}
