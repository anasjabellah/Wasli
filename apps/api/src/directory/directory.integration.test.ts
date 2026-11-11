import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, expect, it } from 'vitest';
// @ts-expect-error dist/app.module.js has no declaration file.
import { AppModule } from '../../dist/app.module.js';
import { createPrismaClient } from '../prisma/prisma-client.js';

const ownerUrl = process.env.DATABASE_URL;
if (!ownerUrl) throw new Error('DATABASE_URL is required');

const owner = createPrismaClient(ownerUrl);
const nonce = `dir-${Date.now()}`;
const password = 'Correct-horse-1';
let app: INestApplication;
let base = '';

async function call(path: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  const response = await fetch(`${base}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      accept: 'application/json',
      ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null };
}

function registration(suffix: string) {
  return {
    centerName: `Centre ${suffix}`,
    centerEmail: `centre-${nonce}-${suffix}@example.com`,
    centerPhone: '+212522000111',
    city: 'Rabat',
    firstName: 'Sara',
    lastName: 'Alami',
    email: `${nonce}-${suffix}@example.com`,
    password,
    confirmPassword: password,
  };
}

beforeAll(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind a port');
  base = `http://127.0.0.1:${address.port}/api/v1`;
}, 60_000);

afterAll(async () => {
  await app?.close();
  const centers = await owner.center.findMany({ where: { email: { contains: nonce } }, select: { id: true } });
  const users = await owner.user.findMany({ where: { email: { contains: nonce } }, select: { id: true } });
  const centerIds = centers.map((center) => center.id);
  const userIds = users.map((user) => user.id);
  await owner.$executeRawUnsafe('ALTER TABLE audit_logs DISABLE TRIGGER audit_logs_append_only');
  try {
    if (centerIds.length > 0) {
      await owner.classSession.deleteMany({ where: { centerId: { in: centerIds } } });
      await owner.classSchedule.deleteMany({ where: { centerId: { in: centerIds } } });
      await owner.classTeacher.deleteMany({ where: { centerId: { in: centerIds } } });
      await owner.classEnrollment.deleteMany({ where: { centerId: { in: centerIds } } });
      await owner.parentStudent.deleteMany({ where: { centerId: { in: centerIds } } });
      await owner.student.deleteMany({ where: { centerId: { in: centerIds } } });
      await owner.class.deleteMany({ where: { centerId: { in: centerIds } } });
      await owner.auditLog.deleteMany({ where: { centerId: { in: centerIds } } });
      await owner.centerSettings.deleteMany({ where: { centerId: { in: centerIds } } });
      await owner.centerMembership.deleteMany({ where: { centerId: { in: centerIds } } });
      await owner.center.deleteMany({ where: { id: { in: centerIds } } });
    }
    if (userIds.length > 0) {
      await owner.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await owner.centerMembership.deleteMany({ where: { userId: { in: userIds } } });
      await owner.user.deleteMany({ where: { id: { in: userIds } } });
    }
  } finally {
    await owner.$executeRawUnsafe('ALTER TABLE audit_logs ENABLE TRIGGER audit_logs_append_only');
    await owner.$disconnect();
  }
});

