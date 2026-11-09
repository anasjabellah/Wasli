import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { createPrismaClient } from './prisma-client.js';
import { applyPlatformScope, applyTenantScope } from './tenant-scope.js';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: PrismaClient;

  constructor(config: ConfigService) {
    const connectionString = config.get<string>('APP_DATABASE_URL') ?? config.getOrThrow<string>('DATABASE_URL');
    this.client = createPrismaClient(connectionString);
  }

  async ping(): Promise<void> {
    await this.client.$queryRaw`SELECT 1`;
  }

  async withTenant<T>(
    centerId: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    userId?: string,
  ): Promise<T> {
    return this.client.$transaction(async (tx) => {
      await applyTenantScope(tx, centerId, userId);
      return fn(tx);
    });
  }

  async withPlatformAccess<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.client.$transaction(async (tx) => {
      await applyPlatformScope(tx);
      return fn(tx);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
