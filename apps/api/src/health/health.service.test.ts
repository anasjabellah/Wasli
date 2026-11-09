import { describe, expect, it } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { assertHealthy, HealthService, type HealthReport } from './health.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function service(ping: () => Promise<void>): HealthService {
  return new HealthService({ ping } as PrismaService);
}

describe('HealthService', () => {
  it('reports the database as up when PostgreSQL answers', async () => {
    const report = await service(async () => undefined).check();
    expect(report).toMatchObject({ status: 'ok', database: 'up', service: 'wasli-api' });
  });

  it('reports the database as down without throwing from the probe', async () => {
    const report = await service(async () => {
      throw new Error('connection refused');
    }).check();
    expect(report.database).toBe('down');
  });

  it('turns a down report into an HTTP 503', () => {
    const report: HealthReport = {
      status: 'error',
      service: 'wasli-api',
      database: 'down',
      timestamp: new Date(0).toISOString(),
    };
    expect(() => assertHealthy(report)).toThrow(ServiceUnavailableException);
  });
});
