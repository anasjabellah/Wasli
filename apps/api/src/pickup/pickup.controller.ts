import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type {
  CancelPickupRequestPayload,
  CreatePickupRequestPayload,
  DelayPickupPayload,
  RejectPickupRequestPayload,
  VerifyHandoverPayload,
} from '@wasli/validation';
import {
  cancelPickupRequestSchema,
  createPickupRequestSchema,
  delayPickupSchema,
  rejectPickupRequestSchema,
  verifyHandoverSchema,
} from '@wasli/validation';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/current-auth.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { NoStoreInterceptor } from '../common/no-store.interceptor.js';
import { ZodBodyPipe } from '../common/zod-body.pipe.js';
import { PickupService } from './pickup.service.js';

@ApiTags('pickup-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(NoStoreInterceptor)
@Controller('pickup-requests')
export class PickupController {
  constructor(private readonly pickup: PickupService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.pickup.listForParent(auth);
  }

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodBodyPipe(createPickupRequestSchema)) body: CreatePickupRequestPayload,
  ) {
    return this.pickup.createForParent(auth, body.studentId);
  }

  @Get(':id')
  get(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.pickup.getForParent(auth, id);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodBodyPipe(cancelPickupRequestSchema)) body: CancelPickupRequestPayload,
  ) {
    return this.pickup.cancelForParent(auth, id, body.reason);
  }

  @Post(':id/prepare')
  prepare(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.pickup.prepareForStaff(auth, id);
  }

  @Post(':id/ready')
  ready(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.pickup.readyForStaff(auth, id);
  }

  @Post(':id/delay')
  delay(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodBodyPipe(delayPickupSchema)) body: DelayPickupPayload,
  ) {
    return this.pickup.delayForStaff(auth, id, body.reason);
  }

  @Post(':id/verify-handover')
  verify(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodBodyPipe(verifyHandoverSchema)) body: VerifyHandoverPayload,
  ) {
    return this.pickup.verifyHandover(auth, id, body.pin);
  }

  @Post(':id/reject')
  reject(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodBodyPipe(rejectPickupRequestSchema)) body: RejectPickupRequestPayload,
  ) {
    return this.pickup.rejectForStaff(auth, id, body.reason);
  }
}
