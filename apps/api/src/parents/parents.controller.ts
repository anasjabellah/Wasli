import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/current-auth.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ParentsService } from './parents.service.js';

@ApiTags('parents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('parents/me')
export class ParentsController {
  constructor(private readonly parents: ParentsService) {}

  @Get('children')
  list(@CurrentAuth() auth: AuthContext) {
    return this.parents.listChildren(auth);
  }

  @Get('children/:studentId')
  get(@CurrentAuth() auth: AuthContext, @Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.parents.getChild(auth, studentId);
  }
}
