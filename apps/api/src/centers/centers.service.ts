import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { RegisterCenterPayload } from '@wasli/validation';
import { randomBytes } from 'node:crypto';
import type { AuthContext } from '../auth/auth.types.js';
import { PasswordService } from '../auth/password.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const REVIEWABLE = ['PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SUSPENDED'] as const;
type CenterLifecycle = (typeof REVIEWABLE)[number];

@Injectable()
export class CentersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async register(input: RegisterCenterPayload): Promise<{ centerId: string; status: 'ACTIVE' }> {
    const passwordHash = await this.passwords.hash(input.password);
    try {
      return await this.prisma.withPlatformAccess(async (tx) => {
        const emailTaken = await tx.user.findFirst({
          where: { email: input.email, deletedAt: null },
          select: { id: true },
        });
        const centerEmailTaken = await tx.center.findFirst({
          where: { email: input.centerEmail, deletedAt: null },
          select: { id: true },
        });
        if (emailTaken || centerEmailTaken) {
          throw new ConflictException({ code: 'EMAIL_IN_USE', message: 'Cet e-mail est déjà utilisé.' });
        }
        const user = await tx.user.create({
          data: {
            email: input.email,
            phone: input.phone ?? null,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
            locale: 'fr',
            status: 'ACTIVE',
          },
        });
        const center = await tx.center.create({
          data: {
            name: input.centerName,
            slug: slugFor(input.centerName),
            email: input.centerEmail,
            phone: input.centerPhone,
            city: input.city,
            addressLine: input.addressLine || null,
            status: 'ACTIVE',
          },
        });
        await tx.centerSettings.create({ data: { centerId: center.id } });
        await tx.centerMembership.create({
          data: { centerId: center.id, userId: user.id, role: 'CENTER_ADMIN', status: 'ACTIVE' },
        });
        await tx.auditLog.create({
          data: {
            centerId: center.id,
            actorUserId: user.id,
            action: 'center.registered',
            entityType: 'center',
            entityId: center.id,
            metadata: { city: input.city },
          },
        });
        return { centerId: center.id, status: 'ACTIVE' as const };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({ code: 'EMAIL_IN_USE', message: 'Cet e-mail est déjà utilisé.' });
      }
      throw error;
    }
  }

  async list(auth: AuthContext, status?: string) {
    this.assertPlatform(auth);
    const filter = this.parseStatus(status);
    const rows = await this.prisma.withPlatformAccess((tx) =>
      tx.center.findMany({
        where: { deletedAt: null, ...(filter ? { status: filter } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          name: true,
          city: true,
          status: true,
          createdAt: true,
        },
      }),
    );
    return {
      items: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    };
  }

  async get(auth: AuthContext, centerId: string) {
    this.assertPlatform(auth);
    return this.prisma.withPlatformAccess(async (tx) => {
      const center = await tx.center.findFirst({
        where: { id: centerId, deletedAt: null },
        include: {
          memberships: {
            where: { role: 'CENTER_ADMIN', deletedAt: null },
            include: { user: true },
            take: 1,
          },
        },
      });
      if (!center) {
        throw new NotFoundException({ code: 'CENTER_NOT_FOUND', message: 'Centre introuvable.' });
      }
      const admin = center.memberships[0]?.user;
      const history = await tx.auditLog.findMany({
        where: {
          entityType: 'center',
          entityId: center.id,
          action: { in: ['center.registered', 'center.approved', 'center.rejected'] },
        },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });
      return {
        id: center.id,
        name: center.name,
        city: center.city,
        email: center.email,
        phone: center.phone,
        addressLine: center.addressLine,
        status: center.status,
        rejectionReason: center.rejectionReason,
        createdAt: center.createdAt.toISOString(),
        reviewedAt: center.reviewedAt?.toISOString() ?? null,
        administrator: admin
          ? { firstName: admin.firstName, lastName: admin.lastName, email: admin.email, phone: admin.phone }
          : null,
        history: history.map((entry) => ({
          action: entry.action,
          createdAt: entry.createdAt.toISOString(),
          reason: reasonOf(entry.metadata),
        })),
      };
    });
  }

  async approve(auth: AuthContext, centerId: string): Promise<{ status: 'ACTIVE' }> {
    this.assertPlatform(auth);
    await this.review(auth, centerId, 'ACTIVE', null);
    return { status: 'ACTIVE' };
  }

  async reject(auth: AuthContext, centerId: string, reason: string): Promise<{ status: 'REJECTED' }> {
    this.assertPlatform(auth);
    await this.review(auth, centerId, 'REJECTED', reason);
    return { status: 'REJECTED' };
  }

  private async review(auth: AuthContext, centerId: string, status: 'ACTIVE' | 'REJECTED', reason: string | null): Promise<void> {
    await this.prisma.withPlatformAccess(async (tx) => {
      const center = await tx.center.findFirst({ where: { id: centerId, deletedAt: null } });
      if (!center) {
        throw new NotFoundException({ code: 'CENTER_NOT_FOUND', message: 'Centre introuvable.' });
      }
      if (center.status !== 'PENDING_APPROVAL') {
        throw new ConflictException({ code: 'CENTER_NOT_PENDING', message: 'Ce centre n’est plus en attente.' });
      }
      await tx.center.update({
        where: { id: center.id },
        data: {
          status,
          rejectionReason: reason,
          reviewedAt: new Date(),
          reviewedByUserId: auth.userId,
        },
      });
      await tx.auditLog.create({
        data: {
          centerId: center.id,
          actorUserId: auth.userId,
          action: status === 'ACTIVE' ? 'center.approved' : 'center.rejected',
          entityType: 'center',
          entityId: center.id,
          metadata: reason ? { reason } : {},
        },
      });
    });
  }

  private assertPlatform(auth: AuthContext): void {
    if (!auth.roles.includes('PLATFORM_ADMIN')) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Action non autorisée.' });
    }
  }

  private parseStatus(status?: string): CenterLifecycle | undefined {
    if (!status) return undefined;
    if ((REVIEWABLE as readonly string[]).includes(status)) return status as CenterLifecycle;
    throw new BadRequestException({ code: 'VALIDATION', message: 'Statut inconnu.' });
  }
}

function slugFor(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${base || 'centre'}-${randomBytes(3).toString('hex')}`;
}

function reasonOf(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || !('reason' in metadata)) return null;
  const reason = (metadata as { reason?: unknown }).reason;
  return typeof reason === 'string' ? reason : null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002';
}
