import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { MembershipRole } from '@wasli/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthContext } from './auth.types.js';
import { PasswordService } from './password.service.js';
import { hashToken, TokenService } from './token.service.js';

type RequestMeta = {
  userAgent?: string;
  ip?: string;
};

type MembershipRow = {
  centerId: string | null;
  role: MembershipRole;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async login(identifier: string, password: string, meta: RequestMeta) {
    const trimmed = identifier.trim();
    const email = trimmed.includes('@') ? trimmed.toLowerCase() : null;
    const phone = email ? null : trimmed.replace(/[\s()-]/g, '');

    return this.prisma.withPlatformAccess(async (tx) => {
      const users = await tx.user.findMany({
        where: {
          deletedAt: null,
          ...(email ? { email } : { phone }),
        },
        take: 2,
      });
      const user = users.length === 1 ? users[0] : null;
      const passwordMatches = user ? await this.passwords.verify(user.passwordHash, password) : false;
      if (!user || !passwordMatches) {
        throw new UnauthorizedException({
          code: 'INVALID_CREDENTIALS',
          message: 'Identifiants incorrects.',
        });
      }
      if (user.status !== 'ACTIVE') {
        throw new ForbiddenException({ code: 'ACCOUNT_DISABLED', message: 'Ce compte est désactivé.' });
      }

      const memberships = await this.activeMemberships(tx, user.id);
      if (memberships.length === 0) {
        await this.assertCenterIsOpen(tx, user.id);
      }
      const session = await this.issue(tx, user.id, meta);
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          centerId: memberships.find((membership) => membership.centerId)?.centerId ?? null,
          action: 'auth.login',
          entityType: 'user',
          entityId: user.id,
          metadata: { channel: 'password' },
        },
      });
      return { ...session, user: this.contextFrom(user, memberships) };
    }).then((result) => ({
      ...result,
      user: {
        id: result.user.userId,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        phone: result.user.phone,
        locale: result.user.locale,
        roles: result.user.roles,
      },
    }));
  }

  async refresh(refreshToken: string, meta: RequestMeta) {
    const tokenHash = hashToken(refreshToken);
    const result = await this.prisma.withPlatformAccess(async (tx) => {
      const stored = await tx.refreshToken.findUnique({ where: { tokenHash } });
      if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
        throw new UnauthorizedException({ code: 'SESSION_EXPIRED', message: 'Session expirée.' });
      }
      await tx.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
      const user = await tx.user.findFirst({
        where: { id: stored.userId, deletedAt: null, status: 'ACTIVE' },
      });
      if (!user) {
        throw new UnauthorizedException({ code: 'SESSION_EXPIRED', message: 'Session expirée.' });
      }
      const memberships = await this.activeMemberships(tx, user.id);
      if (memberships.length === 0) {
        await this.assertCenterIsOpen(tx, user.id);
      }
      const session = await this.issue(tx, user.id, meta);
      return { ...session, user: this.contextFrom(user, memberships) };
    });
    return {
      ...result,
      user: {
        id: result.user.userId,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        phone: result.user.phone,
        locale: result.user.locale,
        roles: result.user.roles,
      },
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.withPlatformAccess(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  async authenticateAccessToken(accessToken: string): Promise<AuthContext> {
    const { userId } = this.tokens.verifyAccessToken(accessToken);
    return this.prisma.withPlatformAccess(async (tx) => {
      const user = await tx.user.findFirst({ where: { id: userId, deletedAt: null } });
      if (!user || user.status !== 'ACTIVE') {
        throw new ForbiddenException({ code: 'ACCOUNT_DISABLED', message: 'Ce compte est désactivé.' });
      }
      const memberships = await this.activeMemberships(tx, user.id);
      return this.contextFrom(user, memberships);
    });
  }

  private async assertCenterIsOpen(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    const membership = await tx.centerMembership.findFirst({
      where: {
        userId,
        deletedAt: null,
        status: 'ACTIVE',
        center: { deletedAt: null, status: { in: ['PENDING_APPROVAL', 'REJECTED', 'SUSPENDED'] } },
      },
      include: { center: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!membership?.center) return;
    const status = membership.center.status;
    if (status === 'PENDING_APPROVAL') {
      throw new ForbiddenException({
        code: 'CENTER_PENDING',
        message: 'Votre centre est en attente d’approbation. Le tableau de bord s’ouvrira une fois le centre activé.',
        centerName: membership.center.name,
      });
    }
    if (status === 'REJECTED') {
      throw new ForbiddenException({
        code: 'CENTER_REJECTED',
        message: 'L’inscription du centre a été refusée.',
        centerName: membership.center.name,
        rejectionReason: membership.center.rejectionReason,
      });
    }
    throw new ForbiddenException({
      code: 'CENTER_SUSPENDED',
      message: 'Ce centre est suspendu.',
      centerName: membership.center.name,
    });
  }

  private async activeMemberships(tx: Prisma.TransactionClient, userId: string): Promise<MembershipRow[]> {
    const rows = await tx.centerMembership.findMany({
      where: {
        userId,
        deletedAt: null,
        status: 'ACTIVE',
        OR: [{ centerId: null }, { center: { deletedAt: null, status: 'ACTIVE' } }],
      },
    });
    return rows.map((row) => ({ centerId: row.centerId, role: row.role }));
  }

  private async issue(tx: Prisma.TransactionClient, userId: string, meta: RequestMeta) {
    const access = this.tokens.signAccessToken(userId);
    const refresh = this.tokens.createRefreshToken();
    await tx.refreshToken.create({
      data: {
        userId,
        tokenHash: refresh.tokenHash,
        expiresAt: refresh.expiresAt,
        userAgent: meta.userAgent?.slice(0, 240),
        ipAddress: meta.ip?.slice(0, 64),
      },
    });
    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt.toISOString(),
    };
  }

  private contextFrom(
    user: { id: string; email: string; firstName: string; lastName: string; phone: string | null; locale: string },
    memberships: MembershipRow[],
  ): AuthContext {
    const centers = memberships.flatMap((membership) =>
      membership.centerId ? [{ centerId: membership.centerId, role: membership.role }] : [],
    );
    const roles = [...new Set(memberships.map((membership) => membership.role))];
    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      locale: user.locale === 'ar' ? 'ar' : 'fr',
      roles,
      centers,
    };
  }
}
