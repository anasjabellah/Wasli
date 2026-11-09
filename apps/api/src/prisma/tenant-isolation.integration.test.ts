import { afterAll, beforeAll, expect, it } from 'vitest';
import { createPrismaClient } from './prisma-client.js';
import { applyPlatformScope, applyTenantScope } from './tenant-scope.js';

const ownerUrl = process.env.DATABASE_URL;
const appUrl = process.env.APP_DATABASE_URL;

if (!ownerUrl || !appUrl) {
  throw new Error('DATABASE_URL and APP_DATABASE_URL are required for tenant isolation tests');
}

if (ownerUrl === appUrl) {
  throw new Error('Tenant isolation tests require the API role to be distinct from the migration role');
}

const owner = createPrismaClient(ownerUrl);
const app = createPrismaClient(appUrl);
const nonce = `it-${Date.now()}`;
const centerIds: string[] = [];
let userId = '';

beforeAll(async () => {
  const user = await owner.user.create({
    data: {
      email: `${nonce}@example.com`,
      passwordHash: 'test-hash-not-a-password',
      firstName: 'Integration',
      lastName: 'Parent',
    },
  });
  userId = user.id;
});

afterAll(async () => {
  if (centerIds.length > 0) {
    await owner.pickupVerification.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.pickupRequest.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.notificationOutbox.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.notification.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.classSession.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.classSchedule.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.classEnrollment.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.classTeacher.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.class.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.parentStudent.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.authorizedPickup.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.student.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.centerMembership.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.centerSettings.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.centerSubscription.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.center.deleteMany({ where: { id: { in: centerIds } } });
  }

  if (userId) {
    await owner.user.delete({ where: { id: userId } });
  }

  await owner.$disconnect();
  await app.$disconnect();
});

it('hides other centers unless the request sets the tenant scope', async () => {
  const centerA = await owner.center.create({ data: { name: 'Center A', slug: `${nonce}-a` } });
  const centerB = await owner.center.create({ data: { name: 'Center B', slug: `${nonce}-b` } });
  centerIds.push(centerA.id, centerB.id);

  await owner.student.create({
    data: { centerId: centerA.id, firstName: 'Amina', lastName: 'A' },
  });
  await owner.student.create({
    data: { centerId: centerB.id, firstName: 'Youssef', lastName: 'B' },
  });

  const unscoped = await app.center.findMany({ where: { id: { in: centerIds } } });
  expect(unscoped).toEqual([]);

  const scoped = await app.$transaction(async (tx) => {
    await applyTenantScope(tx, centerA.id);
    return tx.student.findMany({ orderBy: { firstName: 'asc' } });
  });
  expect(scoped.map((student) => student.firstName)).toEqual(['Amina']);

  await expect(
    app.$transaction(async (tx) => {
      await applyTenantScope(tx, centerA.id);
      await tx.student.create({
        data: { centerId: centerB.id, firstName: 'Blocked', lastName: 'Write' },
      });
    }),
  ).rejects.toThrow();

  const platform = await app.$transaction(async (tx) => {
    await applyPlatformScope(tx);
    return tx.center.findMany({ where: { id: { in: centerIds } }, orderBy: { slug: 'asc' } });
  });
  expect(platform.map((center) => center.slug)).toEqual([`${nonce}-a`, `${nonce}-b`]);
});

it('rejects cross-center links, duplicate active pickups, illegal memberships, and audit edits', async () => {
  const centerA = await owner.center.create({ data: { name: 'Rules A', slug: `${nonce}-rules-a` } });
  const centerB = await owner.center.create({ data: { name: 'Rules B', slug: `${nonce}-rules-b` } });
  centerIds.push(centerA.id, centerB.id);

  const student = await owner.student.create({
    data: { centerId: centerA.id, firstName: 'Sara', lastName: 'Alaoui' },
  });
  const classA = await owner.class.create({ data: { centerId: centerA.id, name: 'Maths' } });
  const classB = await owner.class.create({ data: { centerId: centerB.id, name: 'Physics' } });
  const sessionA = await owner.classSession.create({
    data: {
      centerId: centerA.id,
      classId: classA.id,
      startsAt: new Date('2026-11-09T16:00:00.000Z'),
      scheduledEndAt: new Date('2026-11-09T17:00:00.000Z'),
    },
  });
  const sessionB = await owner.classSession.create({
    data: {
      centerId: centerB.id,
      classId: classB.id,
      startsAt: new Date('2026-11-09T16:00:00.000Z'),
      scheduledEndAt: new Date('2026-11-09T17:00:00.000Z'),
    },
  });

  await expect(
    owner.pickupRequest.create({
      data: {
        centerId: centerA.id,
        studentId: student.id,
        classSessionId: sessionB.id,
        requestedById: userId,
      },
    }),
  ).rejects.toThrow();

  const first = await owner.pickupRequest.create({
    data: {
      centerId: centerA.id,
      studentId: student.id,
      classSessionId: sessionA.id,
      requestedById: userId,
    },
  });

  await expect(
    owner.pickupRequest.create({
      data: {
        centerId: centerA.id,
        studentId: student.id,
        classSessionId: sessionA.id,
        requestedById: userId,
      },
    }),
  ).rejects.toThrow();

  await owner.pickupRequest.update({
    where: { id: first.id },
    data: { status: 'HANDED_OVER', handedOverAt: new Date() },
  });

  await expect(
    owner.pickupRequest.create({
      data: {
        centerId: centerA.id,
        studentId: student.id,
        classSessionId: sessionA.id,
        requestedById: userId,
      },
    }),
  ).resolves.toMatchObject({ status: 'PENDING' });

  await expect(
    owner.centerMembership.create({
      data: { userId, role: 'TEACHER' },
    }),
  ).rejects.toThrow();

  await expect(
    owner.centerMembership.create({
      data: { centerId: centerA.id, userId, role: 'PLATFORM_ADMIN' },
    }),
  ).rejects.toThrow();

  await expect(
    owner.$transaction(async (tx) => {
      const log = await tx.auditLog.create({
        data: { centerId: centerA.id, action: 'center.created', entityType: 'Center', entityId: centerA.id },
      });
      await tx.auditLog.update({ where: { id: log.id }, data: { action: 'tampered' } });
    }),
  ).rejects.toThrow(/append-only/);
});
