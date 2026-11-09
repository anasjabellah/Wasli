import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export type HealthReport = {
  status: 'ok' | 'error';
  service: 'wasli-api';
  database: 'up' | 'down';
  timestamp: string;
};

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthReport> {
    const timestamp = new Date().toISOString();
    try {
      await this.prisma.ping();
      return { status: 'ok', service: 'wasli-api', database: 'up', timestamp };
    } catch {
      return { status: 'error', service: 'wasli-api', database: 'down', timestamp };
    }
  }
}

export function assertHealthy(report: HealthReport): HealthReport {
  if (report.status !== 'ok') {
    throw new ServiceUnavailableException(report);
  }
  return report;
}
