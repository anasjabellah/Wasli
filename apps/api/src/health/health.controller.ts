import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { assertHealthy, HealthService } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @SkipThrottle()
  @ApiOkResponse({ description: 'API and PostgreSQL are reachable' })
  @ApiServiceUnavailableResponse({ description: 'PostgreSQL is not reachable' })
  async get() {
    return assertHealthy(await this.health.check());
  }
}
