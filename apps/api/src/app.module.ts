import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { loadApiEnv } from '@wasli/config';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CentersModule } from './centers/centers.module.js';
import { ClassesModule } from './classes/classes.module.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { HandoverModule } from './handover/handover.module.js';
import { HealthModule } from './health/health.module.js';
import { MembershipsModule } from './memberships/memberships.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { OperationsModule } from './operations/operations.module.js';
import { ParentsModule } from './parents/parents.module.js';
import { PickupModule } from './pickup/pickup.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { QueueModule } from './queue/queue.module.js';
import { SchedulesModule } from './schedules/schedules.module.js';
import { SchedulingModule } from './scheduling/scheduling.module.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { StudentsModule } from './students/students.module.js';
import { TeachersModule } from './teachers/teachers.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: (config) => loadApiEnv(config),
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    CentersModule,
    UsersModule,
    MembershipsModule,
    StudentsModule,
    ParentsModule,
    TeachersModule,
    ClassesModule,
    SchedulesModule,
    SessionsModule,
    PickupModule,
    SchedulingModule,
    QueueModule,
    HandoverModule,
    NotificationsModule,
    OperationsModule,
    AuditModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
