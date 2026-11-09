import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { LoginPayload, RefreshSessionPayload } from '@wasli/validation';
import { loginSchema, logoutSchema, refreshSessionSchema } from '@wasli/validation';
import type { Request } from 'express';
import { ZodBodyPipe } from '../common/zod-body.pipe.js';
import { AuthService } from './auth.service.js';
import { toProfile } from './auth.types.js';
import { CurrentAuth } from './current-auth.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { AuthContext } from './auth.types.js';

function requestMeta(request: Request): { userAgent?: string; ip?: string } {
  return {
    userAgent: request.header('user-agent') ?? undefined,
    ip: request.ip,
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  login(@Body(new ZodBodyPipe(loginSchema)) body: LoginPayload, @Req() request: Request) {
    return this.auth.login(body.identifier, body.password, requestMeta(request));
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(new ZodBodyPipe(refreshSessionSchema)) body: RefreshSessionPayload, @Req() request: Request) {
    return this.auth.refresh(body.refreshToken, requestMeta(request));
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body(new ZodBodyPipe(logoutSchema)) body: RefreshSessionPayload): Promise<void> {
    await this.auth.logout(body.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentAuth() auth: AuthContext) {
    return { user: toProfile(auth) };
  }
}
