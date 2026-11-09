import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ACTIVE_PICKUP_STATUSES, type ParentChild } from '@wasli/shared';
import type { AuthContext } from '../auth/auth.types.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const childInclude = {
  student: {
    include: {
      classEnrollments: {
        where: { deletedAt: null, class: { deletedAt: null, status: 'ACTIVE' as const } },
        include: { class: true },
      },
      pickupRequests: {
        where: { deletedAt: null, status: { in: [...ACTIVE_PICKUP_STATUSES] } },
        orderBy: { requestedAt: 'desc' as const },
        take: 1,
      },
    },
  },
  center: true,
};

@Injectable()
export class ParentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listChildren(auth: AuthContext): Promise<{ children: ParentChild[] }> {
    const children: ParentChild[] = [];
    for (const centerId of this.parentCenterIds(auth)) {
      const links = await this.prisma.withTenant(
        centerId,
        (tx) =>
          tx.parentStudent.findMany({
            where: {
              parentUserId: auth.userId,
              deletedAt: null,
              student: { deletedAt: null, status: 'ACTIVE' },
            },
            include: childInclude,
          }),
        auth.userId,
      );
      children.push(...links.map((link) => this.toChild(link)));
    }
    children.sort((left, right) => left.firstName.localeCompare(right.firstName));
    return { children };
  }

  async getChild(auth: AuthContext, studentId: string): Promise<{ child: ParentChild }> {
    for (const centerId of this.parentCenterIds(auth)) {
      const link = await this.prisma.withTenant(
        centerId,
        (tx) =>
          tx.parentStudent.findFirst({
            where: {
              parentUserId: auth.userId,
              studentId,
              deletedAt: null,
              student: { deletedAt: null, status: 'ACTIVE' },
            },
            include: childInclude,
          }),
        auth.userId,
      );
      if (link) {
        return { child: this.toChild(link) };
      }
    }
    throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Élève introuvable.' });
  }

  private parentCenterIds(auth: AuthContext): string[] {
    const centers = [
      ...new Set(auth.centers.filter((center) => center.role === 'PARENT').map((center) => center.centerId)),
    ];
    if (centers.length === 0) {
      throw new ForbiddenException({ code: 'NOT_A_PARENT', message: 'Ce compte n’est pas un compte parent.' });
    }
    return centers;
  }

  private toChild(link: Prisma.ParentStudentGetPayload<{ include: typeof childInclude }>): ParentChild {
    const active = link.student.pickupRequests[0];
    const classNames = link.student.classEnrollments.map((enrollment) => enrollment.class.name);
    return {
      id: link.student.id,
      firstName: link.student.firstName,
      lastName: link.student.lastName,
      relationship: link.relationship,
      className: classNames.length > 0 ? classNames.join(', ') : null,
      center: {
        id: link.center.id,
        name: link.center.name,
        city: link.center.city,
        addressLine: link.center.addressLine,
        timezone: link.center.timezone,
      },
      activePickup: active
        ? {
            id: active.id,
            status: active.status,
            requestedAt: active.requestedAt.toISOString(),
            expiresAt: active.expiresAt?.toISOString() ?? null,
          }
        : null,
    };
  }
}
