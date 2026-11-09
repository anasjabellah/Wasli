import { Injectable } from '@nestjs/common';
import type { ParentNotification } from '@wasli/shared';
import type { AuthContext } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(auth: AuthContext): Promise<{ notifications: ParentNotification[] }> {
    const centerIds = [...new Set(auth.centers.map((center) => center.centerId))];
    const notifications: ParentNotification[] = [];
    for (const centerId of centerIds) {
      const rows = await this.prisma.withTenant(
        centerId,
        (tx) =>
          tx.notification.findMany({
            where: { userId: auth.userId, channel: 'IN_APP' },
            orderBy: { createdAt: 'desc' },
            take: 40,
          }),
        auth.userId,
      );
      notifications.push(
        ...rows.map((row) => ({
          id: row.id,
          title: row.title,
          body: row.body,
          createdAt: row.createdAt.toISOString(),
          pickupRequestId: row.pickupRequestId,
        })),
      );
    }
    notifications.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    return { notifications: notifications.slice(0, 40) };
  }
}
