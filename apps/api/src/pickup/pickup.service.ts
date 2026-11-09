import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ACTIVE_PICKUP_STATUSES,
  parentCopy,
  PickupTransitionError,
  type ParentPickup,
  type StaffPickup,
  type PickupStatus,
  type TransitionActor,
} from '@wasli/shared';
import { Prisma, type Prisma as PrismaTypes } from '../generated/prisma/client.js';
import { PasswordService } from '../auth/password.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PickupTransitionService } from './pickup-transition.service.js';
import { decryptPin, encryptPin, generatePin, pinKey } from './pin-cipher.js';

const requestInclude = {
  student: true,
  center: true,
  classSession: { include: { class: true } },
  verification: true,
} satisfies PrismaTypes.PickupRequestInclude;

type LoadedPickup = PrismaTypes.PickupRequestGetPayload<{ include: typeof requestInclude }>;

const ACTIVE = [...ACTIVE_PICKUP_STATUSES];

@Injectable()
export class PickupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transitions: PickupTransitionService,
    private readonly passwords: PasswordService,
    private readonly config: ConfigService,
  ) {}

  async listForParent(auth: AuthContext): Promise<{ requests: ParentPickup[] }> {
    const centers = this.parentCenterIds(auth);
    const requests: ParentPickup[] = [];
    for (const centerId of centers) {
      const rows = await this.prisma.withTenant(
        centerId,
        async (tx) => {
          const links = await tx.parentStudent.findMany({
            where: { parentUserId: auth.userId, deletedAt: null },
            select: { studentId: true },
          });
          const studentIds = links.map((link) => link.studentId);
          if (studentIds.length === 0) {
            return [];
          }
          const found = await tx.pickupRequest.findMany({
            where: { deletedAt: null, studentId: { in: studentIds } },
            include: requestInclude,
            orderBy: { requestedAt: 'desc' },
            take: 50,
          });
          const synced: LoadedPickup[] = [];
          for (const request of found) {
            synced.push(await this.syncSchedule(tx, request, auth));
          }
          return synced;
        },
        auth.userId,
      );
      requests.push(...rows.map((request) => this.toParentPickup(request, auth, false)));
    }
    requests.sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
    return { requests };
  }

  async getForParent(auth: AuthContext, requestId: string): Promise<{ request: ParentPickup }> {
    const request = await this.readParentRequest(auth, requestId);
    return { request: this.toParentPickup(request, auth, true) };
  }

  async createForParent(auth: AuthContext, studentId: string): Promise<{ request: ParentPickup }> {
    const link = await this.requireLink(auth, studentId);
    try {
      const created = await this.prisma.withTenant(
        link.centerId,
        async (tx) => {
          const now = new Date();
          const session = await tx.classSession.findFirst({
            where: {
              deletedAt: null,
              status: { in: ['SCHEDULED', 'IN_PROGRESS', 'DELAYED'] },
              startsAt: { lte: now },
              class: {
                deletedAt: null,
                status: 'ACTIVE',
                enrollments: { some: { studentId, deletedAt: null } },
              },
              OR: [{ actualEndAt: null, scheduledEndAt: { gt: now } }, { actualEndAt: { gt: now } }],
            },
            orderBy: { scheduledEndAt: 'asc' },
          });
          if (!session) {
            throw new ConflictException({
              code: 'NO_ACTIVE_SESSION',
              message: 'Aucune séance en cours pour cet élève.',
            });
          }

          const existing = await tx.pickupRequest.findFirst({
            where: {
              studentId,
              classSessionId: session.id,
              deletedAt: null,
              status: { in: ACTIVE },
            },
          });
          if (existing) {
            throw new ConflictException({
              code: 'DUPLICATE_PICKUP',
              message: 'Une demande de récupération est déjà en cours.',
              requestId: existing.id,
            });
          }

          const settings = await tx.centerSettings.findUnique({ where: { centerId: link.centerId } });
          const leadMinutes = settings?.pickupLeadMinutes ?? 15;
          const expiryMinutes = settings?.requestExpiryMinutes ?? 120;
          const eligibleAt = new Date(session.scheduledEndAt.getTime() - leadMinutes * 60_000);
          const target: PickupStatus = now >= eligibleAt ? 'NOTIFIED' : 'SCHEDULED';
          this.assertTransition('PENDING', target, 'SYSTEM');

          const createdRequest = await tx.pickupRequest.create({
            data: {
              centerId: link.centerId,
              studentId,
              classSessionId: session.id,
              requestedById: auth.userId,
              status: 'PENDING',
              eligibleAt,
              expiresAt: new Date(now.getTime() + expiryMinutes * 60_000),
              priorityScore: priorityScore(settings?.priorityWeights),
            },
          });
          await this.recordEvent(tx, createdRequest, null, 'PENDING', 'CREATED', auth.userId);
          const moved = await tx.pickupRequest.update({
            where: { id: createdRequest.id },
            data: {
              status: target,
              notifiedAt: target === 'NOTIFIED' ? now : null,
            },
            include: requestInclude,
          });
          await this.recordEvent(tx, moved, 'PENDING', target, target, auth.userId);
          await this.notify(tx, moved, auth, target);
          await tx.auditLog.create({
            data: {
              centerId: link.centerId,
              actorUserId: auth.userId,
              action: 'pickup.created',
              entityType: 'pickup_request',
              entityId: moved.id,
              metadata: { status: target },
            },
          });
          return moved;
        },
        auth.userId,
      );
      return { request: this.toParentPickup(created, auth, false) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: 'DUPLICATE_PICKUP',
          message: 'Une demande de récupération est déjà en cours.',
        });
      }
      throw error;
    }
  }

  async cancelForParent(auth: AuthContext, requestId: string, reason?: string): Promise<{ request: ParentPickup }> {
    const current = await this.readParentRequest(auth, requestId);
    if (current.requestedById !== auth.userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Action non autorisée.' });
    }
    if (!(ACTIVE as string[]).includes(current.status)) {
      throw new ConflictException({
        code: 'PICKUP_NOT_CANCELLABLE',
        message: 'Cette demande ne peut plus être annulée.',
      });
    }
    const updated = await this.prisma.withTenant(
      current.centerId,
      async (tx) => {
        const fresh = await tx.pickupRequest.findFirst({
          where: { id: requestId, deletedAt: null },
          include: requestInclude,
        });
        if (!fresh || !(ACTIVE as string[]).includes(fresh.status)) {
          throw new ConflictException({
            code: 'PICKUP_NOT_CANCELLABLE',
            message: 'Cette demande ne peut plus être annulée.',
          });
        }
        return this.applyTransition(tx, fresh, 'CANCELLED', 'PARENT', auth, reason);
      },
      auth.userId,
    );
    return { request: this.toParentPickup(updated, auth, false) };
  }

  async prepareForStaff(auth: AuthContext, requestId: string): Promise<{ request: ParentPickup }> {
    return this.staffTransition(auth, requestId, 'PREPARING', ['TEACHER', 'CENTER_ADMIN']);
  }

  async readyForStaff(auth: AuthContext, requestId: string): Promise<{ request: ParentPickup }> {
    const current = await this.readStaffRequest(auth, requestId, ['TEACHER', 'CENTER_ADMIN']);
    const settings = await this.prisma.withTenant(
      current.centerId,
      (tx) => tx.centerSettings.findUnique({ where: { centerId: current.centerId } }),
      auth.userId,
    );
    const actor = this.staffActor(auth, current.centerId, ['TEACHER', 'CENTER_ADMIN']);
    const pin = generatePin(settings?.pinLength ?? 6);
    const pinHash = await this.passwords.hash(pin);
    const ciphertext = encryptPin(pin, pinKey(this.config.getOrThrow<string>('PIN_ENCRYPTION_KEY')));
    const updated = await this.prisma.withTenant(
      current.centerId,
      async (tx) => {
        const fresh = await tx.pickupRequest.findFirst({
          where: { id: requestId, deletedAt: null },
          include: requestInclude,
        });
        if (!fresh) {
          throw new NotFoundException({ code: 'PICKUP_NOT_FOUND', message: 'Demande introuvable.' });
        }
        await this.applyTransition(tx, fresh, 'READY', actor, auth);
        await tx.pickupVerification.create({
          data: {
            centerId: fresh.centerId,
            pickupRequestId: fresh.id,
            pinHash,
            pinCiphertext: ciphertext,
            expiresAt: fresh.expiresAt ?? new Date(Date.now() + 15 * 60_000),
          },
        });
        return tx.pickupRequest.findFirstOrThrow({ where: { id: fresh.id }, include: requestInclude });
      },
      auth.userId,
    );
    return { request: this.toParentPickup(updated, auth, false) };
  }

  async rejectForStaff(
    auth: AuthContext,
    requestId: string,
    reason: string,
  ): Promise<{ request: ParentPickup }> {
    return this.staffTransition(auth, requestId, 'REJECTED', ['TEACHER', 'RECEPTION', 'CENTER_ADMIN'], reason);
  }

  private async staffTransition(
    auth: AuthContext,
    requestId: string,
    to: PickupStatus,
    allowed: TransitionActor[],
    reason?: string,
  ): Promise<{ request: ParentPickup }> {
    const current = await this.readStaffRequest(auth, requestId, allowed);
    const actor = this.staffActor(auth, current.centerId, allowed);
    const updated = await this.prisma.withTenant(
      current.centerId,
      async (tx) => {
        const fresh = await tx.pickupRequest.findFirst({
          where: { id: requestId, deletedAt: null },
          include: requestInclude,
        });
        if (!fresh) {
          throw new NotFoundException({ code: 'PICKUP_NOT_FOUND', message: 'Demande introuvable.' });
        }
        return this.applyTransition(tx, fresh, to, actor, auth, reason);
      },
      auth.userId,
    );
    return { request: this.toParentPickup(updated, auth, false) };
  }

  private async applyTransition(
    tx: PrismaTypes.TransactionClient,
    request: LoadedPickup,
    to: PickupStatus,
    actor: TransitionActor,
    auth: AuthContext,
    reason?: string,
    pinVerified = false,
  ): Promise<LoadedPickup> {
    this.assertTransition(request.status, to, actor, pinVerified);
    const now = new Date();
    const updated = await tx.pickupRequest.update({
      where: { id: request.id },
      data: {
        status: to,
        notifiedAt: to === 'NOTIFIED' ? now : undefined,
        preparingAt: to === 'PREPARING' ? now : undefined,
        readyAt: to === 'READY' ? now : undefined,
        handedOverAt: to === 'HANDED_OVER' ? now : undefined,
        cancelledReason: to === 'CANCELLED' ? (reason ?? null) : undefined,
        rejectedReason: to === 'REJECTED' ? (reason ?? null) : undefined,
      },
      include: requestInclude,
    });
    await this.recordEvent(tx, updated, request.status, to, to, actor === 'SYSTEM' ? null : auth.userId, reason);
    await this.notify(tx, updated, auth, to);
    await tx.auditLog.create({
      data: {
        centerId: request.centerId,
        actorUserId: actor === 'SYSTEM' ? null : auth.userId,
        action: `pickup.${to.toLowerCase()}`,
        entityType: 'pickup_request',
        entityId: request.id,
        metadata: { from: request.status, to },
      },
    });
    return updated;
  }

  private async syncSchedule(
    tx: PrismaTypes.TransactionClient,
    request: LoadedPickup,
    auth: AuthContext,
  ): Promise<LoadedPickup> {
    const now = new Date();
    if ((ACTIVE as string[]).includes(request.status) && request.expiresAt && request.expiresAt <= now) {
      return this.applyTransition(tx, request, 'EXPIRED', 'SYSTEM', auth);
    }
    if (
      (request.status === 'PENDING' || request.status === 'SCHEDULED') &&
      request.eligibleAt &&
      request.eligibleAt <= now
    ) {
      return this.applyTransition(tx, request, 'NOTIFIED', 'SYSTEM', auth);
    }
    return request;
  }

  private async readParentRequest(auth: AuthContext, requestId: string): Promise<LoadedPickup> {
    for (const centerId of this.parentCenterIds(auth)) {
      const request = await this.prisma.withTenant(
        centerId,
        async (tx) => {
          const found = await tx.pickupRequest.findFirst({
            where: { id: requestId, deletedAt: null },
            include: requestInclude,
          });
          if (!found) {
            return null;
          }
          const link = await tx.parentStudent.findFirst({
            where: { parentUserId: auth.userId, studentId: found.studentId, deletedAt: null },
          });
          if (!link) {
            return null;
          }
          return this.syncSchedule(tx, found, auth);
        },
        auth.userId,
      );
      if (request) {
        return request;
      }
    }
    throw new NotFoundException({ code: 'PICKUP_NOT_FOUND', message: 'Demande introuvable.' });
  }

  private async readStaffRequest(
    auth: AuthContext,
    requestId: string,
    allowed: TransitionActor[],
  ): Promise<LoadedPickup> {
    const centers = [
      ...new Set(
        auth.centers
          .filter((center) => allowed.includes(center.role as TransitionActor))
          .map((center) => center.centerId),
      ),
    ];
    for (const centerId of centers) {
      const request = await this.prisma.withTenant(
        centerId,
        (tx) =>
          tx.pickupRequest.findFirst({
            where: { id: requestId, deletedAt: null },
            include: requestInclude,
          }),
        auth.userId,
      );
      if (request) {
        await this.assertStaffMaySee(auth, request);
        return request;
      }
    }
    throw new NotFoundException({ code: 'PICKUP_NOT_FOUND', message: 'Demande introuvable.' });
  }

  private async requireLink(auth: AuthContext, studentId: string) {
    for (const centerId of this.parentCenterIds(auth)) {
      const link = await this.prisma.withTenant(
        centerId,
        (tx) =>
          tx.parentStudent.findFirst({
            where: {
              parentUserId: auth.userId,
              studentId,
              deletedAt: null,
              student: { deletedAt: null },
            },
            include: { student: true },
          }),
        auth.userId,
      );
      if (!link) {
        continue;
      }
      if (link.student.status !== 'ACTIVE') {
        throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Élève introuvable.' });
      }
      if (!link.canRequestPickup) {
        throw new ForbiddenException({
          code: 'PICKUP_NOT_ALLOWED',
          message: 'Vous ne pouvez pas demander la récupération de cet élève.',
        });
      }
      return link;
    }
    throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Élève introuvable.' });
  }

  async listForStaff(auth: AuthContext): Promise<{ requests: StaffPickup[] }> {
    const scopes = this.staffScopes(auth);
    const requests: StaffPickup[] = [];
    for (const scope of scopes) {
      const rows = await this.prisma.withTenant(
        scope.centerId,
        async (tx) => {
          const classIds = scope.broad
            ? null
            : (
                await tx.classTeacher.findMany({
                  where: { teacherUserId: auth.userId, deletedAt: null },
                  select: { classId: true },
                })
              ).map((row) => row.classId);
          const found = await tx.pickupRequest.findMany({
            where: {
              deletedAt: null,
              ...(classIds ? { classSession: { classId: { in: classIds } } } : {}),
            },
            include: { ...requestInclude, requestedBy: true },
            orderBy: [{ priorityScore: 'desc' }, { requestedAt: 'asc' }],
            take: 100,
          });
          const synced = [];
          for (const request of found) {
            const next = await this.syncSchedule(tx, request, auth);
            synced.push(
              await tx.pickupRequest.findFirstOrThrow({
                where: { id: next.id },
                include: { ...requestInclude, requestedBy: true },
              }),
            );
          }
          return synced;
        },
        auth.userId,
      );
      requests.push(...rows.map((request) => this.toStaffPickup(request, auth)));
    }
    requests.sort((left, right) => right.priorityScore - left.priorityScore || left.requestedAt.localeCompare(right.requestedAt));
    return { requests };
  }

  async delayForStaff(auth: AuthContext, requestId: string, reason: string): Promise<{ request: StaffPickup }> {
    const current = await this.readStaffRequest(auth, requestId, ['TEACHER', 'CENTER_ADMIN']);
    const actor = this.staffActor(auth, current.centerId, ['TEACHER', 'CENTER_ADMIN']);
    try {
      this.transitions.assertDelay({ status: current.status, actor, reason });
    } catch (error) {
      if (error instanceof PickupTransitionError) {
        throw new ConflictException({ code: 'PICKUP_NOT_CANCELLABLE', message: error.message });
      }
      throw error;
    }
    const updated = await this.prisma.withTenant(
      current.centerId,
      async (tx) => {
        const fresh = await tx.pickupRequest.findFirst({
          where: { id: requestId, deletedAt: null },
          include: { ...requestInclude, requestedBy: true },
        });
        if (!fresh) {
          throw new NotFoundException({ code: 'PICKUP_NOT_FOUND', message: 'Demande introuvable.' });
        }
        const saved = await tx.pickupRequest.update({
          where: { id: fresh.id },
          data: { delayReason: reason, delayedAt: new Date() },
          include: { ...requestInclude, requestedBy: true },
        });
        await this.recordEvent(tx, saved, fresh.status, fresh.status, 'DELAYED', auth.userId, reason);
        await this.notify(tx, saved, auth, fresh.status);
        return saved;
      },
      auth.userId,
    );
    return { request: this.toStaffPickup(updated, auth) };
  }

  async verifyHandover(auth: AuthContext, requestId: string, pin: string): Promise<{ request: StaffPickup }> {
    const current = await this.readStaffRequest(auth, requestId, ['TEACHER', 'RECEPTION', 'CENTER_ADMIN']);
    const actor = this.staffActor(auth, current.centerId, ['TEACHER', 'RECEPTION', 'CENTER_ADMIN']);
    const settings = await this.prisma.withTenant(
      current.centerId,
      (tx) => tx.centerSettings.findUnique({ where: { centerId: current.centerId } }),
      auth.userId,
    );
    const maxAttempts = settings?.maxPinAttempts ?? 5;
    const outcome = await this.prisma.withTenant(
      current.centerId,
      async (tx) => {
        const fresh = await tx.pickupRequest.findFirst({
          where: { id: requestId, deletedAt: null },
          include: { ...requestInclude, requestedBy: true },
        });
        if (!fresh?.verification || fresh.status !== 'READY') {
          throw new ConflictException({ code: 'PICKUP_NOT_CANCELLABLE', message: 'La remise n’est pas autorisée.' });
        }
        if (fresh.verification.verifiedAt || fresh.verification.expiresAt <= new Date()) {
          throw new ConflictException({ code: 'PICKUP_NOT_CANCELLABLE', message: 'Le code a expiré.' });
        }
        if (fresh.verification.attemptCount >= maxAttempts) {
          throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Nombre de tentatives dépassé.' });
        }
        const matches = await this.passwords.verify(fresh.verification.pinHash, pin);
        if (!matches) {
          return { kind: 'invalid' as const, verificationId: fresh.verification.id };
        }
        await tx.pickupVerification.update({
          where: { id: fresh.verification.id },
          data: { verifiedAt: new Date(), verifiedByUserId: auth.userId },
        });
        const moved = await this.applyTransition(tx, fresh, 'HANDED_OVER', actor, auth, undefined, true);
        return tx.pickupRequest.findFirstOrThrow({
          where: { id: moved.id },
          include: { ...requestInclude, requestedBy: true },
        });
      },
      auth.userId,
    );
    if ('kind' in outcome) {
      await this.prisma.withTenant(
        current.centerId,
        (tx) =>
          tx.pickupVerification.update({
            where: { id: outcome.verificationId },
            data: { attemptCount: { increment: 1 } },
          }),
        auth.userId,
      );
      throw new UnauthorizedException({ code: 'PIN_INVALID', message: 'Code incorrect.' });
    }
    return { request: this.toStaffPickup(outcome, auth) };
  }

  private async assertStaffMaySee(auth: AuthContext, request: LoadedPickup): Promise<void> {
    const roles = auth.centers.filter((center) => center.centerId === request.centerId).map((center) => center.role);
    if (roles.includes('CENTER_ADMIN') || roles.includes('RECEPTION')) {
      return;
    }
    const teaches = await this.prisma.withTenant(
      request.centerId,
      (tx) =>
        tx.classTeacher.findFirst({
          where: { teacherUserId: auth.userId, classId: request.classSession.classId, deletedAt: null },
        }),
      auth.userId,
    );
    if (!teaches) {
      throw new NotFoundException({ code: 'PICKUP_NOT_FOUND', message: 'Demande introuvable.' });
    }
  }

  private staffScopes(auth: AuthContext): Array<{ centerId: string; broad: boolean }> {
    const byCenter = new Map<string, boolean>();
    for (const center of auth.centers) {
      if (center.role === 'CENTER_ADMIN' || center.role === 'RECEPTION') {
        byCenter.set(center.centerId, true);
      } else if (center.role === 'TEACHER' && !byCenter.has(center.centerId)) {
        byCenter.set(center.centerId, false);
      }
    }
    if (byCenter.size === 0) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Action non autorisée.' });
    }
    return [...byCenter.entries()].map(([centerId, broad]) => ({ centerId, broad }));
  }

  private toStaffPickup(
    request: LoadedPickup & { requestedBy?: { firstName: string; lastName: string } },
    auth: AuthContext,
  ): StaffPickup {
    const base = this.toParentPickup(request, auth, false);
    return {
      ...base,
      priorityScore: request.priorityScore,
      delayReason: request.delayReason,
      scheduledEndAt: request.classSession.scheduledEndAt.toISOString(),
      parentName: request.requestedBy ? `${request.requestedBy.firstName} ${request.requestedBy.lastName}` : '',
    };
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

  private staffActor(auth: AuthContext, centerId: string, allowed: TransitionActor[]): TransitionActor {
    const match = allowed.find((role) =>
      auth.centers.some((center) => center.centerId === centerId && center.role === role),
    );
    if (!match) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Action non autorisée.' });
    }
    return match;
  }

  private assertTransition(
    from: PickupStatus,
    to: PickupStatus,
    actor: TransitionActor,
    pinVerified = false,
  ): void {
    try {
      this.transitions.assert({ from, to, actor, pinVerified });
    } catch (error) {
      if (error instanceof PickupTransitionError) {
        throw new ConflictException({ code: 'PICKUP_NOT_CANCELLABLE', message: error.message });
      }
      throw error;
    }
  }

  private async recordEvent(
    tx: PrismaTypes.TransactionClient,
    request: { id: string; centerId: string },
    from: PickupStatus | null,
    to: PickupStatus,
    type: 'CREATED' | 'DELAYED' | PickupStatus,
    actorUserId: string | null,
    reason?: string,
  ): Promise<void> {
    await tx.pickupEvent.create({
      data: {
        centerId: request.centerId,
        pickupRequestId: request.id,
        type: type === 'PENDING' ? 'CREATED' : type,
        fromStatus: from,
        toStatus: to,
        actorUserId,
        reason,
      },
    });
  }

  private async notify(
    tx: PrismaTypes.TransactionClient,
    request: LoadedPickup,
    auth: AuthContext,
    status: PickupStatus,
  ): Promise<void> {
    const copy = parentCopy[auth.locale];
    await tx.notification.create({
      data: {
        centerId: request.centerId,
        userId: request.requestedById,
        pickupRequestId: request.id,
        channel: 'IN_APP',
        status: 'DELIVERED',
        title: copy.statuses[status],
        body: status === 'READY' ? copy.pinHint : copy.confirmation,
        payload: { status },
      },
    });
  }

  private toParentPickup(request: LoadedPickup, auth: AuthContext, disclosePin: boolean): ParentPickup {
    let pin: string | null = null;
    let pinExpiresAt: string | null = null;
    const verification = request.verification;
    const canDisclose =
      disclosePin &&
      request.status === 'READY' &&
      request.requestedById === auth.userId &&
      verification !== null &&
      verification.verifiedAt === null &&
      verification.expiresAt > new Date() &&
      verification.pinCiphertext.length > 0;
    if (canDisclose && verification) {
      try {
        pin = decryptPin(verification.pinCiphertext, pinKey(this.config.getOrThrow<string>('PIN_ENCRYPTION_KEY')));
        pinExpiresAt = verification.expiresAt.toISOString();
      } catch {
        pin = null;
      }
    }
    return {
      id: request.id,
      studentId: request.studentId,
      studentName: `${request.student.firstName} ${request.student.lastName}`,
      className: request.classSession.class.name,
      centerName: request.center.name,
      status: request.status,
      requestedAt: request.requestedAt.toISOString(),
      eligibleAt: request.eligibleAt?.toISOString() ?? null,
      expiresAt: request.expiresAt?.toISOString() ?? null,
      notifiedAt: request.notifiedAt?.toISOString() ?? null,
      preparingAt: request.preparingAt?.toISOString() ?? null,
      readyAt: request.readyAt?.toISOString() ?? null,
      handedOverAt: request.handedOverAt?.toISOString() ?? null,
      cancelledReason: request.cancelledReason,
      rejectedReason: request.rejectedReason,
      canCancel: (ACTIVE as string[]).includes(request.status) && request.requestedById === auth.userId,
      pin,
      pinExpiresAt,
    };
  }
}

function priorityScore(weights: unknown): number {
  if (weights && typeof weights === 'object' && 'sessionCompletion' in weights) {
    const value = Number((weights as { sessionCompletion?: unknown }).sessionCompletion);
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return 100;
}
