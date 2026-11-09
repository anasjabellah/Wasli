import { ForbiddenException, Injectable } from '@nestjs/common';
import { ACTIVE_PICKUP_STATUSES, PICKUP_STATUSES } from '@wasli/shared';
import type { AuthContext } from '../auth/auth.types.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PickupService } from '../pickup/pickup.service.js';

const ACTIVE = new Set<string>(ACTIVE_PICKUP_STATUSES);

@Injectable()
export class OperationsService {
  constructor(
    private readonly pickup: PickupService,
    private readonly prisma: PrismaService,
  ) {}

  async overview(auth: AuthContext) {
    const { requests } = await this.pickup.listForStaff(auth);
    const counts = Object.fromEntries(PICKUP_STATUSES.map((status) => [status, 0])) as Record<string, number>;
    for (const request of requests) {
      counts[request.status] = (counts[request.status] ?? 0) + 1;
    }
    const active = requests.filter((request) => ACTIVE.has(request.status));
    const recent = [...requests].sort((left, right) => right.requestedAt.localeCompare(left.requestedAt)).slice(0, 8);
    return { counts, active: active.slice(0, 8), recent };
  }

  async queue(auth: AuthContext, query?: string) {
    const { requests } = await this.pickup.listForStaff(auth);
    const needle = query?.trim().toLowerCase() ?? '';
    if (!needle) {
      return { requests };
    }
    return {
      requests: requests.filter((request) =>
        `${request.studentName} ${request.className ?? ''} ${request.parentName} ${request.status}`
          .toLowerCase()
          .includes(needle),
      ),
    };
  }

  async students(auth: AuthContext, query?: string) {
    return this.collect(auth, ['CENTER_ADMIN', 'RECEPTION', 'TEACHER'], async (centerId, tx, broad) => {
      const classIds = broad
        ? null
        : (
            await tx.classTeacher.findMany({
              where: { teacherUserId: auth.userId, deletedAt: null },
              select: { classId: true },
            })
          ).map((row) => row.classId);
      const rows = await tx.student.findMany({
        where: {
          deletedAt: null,
          ...(classIds
            ? { classEnrollments: { some: { deletedAt: null, classId: { in: classIds } } } }
            : {}),
          ...(query ? { OR: [{ firstName: { contains: query, mode: 'insensitive' } }, { lastName: { contains: query, mode: 'insensitive' } }] } : {}),
        },
        include: {
          classEnrollments: { where: { deletedAt: null }, include: { class: true } },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 100,
      });
      return rows.map((student) => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        status: student.status,
        classes: student.classEnrollments.map((enrollment) => enrollment.class.name),
      }));
    });
  }

  async classes(auth: AuthContext) {
    return this.collect(auth, ['CENTER_ADMIN', 'RECEPTION', 'TEACHER'], async (centerId, tx, broad) => {
      const rows = await tx.class.findMany({
        where: {
          deletedAt: null,
          ...(broad ? {} : { teachers: { some: { teacherUserId: auth.userId, deletedAt: null } } }),
        },
        include: { enrollments: { where: { deletedAt: null } }, teachers: { where: { deletedAt: null } } },
        orderBy: { name: 'asc' },
        take: 100,
      });
      return rows.map((course) => ({
        id: course.id,
        name: course.name,
        subject: course.subject,
        room: course.room,
        status: course.status,
        students: course.enrollments.length,
        teachers: course.teachers.length,
      }));
    });
  }

  async schedules(auth: AuthContext) {
    return this.collect(auth, ['CENTER_ADMIN', 'RECEPTION', 'TEACHER'], async (_centerId, tx, broad) => {
      const rows = await tx.classSchedule.findMany({
        where: {
          deletedAt: null,
          ...(broad ? {} : { class: { teachers: { some: { teacherUserId: auth.userId, deletedAt: null } } } }),
        },
        include: { class: true },
        orderBy: { weekday: 'asc' },
        take: 100,
      });
      return rows.map((schedule) => ({
        id: schedule.id,
        className: schedule.class.name,
        weekday: schedule.weekday,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      }));
    });
  }

  async teachers(auth: AuthContext) {
    return this.collect(auth, ['CENTER_ADMIN'], async (_centerId, tx) => {
      const rows = await tx.centerMembership.findMany({
        where: { deletedAt: null, status: 'ACTIVE', role: 'TEACHER' },
        include: { user: true },
        take: 100,
      });
      return rows.map((membership) => ({
        id: membership.user.id,
        firstName: membership.user.firstName,
        lastName: membership.user.lastName,
        email: membership.user.email,
      }));
    });
  }

  async parents(auth: AuthContext) {
    return this.collect(auth, ['CENTER_ADMIN'], async (_centerId, tx) => {
      const rows = await tx.parentStudent.findMany({
        where: { deletedAt: null },
        include: { parent: true, student: true },
        take: 100,
      });
      return rows.map((link) => ({
        id: link.id,
        parentName: `${link.parent.firstName} ${link.parent.lastName}`,
        email: link.parent.email,
        phone: link.parent.phone,
        studentName: `${link.student.firstName} ${link.student.lastName}`,
        relationship: link.relationship,
        canRequestPickup: link.canRequestPickup,
      }));
    });
  }

  private async collect<T>(
    auth: AuthContext,
    roles: Array<'CENTER_ADMIN' | 'RECEPTION' | 'TEACHER'>,
    read: (
      centerId: string,
      tx: Prisma.TransactionClient,
      broad: boolean,
    ) => Promise<T[]>,
  ): Promise<{ items: T[] }> {
    const centers = [
      ...new Set(auth.centers.filter((center) => roles.includes(center.role as (typeof roles)[number])).map((center) => center.centerId)),
    ];
    if (centers.length === 0) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Action non autorisée.' });
    }
    const items: T[] = [];
    for (const centerId of centers) {
      const broad = auth.centers.some(
        (center) => center.centerId === centerId && (center.role === 'CENTER_ADMIN' || center.role === 'RECEPTION'),
      );
      const rows = await this.prisma.withTenant(centerId, (tx) => read(centerId, tx, broad), auth.userId);
      items.push(...rows);
    }
    return { items };
  }
}
