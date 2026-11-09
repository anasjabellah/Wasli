import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ParentsController } from './parents.controller.js';
import { ParentsService } from './parents.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ParentsController],
  providers: [ParentsService],
})
export class ParentsModule {}