it('manages the center directory and rejects other centers and teachers', async () => {
  const created = await call('/centers/registrations', { method: 'POST', body: registration('one') });
  const other = await call('/centers/registrations', { method: 'POST', body: registration('two') });
  expect(created.status).toBe(201);
  expect(other.status).toBe(201);
  const login = await call('/auth/login', { method: 'POST', body: { identifier: `${nonce}-one@example.com`, password } });
  const otherLogin = await call('/auth/login', { method: 'POST', body: { identifier: `${nonce}-two@example.com`, password } });
  expect(login.status).toBe(200);
  const token = String(login.body?.accessToken);
  const otherToken = String(otherLogin.body?.accessToken);

  const invalid = await call('/directory/students', { method: 'POST', token, body: { firstName: ' ' } });
  expect(invalid.status).toBe(400);
  expect(invalid.body?.code).toBe('VALIDATION');

  const student = await call('/directory/students', {
    method: 'POST',
    token,
    body: { firstName: 'Amina', lastName: 'Bennani' },
  });
  expect(student.status).toBe(201);
  const studentId = String(student.body?.id);

  const course = await call('/directory/classes', { method: 'POST', token, body: { name: 'Maths', subject: 'Mathématiques' } });
  expect(course.status).toBe(201);
  const classId = String(course.body?.id);
  const enrolled = await call('/directory/enrollments', { method: 'POST', token, body: { classId, studentId } });
  expect(enrolled.status).toBe(201);

  const parent = await call('/directory/parents', {
    method: 'POST',
    token,
    body: { firstName: 'Salma', lastName: 'Bennani', email: `${nonce}-parent@example.com`, password },
  });
  expect(parent.status).toBe(201);
  const storedParent = await owner.user.findUnique({ where: { email: `${nonce}-parent@example.com` } });
  expect(storedParent?.passwordHash.startsWith('$argon2')).toBe(true);
  const link = await call('/directory/parent-links', {
    method: 'POST',
    token,
    body: { parentUserId: String(parent.body?.id), studentId, relationship: 'MOTHER' },
  });
  expect(link.status).toBe(201);
  const removed = await call(`/directory/parent-links/${String(link.body?.id)}`, { method: 'DELETE', token });
  expect(removed.status).toBe(200);
  expect(await owner.user.count({ where: { email: `${nonce}-parent@example.com` } })).toBe(1);
  expect(await owner.student.count({ where: { id: studentId } })).toBe(1);

  const teacher = await call('/directory/teachers', {
    method: 'POST',
    token,
    body: { firstName: 'Nadia', lastName: 'Alaoui', email: `${nonce}-teacher@example.com`, password },
  });
  expect(teacher.status).toBe(201);
  const duplicate = await call('/directory/teachers', {
    method: 'POST',
    token,
    body: { firstName: 'Nadia', lastName: 'Alaoui', email: `${nonce}-teacher@example.com`, password },
  });
  expect(duplicate.status).toBe(409);
  const assignment = await call('/directory/teacher-classes', {
    method: 'POST',
    token,
    body: { classId, teacherUserId: String(teacher.body?.id) },
  });
  expect(assignment.status).toBe(201);

  const slot = await call('/directory/schedules', {
    method: 'POST',
    token,
    body: { classId, weekday: 'MONDAY', startTime: '16:00', endTime: '17:30', effectiveFrom: '2026-11-10' },
  });
  expect(slot.status).toBe(201);
  const clash = await call('/directory/schedules', {
    method: 'POST',
    token,
    body: { classId, weekday: 'MONDAY', startTime: '17:00', endTime: '18:00', effectiveFrom: '2026-11-10' },
  });
  expect(clash.status).toBe(409);
  expect(clash.body?.code).toBe('SCHEDULE_CONFLICT');

  const teacherLogin = await call('/auth/login', { method: 'POST', body: { identifier: `${nonce}-teacher@example.com`, password } });
  expect(teacherLogin.status).toBe(200);
  const denied = await call('/directory/students', {
    method: 'POST',
    token: String(teacherLogin.body?.accessToken),
    body: { firstName: 'Youssef', lastName: 'Idrissi' },
  });
  expect(denied.status).toBe(403);

  const foreign = await call(`/directory/students/${studentId}`, { token: otherToken });
  expect(foreign.status).toBe(404);
  const summary = await call('/directory/summary', { token });
  expect(summary.status).toBe(200);
  expect(summary.body?.students).toBe(1);
  expect(summary.body?.teachers).toBe(1);

  const archived = await call(`/directory/students/${studentId}`, { method: 'DELETE', token });
  expect(archived.status).toBe(200);
  const stillThere = await owner.student.findUnique({ where: { id: studentId } });
  expect(stillThere?.deletedAt).toBeTruthy();
  expect(await owner.pickupRequest.count({ where: { studentId } })).toBe(0);
});
