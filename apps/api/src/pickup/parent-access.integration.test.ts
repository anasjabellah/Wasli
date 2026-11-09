import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import argon2 from 'argon2';
import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, expect, it } from 'vitest';
// Compiled output is JavaScript only; Vitest loads this module from dist.
// @ts-expect-error dist/app.module.js has no declaration file.
import { AppModule } from '../../dist/app.module.js';
import { createPrismaClient } from '../prisma/prisma-client.js';

const ownerUrl = process.env.DATABASE_URL;
if (!ownerUrl) {
  throw new Error('DATABASE_URL is required');
}

const owner = createPrismaClient(ownerUrl);
const password = 'Correct-horse-1';
const nonce = `parent-${Date.now()}`;
const userIds: string[] = [];
const centerIds: string[] = [];

let app: INestApplication;
let base = '';
  let parentAId = '';
let aminaId = '';
let youssefId = '';
let blockedId = '';
let idleId = '';
let hiddenId = '';

async function call(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<{ status: number; body: Record<string, unknown> | null }> {
  const response = await fetch(`${base}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      accept: 'application/json',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null };
}

function jsonBody(result: { body: Record<string, unknown> | null }): Record<string, unknown> {
  if (!result.body) {
    throw new Error('Expected a JSON body');
  }
  return result.body;
}

function pickupOf(result: { body: Record<string, unknown> | null }): {
  id: string;
  status: string;
  pin: string | null;
} {
  const request = jsonBody(result).request;
  if (!request || typeof request !== 'object') {
    throw new Error('Expected a pickup request');
  }
  return request as { id: string; status: string; pin: string | null };
}

async function login(identifier: string): Promise<{ accessToken: string; refreshToken: string; roles: string[] }> {
  const result = await call('/auth/login', { method: 'POST', body: { identifier, password } });
  expect(result.status).toBe(200);
  const user = result.body?.user as { roles: string[] };
  return {
    accessToken: String(result.body?.accessToken),
    refreshToken: String(result.body?.refreshToken),
    roles: user.roles,
  };
}

beforeAll(async () => {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const parentA = await owner.user.create({
    data: {
      email: `${nonce}-a@example.com`,
      phone: `+2126${String(Date.now()).slice(-8)}`,
      passwordHash,
      firstName: 'Salma',
      lastName: 'Parent',
      locale: 'fr',
    },
  });
  const parentB = await owner.user.create({
    data: {
      email: `${nonce}-b@example.com`,
      passwordHash,
      firstName: 'Omar',
      lastName: 'Parent',
    },
  });
  const teacher = await owner.user.create({
    data: {
      email: `${nonce}-teacher@example.com`,
      passwordHash,
      firstName: 'Nadia',
      lastName: 'Teacher',
    },
  });
  const disabled = await owner.user.create({
    data: {
      email: `${nonce}-disabled@example.com`,
      passwordHash,
      firstName: 'Ines',
      lastName: 'Disabled',
      status: 'SUSPENDED',
    },
  });
  parentAId = parentA.id;
  userIds.push(parentA.id, parentB.id, teacher.id, disabled.id);

  const centerA = await owner.center.create({
    data: { name: 'Centre Test', slug: `${nonce}-a`, city: 'Casablanca', addressLine: '12 rue des Écoles' },
  });
  const centerB = await owner.center.create({ data: { name: 'Autre centre', slug: `${nonce}-b` } });
  centerIds.push(centerA.id, centerB.id);
  await owner.centerSettings.create({
    data: { centerId: centerA.id, pickupLeadMinutes: 120, requestExpiryMinutes: 90, pinLength: 6 },
  });
  await owner.centerMembership.createMany({
    data: [
      { centerId: centerA.id, userId: parentA.id, role: 'PARENT' },
      { centerId: centerA.id, userId: parentB.id, role: 'PARENT' },
      { centerId: centerA.id, userId: teacher.id, role: 'TEACHER' },
    ],
  });

  const amina = await owner.student.create({
    data: { centerId: centerA.id, firstName: 'Amina', lastName: 'Bennani' },
  });
  const youssef = await owner.student.create({
    data: { centerId: centerA.id, firstName: 'Youssef', lastName: 'Amrani' },
  });
  const blocked = await owner.student.create({
    data: { centerId: centerA.id, firstName: 'Lina', lastName: 'Blocked' },
  });
  const idle = await owner.student.create({
    data: { centerId: centerA.id, firstName: 'Adam', lastName: 'Idle' },
  });
  const hidden = await owner.student.create({
    data: { centerId: centerB.id, firstName: 'Hidden', lastName: 'Student' },
  });
  aminaId = amina.id;
  youssefId = youssef.id;
  blockedId = blocked.id;
  idleId = idle.id;
  hiddenId = hidden.id;

  await owner.parentStudent.createMany({
    data: [
      { centerId: centerA.id, parentUserId: parentA.id, studentId: amina.id, relationship: 'MOTHER' },
      { centerId: centerA.id, parentUserId: parentB.id, studentId: youssef.id, relationship: 'FATHER' },
      {
        centerId: centerA.id,
        parentUserId: parentA.id,
        studentId: blocked.id,
        relationship: 'GUARDIAN',
        canRequestPickup: false,
      },
      { centerId: centerA.id, parentUserId: parentA.id, studentId: idle.id, relationship: 'MOTHER' },
    ],
  });

  const now = new Date();
  const activeClass = await owner.class.create({
    data: { centerId: centerA.id, name: 'Maths 4e', subject: 'Maths' },
  });
  const idleClass = await owner.class.create({ data: { centerId: centerA.id, name: 'Histoire' } });
  await owner.classTeacher.create({
    data: { centerId: centerA.id, classId: activeClass.id, teacherUserId: teacher.id },
  });
  await owner.classEnrollment.createMany({
    data: [
      { centerId: centerA.id, classId: activeClass.id, studentId: amina.id },
      { centerId: centerA.id, classId: activeClass.id, studentId: youssef.id },
      { centerId: centerA.id, classId: activeClass.id, studentId: blocked.id },
      { centerId: centerA.id, classId: idleClass.id, studentId: idle.id },
    ],
  });
  await owner.classSession.create({
    data: {
      centerId: centerA.id,
      classId: activeClass.id,
      startsAt: new Date(now.getTime() - 10 * 60_000),
      scheduledEndAt: new Date(now.getTime() + 60 * 60_000),
      status: 'IN_PROGRESS',
    },
  });

  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address();
  if (!address || typeof address === 'string') {
    throw new Error('Test server did not bind a port');
  }
  base = `http://127.0.0.1:${address.port}/api/v1`;
}, 60_000);

afterAll(async () => {
  await app?.close();
  await owner.$executeRawUnsafe('ALTER TABLE pickup_events DISABLE TRIGGER pickup_events_append_only');
  await owner.$executeRawUnsafe('ALTER TABLE audit_logs DISABLE TRIGGER audit_logs_append_only');
  try {
  if (centerIds.length > 0) {
    await owner.pickupVerification.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.pickupEvent.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.notificationOutbox.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.notification.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.pickupRequest.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.auditLog.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.classTeacher.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.classSession.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.classEnrollment.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.class.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.parentStudent.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.student.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.centerMembership.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.centerSettings.deleteMany({ where: { centerId: { in: centerIds } } });
    await owner.center.deleteMany({ where: { id: { in: centerIds } } });
  }
  if (userIds.length > 0) {
    await owner.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await owner.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
    await owner.user.deleteMany({ where: { id: { in: userIds } } });
  }
  } finally {
    await owner.$executeRawUnsafe('ALTER TABLE pickup_events ENABLE TRIGGER pickup_events_append_only');
    await owner.$executeRawUnsafe('ALTER TABLE audit_logs ENABLE TRIGGER audit_logs_append_only');
    await owner.$disconnect();
  }
});

it('authenticates a parent with email or phone and rejects invalid credentials', async () => {
  const wrong = await call('/auth/login', {
    method: 'POST',
    body: { identifier: `${nonce}-a@example.com`, password: 'wrong-password' },
  });
  expect(wrong.status).toBe(401);
  expect(wrong.body?.code).toBe('INVALID_CREDENTIALS');

  const disabled = await call('/auth/login', {
    method: 'POST',
    body: { identifier: `${nonce}-disabled@example.com`, password },
  });
  expect(disabled.status).toBe(403);
  expect(disabled.body?.code).toBe('ACCOUNT_DISABLED');

  const parent = await owner.user.findUniqueOrThrow({ where: { id: parentAId } });
  const byPhone = await login(parent.phone ?? '');
  expect(byPhone.roles).toContain('PARENT');
  const me = await call('/auth/me', { token: byPhone.accessToken });
  expect(me.status).toBe(200);
  expect((jsonBody(me).user as { id: string }).id).toBe(parentAId);

  const missing = await call('/parents/me/children');
  expect(missing.status).toBe(401);
  expect(missing.body?.code).toBe('UNAUTHENTICATED');
});

it('shows a parent only the children linked to that parent', async () => {
  const parent = await login(`${nonce}-a@example.com`);
  const children = await call('/parents/me/children', { token: parent.accessToken });
  expect(children.status).toBe(200);
  const childList = jsonBody(children).children;
  if (!Array.isArray(childList)) {
    throw new Error('Expected children');
  }
  const names = childList.map((child: { firstName: string }) => child.firstName);
  expect(names).toEqual(['Adam', 'Amina', 'Lina']);
  const amina = childList.find((child: { firstName: string }) => child.firstName === 'Amina') as {
    className: string;
    center: { name: string; city: string };
  };
  expect(amina?.className).toBe('Maths 4e');
  expect(amina?.center).toMatchObject({ name: 'Centre Test', city: 'Casablanca' });

  const hidden = await call(`/parents/me/children/${hiddenId}`, { token: parent.accessToken });
  expect(hidden.status).toBe(404);
  expect(hidden.body?.code).toBe('STUDENT_NOT_FOUND');
  const other = await call(`/parents/me/children/${youssefId}`, { token: parent.accessToken });
  expect(other.status).toBe(404);

  const teacher = await login(`${nonce}-teacher@example.com`);
  expect(teacher.roles).not.toContain('PARENT');
  const denied = await call('/parents/me/children', { token: teacher.accessToken });
  expect(denied.status).toBe(403);
  expect(denied.body?.code).toBe('NOT_A_PARENT');
});

it('submits one pickup, blocks duplicates and unauthorized students, and discloses the PIN only when ready', async () => {
  const parent = await login(`${nonce}-a@example.com`);
  const otherParent = await login(`${nonce}-b@example.com`);
  const teacher = await login(`${nonce}-teacher@example.com`);

  const blocked = await call('/pickup-requests', {
    method: 'POST',
    token: parent.accessToken,
    body: { studentId: blockedId },
  });
  expect(blocked.status).toBe(403);
  expect(blocked.body?.code).toBe('PICKUP_NOT_ALLOWED');

  const idle = await call('/pickup-requests', {
    method: 'POST',
    token: parent.accessToken,
    body: { studentId: idleId },
  });
  expect(idle.status).toBe(409);
  expect(idle.body?.code).toBe('NO_ACTIVE_SESSION');

  const foreign = await call('/pickup-requests', {
    method: 'POST',
    token: parent.accessToken,
    body: { studentId: youssefId },
  });
  expect(foreign.status).toBe(404);
  expect(foreign.body?.code).toBe('STUDENT_NOT_FOUND');

  const created = await call('/pickup-requests', {
    method: 'POST',
    token: parent.accessToken,
    body: { studentId: aminaId },
  });
  expect(created.status).toBe(201);
  const request = pickupOf(created);
  expect(request.status).toBe('NOTIFIED');
  expect(request.pin).toBeNull();
  const requestId = request.id;

  const duplicate = await call('/pickup-requests', {
    method: 'POST',
    token: parent.accessToken,
    body: { studentId: aminaId },
  });
  expect(duplicate.status).toBe(409);
  expect(duplicate.body?.code).toBe('DUPLICATE_PICKUP');
  expect(duplicate.body?.requestId).toBe(requestId);

  const beforeReady = await call(`/pickup-requests/${requestId}`, { token: parent.accessToken });
  expect(pickupOf(beforeReady).pin).toBeNull();

  const parentPrepare = await call(`/pickup-requests/${requestId}/prepare`, {
    method: 'POST',
    token: parent.accessToken,
  });
  expect(parentPrepare.status).toBe(404);

  const prepared = await call(`/pickup-requests/${requestId}/prepare`, {
    method: 'POST',
    token: teacher.accessToken,
  });
  expect(prepared.status).toBe(201);
  expect(pickupOf(prepared).status).toBe('PREPARING');
  expect(pickupOf(prepared).pin).toBeNull();

  const ready = await call(`/pickup-requests/${requestId}/ready`, {
    method: 'POST',
    token: teacher.accessToken,
  });
  expect(ready.status).toBe(201);
  expect(pickupOf(ready).pin).toBeNull();

  const disclosed = await call(`/pickup-requests/${requestId}`, { token: parent.accessToken });
  const disclosedRequest = pickupOf(disclosed);
  expect(disclosed.status).toBe(200);
  expect(disclosedRequest.status).toBe('READY');
  expect(disclosedRequest.pin).toMatch(/^\d{6}$/);

  const listed = await call('/pickup-requests', { token: parent.accessToken });
  const listedRequests = jsonBody(listed).requests;
  if (!Array.isArray(listedRequests)) {
    throw new Error('Expected pickup requests');
  }
  const listedRequest = listedRequests.find((item: { id: string }) => item.id === requestId) as {
    pin: string | null;
  };
  expect(listedRequest?.pin).toBeNull();

  const stranger = await call(`/pickup-requests/${requestId}`, { token: otherParent.accessToken });
  expect(stranger.status).toBe(404);

  const notes = await call('/notifications', { token: parent.accessToken });
  expect(notes.status).toBe(200);
  expect(JSON.stringify(notes.body)).not.toContain(disclosedRequest.pin ?? '');

  const cancelled = await call(`/pickup-requests/${requestId}/cancel`, {
    method: 'POST',
    token: parent.accessToken,
    body: { reason: 'Je repars' },
  });
  expect(cancelled.status).toBe(201);
  expect(pickupOf(cancelled).status).toBe('CANCELLED');
  expect(pickupOf(cancelled).pin).toBeNull();

  const again = await call('/pickup-requests', {
    method: 'POST',
    token: parent.accessToken,
    body: { studentId: aminaId },
  });
  expect(again.status).toBe(201);
  const secondId = pickupOf(again).id;
  const rejected = await call(`/pickup-requests/${secondId}/reject`, {
    method: 'POST',
    token: teacher.accessToken,
    body: { reason: 'Élève déjà parti' },
  });
  expect(rejected.status).toBe(201);
  expect(pickupOf(rejected).status).toBe('REJECTED');
  expect(pickupOf(rejected).pin).toBeNull();

  const third = await call('/pickup-requests', {
    method: 'POST',
    token: parent.accessToken,
    body: { studentId: aminaId },
  });
  const thirdId = pickupOf(third).id;
  await owner.pickupRequest.update({
    where: { id: thirdId },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });
  const expired = await call(`/pickup-requests/${thirdId}`, { token: parent.accessToken });
  expect(pickupOf(expired).status).toBe('EXPIRED');
  expect(pickupOf(expired).pin).toBeNull();
});

it('keeps a failed handover PIN attempt and completes handover only with the parent PIN', async () => {
  const parent = await login(`${nonce}-a@example.com`);
  const teacher = await login(`${nonce}-teacher@example.com`);
  const created = await call('/pickup-requests', {
    method: 'POST',
    token: parent.accessToken,
    body: { studentId: aminaId },
  });
  expect(created.status).toBe(201);
  const requestId = pickupOf(created).id;
  expect(
    (
      await call(`/pickup-requests/${requestId}/prepare`, {
        method: 'POST',
        token: teacher.accessToken,
      })
    ).status,
  ).toBe(201);
  expect(
    (
      await call(`/pickup-requests/${requestId}/ready`, {
        method: 'POST',
        token: teacher.accessToken,
      })
    ).status,
  ).toBe(201);
  const disclosed = pickupOf(await call(`/pickup-requests/${requestId}`, { token: parent.accessToken }));
  expect(disclosed.pin).toMatch(/^\d{6}$/);
  const wrongPin = disclosed.pin === '000000' ? '111111' : '000000';
  const wrong = await call(`/pickup-requests/${requestId}/verify-handover`, {
    method: 'POST',
    token: teacher.accessToken,
    body: { pin: wrongPin },
  });
  expect(wrong.status).toBe(401);
  const verification = await owner.pickupVerification.findFirst({ where: { pickupRequestId: requestId } });
  expect(verification?.attemptCount).toBe(1);
  const handed = await call(`/pickup-requests/${requestId}/verify-handover`, {
    method: 'POST',
    token: teacher.accessToken,
    body: { pin: disclosed.pin },
  });
  expect(handed.status).toBe(201);
  expect(pickupOf(handed).status).toBe('HANDED_OVER');
  expect(pickupOf(handed).pin).toBeNull();
  const queue = await call('/operations/queue', { token: teacher.accessToken });
  expect(queue.status).toBe(200);
  expect(JSON.stringify(queue.body)).not.toContain(disclosed.pin ?? '');
});

it('rotates a refresh token and rejects it after logout', async () => {
  const first = await login(`${nonce}-a@example.com`);
  const refreshed = await call('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: first.refreshToken },
  });
  expect(refreshed.status).toBe(200);
  const nextRefresh = String(refreshed.body?.refreshToken);
  expect(nextRefresh).not.toBe(first.refreshToken);

  const reused = await call('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: first.refreshToken },
  });
  expect(reused.status).toBe(401);
  expect(reused.body?.code).toBe('SESSION_EXPIRED');

  const logout = await call('/auth/logout', { method: 'POST', body: { refreshToken: nextRefresh } });
  expect(logout.status).toBe(204);
  const afterLogout = await call('/auth/refresh', { method: 'POST', body: { refreshToken: nextRefresh } });
  expect(afterLogout.status).toBe(401);
});
