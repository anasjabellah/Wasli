import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { RegisterCenterPayload, RejectCenterPayload } from '@wasli/validation';
import { registerCenterSchema, rejectCenterSchema } from '@wasli/validation';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/current-auth.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ZodBodyPipe } from '../common/zod-body.pipe.js';
import { CentersService } from './centers.service.js';

@ApiTags('centers')
@Controller('centers')
export class CenterRegistrationController {
  constructor(private readonly centers: CentersService) {}

  @Post('registrations')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  register(@Body(new ZodBodyPipe(registerCenterSchema)) body: RegisterCenterPayload) {
    return this.centers.register(body);
  }
}

@ApiTags('platform-centers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('platform/centers')
export class PlatformCentersController {
  constructor(private readonly centers: CentersService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext, @Query('status') status?: string) {
    return this.centers.list(auth, status);
  }

  @Get(':id')
  get(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.centers.get(auth, id);
  }

  @Post(':id/approve')
  approve(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.centers.approve(auth, id);
  }

  @Post(':id/reject')
  reject(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodBodyPipe(rejectCenterSchema)) body: RejectCenterPayload,
  ) {
    return this.centers.reject(auth, id, body.reason);
  }
}
