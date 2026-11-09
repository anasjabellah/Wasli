import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/current-auth.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { OperationsService } from './operations.service.js';

@ApiTags('operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operations')
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Get('overview')
  overview(@CurrentAuth() auth: AuthContext) {
    return this.operations.overview(auth);
  }

  @Get('queue')
  queue(@CurrentAuth() auth: AuthContext, @Query('q') query?: string) {
    return this.operations.queue(auth, query);
  }

  @Get('students')
  students(@CurrentAuth() auth: AuthContext, @Query('q') query?: string) {
    return this.operations.students(auth, query);
  }

  @Get('classes')
  classes(@CurrentAuth() auth: AuthContext) {
    return this.operations.classes(auth);
  }

  @Get('schedules')
  schedules(@CurrentAuth() auth: AuthContext) {
    return this.operations.schedules(auth);
  }

  @Get('teachers')
  teachers(@CurrentAuth() auth: AuthContext) {
    return this.operations.teachers(auth);
  }

  @Get('parents')
  parents(@CurrentAuth() auth: AuthContext) {
    return this.operations.parents(auth);
  }
}
