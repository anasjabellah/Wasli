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
if (!ownerUrl) throw new Error('DATABASE_URL is required');

const owner = createPrismaClient(ownerUrl);
const nonce = `reg-${Date.now()}`;
const password = 'Correct-horse-1';
const userIds: string[] = [];
const centerIds: string[] = [];
let app: INestApplication;
let base = '';
let teacherToken = '';

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

function registration(suffix: string, email = `${nonce}-${suffix}@example.com`) {
  return {
    centerName: `Centre ${suffix}`,
    centerEmail: `centre-${nonce}-${suffix}@example.com`,
    centerPhone: '+212522000111',
    city: 'Rabat',
    firstName: 'Sara',
    lastName: 'Alami',
    email,
    password,
    confirmPassword: password,
  };
}

beforeAll(async () => {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const teacher = await owner.user.create({
    data: { email: `${nonce}-teacher@example.com`, passwordHash, firstName: 'Nadia', lastName: 'Teacher' },
  });
  const holder = await owner.center.create({
    data: { name: `Holder ${nonce}`, slug: `holder-${nonce}`, status: 'ACTIVE' },
  });
  userIds.push(teacher.id);
  centerIds.push(holder.id);
  await owner.centerMembership.create({
    data: { centerId: holder.id, userId: teacher.id, role: 'TEACHER', status: 'ACTIVE' },
  });

  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind a port');
  base = `http://127.0.0.1:${address.port}/api/v1`;
  const teacherLogin = await call('/auth/login', {
    method: 'POST',
    body: { identifier: `${nonce}-teacher@example.com`, password },
  });
  expect(teacherLogin.status).toBe(200);
  teacherToken = String(teacherLogin.body?.accessToken);
}, 60_000);

afterAll(async () => {
  await app?.close();
  const createdUsers = await owner.user.findMany({
    where: { email: { contains: nonce } },
    select: { id: true },
  });
  const createdCenters = await owner.center.findMany({
    where: { OR: [{ email: { contains: nonce } }, { slug: { contains: nonce } }, { id: { in: centerIds } }] },
    select: { id: true },
  });
  const ids = [...new Set([...userIds, ...createdUsers.map((user) => user.id)])];
  const centers = [...new Set([...centerIds, ...createdCenters.map((center) => center.id)])];
  await owner.$executeRawUnsafe('ALTER TABLE audit_logs DISABLE TRIGGER audit_logs_append_only');
  try {
    if (centers.length > 0) {
      await owner.auditLog.deleteMany({ where: { centerId: { in: centers } } });
      await owner.centerSettings.deleteMany({ where: { centerId: { in: centers } } });
      await owner.centerMembership.deleteMany({ where: { centerId: { in: centers } } });
      await owner.center.deleteMany({ where: { id: { in: centers } } });
    }
    if (ids.length > 0) {
      await owner.auditLog.deleteMany({ where: { actorUserId: { in: ids } } });
      await owner.refreshToken.deleteMany({ where: { userId: { in: ids } } });
      await owner.centerMembership.deleteMany({ where: { userId: { in: ids } } });
      await owner.user.deleteMany({ where: { id: { in: ids } } });
    }
  } finally {
    await owner.$executeRawUnsafe('ALTER TABLE audit_logs ENABLE TRIGGER audit_logs_append_only');
    await owner.$disconnect();
  }
});

it('rejects an incomplete registration without creating a center', async () => {
  const before = await owner.center.count({ where: { email: { contains: nonce } } });
  const result = await call('/centers/registrations', { method: 'POST', body: { centerName: 'A' } });
  expect(result.status).toBe(400);
  expect(result.body?.code).toBe('VALIDATION');
  expect(await owner.center.count({ where: { email: { contains: nonce } } })).toBe(before);
});

it('registers an active center and lets its administrator open the dashboard', async () => {
  const created = await call('/centers/registrations', { method: 'POST', body: registration('atlas') });
  expect(created.status).toBe(201);
  expect(created.body?.status).toBe('ACTIVE');
  const centerId = String(created.body?.centerId);
  const stored = await owner.center.findUnique({ where: { id: centerId } });
  expect(stored?.status).toBe('ACTIVE');

  const duplicate = await call('/centers/registrations', {
    method: 'POST',
    body: registration('other', `${nonce}-atlas@example.com`),
  });
  expect(duplicate.status).toBe(409);
  expect(duplicate.body?.code).toBe('EMAIL_IN_USE');
  expect(await owner.user.count({ where: { email: `${nonce}-atlas@example.com` } })).toBe(1);

  const denied = await call(`/platform/centers/${centerId}/approve`, { method: 'POST', token: teacherToken, body: {} });
  expect(denied.status).toBe(403);
  const anonymous = await call(`/platform/centers/${centerId}/approve`, { method: 'POST', body: {} });
  expect(anonymous.status).toBe(401);

  const login = await call('/auth/login', {
    method: 'POST',
    body: { identifier: `${nonce}-atlas@example.com`, password },
  });
  expect(login.status).toBe(200);
  const user = login.body?.user;
  const accessToken = login.body?.accessToken;
  if (!user || typeof user !== 'object' || !('roles' in user) || typeof accessToken !== 'string') {
    throw new Error('Expected an active center session');
  }
  const roles = (user as { roles: string[] }).roles;
  expect(roles).toContain('CENTER_ADMIN');
  const students = await call('/operations/students', { token: accessToken });
  expect(students.status).toBe(200);
  expect(JSON.stringify(students.body)).not.toContain('Amina');
});

it('rolls back a colliding registration so only one account remains', async () => {
  const body = registration('race', `${nonce}-race@example.com`);
  const [first, second] = await Promise.all([
    call('/centers/registrations', { method: 'POST', body }),
    call('/centers/registrations', { method: 'POST', body }),
  ]);
  const statuses = [first.status, second.status].sort();
  expect(statuses).toEqual([201, 409]);
  expect(await owner.user.count({ where: { email: `${nonce}-race@example.com` } })).toBe(1);
  expect(await owner.center.count({ where: { email: `centre-${nonce}-race@example.com` } })).toBe(1);
});
