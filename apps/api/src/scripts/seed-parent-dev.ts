import argon2 from 'argon2';
import dotenv from 'dotenv';
import { createPrismaClient } from '../prisma/prisma-client.js';

dotenv.config({ override: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const parentEmail = 'parent.dev@wasli.local';
const parentPassword = 'Wasli-Parent-1';
const teacherEmail = 'teacher.dev@wasli.local';
const teacherPassword = 'Wasli-Teacher-1';
const adminEmail = 'admin.dev@wasli.local';
const adminPassword = 'Wasli-Admin-1';
const receptionEmail = 'reception.dev@wasli.local';
const receptionPassword = 'Wasli-Reception-1';
const platformEmail = 'platform.dev@wasli.local';
const platformPassword = 'Wasli-Platform-1';
const slug = 'wasli-dev-center';

const owner = createPrismaClient(databaseUrl);

const parentHash = await argon2.hash(parentPassword, { type: argon2.argon2id });
const teacherHash = await argon2.hash(teacherPassword, { type: argon2.argon2id });
const adminHash = await argon2.hash(adminPassword, { type: argon2.argon2id });
const receptionHash = await argon2.hash(receptionPassword, { type: argon2.argon2id });
const platformHash = await argon2.hash(platformPassword, { type: argon2.argon2id });

const parent = await owner.user.upsert({
  where: { email: parentEmail },
  update: { passwordHash: parentHash, status: 'ACTIVE', phone: '+212600000001' },
  create: {
    email: parentEmail,
    phone: '+212600000001',
    passwordHash: parentHash,
    firstName: 'Salma',
    lastName: 'Bennani',
    locale: 'fr',
  },
});
const admin = await owner.user.upsert({
  where: { email: adminEmail },
  update: { passwordHash: adminHash, status: 'ACTIVE' },
  create: {
    email: adminEmail,
    passwordHash: adminHash,
    firstName: 'Karim',
    lastName: 'Idrissi',
  },
});
const reception = await owner.user.upsert({
  where: { email: receptionEmail },
  update: { passwordHash: receptionHash, status: 'ACTIVE' },
  create: {
    email: receptionEmail,
    passwordHash: receptionHash,
    firstName: 'Imane',
    lastName: 'Tazi',
  },
});
const platform = await owner.user.upsert({
  where: { email: platformEmail },
  update: { passwordHash: platformHash, status: 'ACTIVE' },
  create: {
    email: platformEmail,
    passwordHash: platformHash,
    firstName: 'Wasli',
    lastName: 'Platform',
  },
});
const teacher = await owner.user.upsert({
  where: { email: teacherEmail },
  update: { passwordHash: teacherHash, status: 'ACTIVE' },
  create: {
    email: teacherEmail,
    passwordHash: teacherHash,
    firstName: 'Nadia',
    lastName: 'Alaoui',
  },
});

const center = await owner.center.upsert({
  where: { slug },
  update: { name: 'Centre Wasli', city: 'Casablanca', addressLine: '12 rue des Écoles', status: 'ACTIVE' },
  create: {
    slug,
    name: 'Centre Wasli',
    city: 'Casablanca',
    addressLine: '12 rue des Écoles',
  },
});

await owner.centerSettings.upsert({
  where: { centerId: center.id },
  update: { pickupLeadMinutes: 90, requestExpiryMinutes: 120, pinLength: 6 },
  create: { centerId: center.id, pickupLeadMinutes: 90, requestExpiryMinutes: 120, pinLength: 6 },
});

const platformMembership = await owner.centerMembership.findFirst({
  where: { userId: platform.id, role: 'PLATFORM_ADMIN', deletedAt: null },
});
if (!platformMembership) {
  await owner.centerMembership.create({
    data: { userId: platform.id, role: 'PLATFORM_ADMIN', status: 'ACTIVE' },
  });
}

for (const member of [
  { userId: parent.id, role: 'PARENT' as const },
  { userId: teacher.id, role: 'TEACHER' as const },
  { userId: admin.id, role: 'CENTER_ADMIN' as const },
  { userId: reception.id, role: 'RECEPTION' as const },
]) {
  const existing = await owner.centerMembership.findFirst({
    where: { centerId: center.id, userId: member.userId, role: member.role, deletedAt: null },
  });
  if (!existing) {
    await owner.centerMembership.create({
      data: { centerId: center.id, userId: member.userId, role: member.role, status: 'ACTIVE' },
    });
  }
}

const student = await owner.student.upsert({
  where: { id: await existingStudentId(center.id, 'Amina', 'Bennani') },
  update: { status: 'ACTIVE', deletedAt: null },
  create: { centerId: center.id, firstName: 'Amina', lastName: 'Bennani' },
});

const link = await owner.parentStudent.findFirst({
  where: { parentUserId: parent.id, studentId: student.id, deletedAt: null },
});
if (!link) {
  await owner.parentStudent.create({
    data: {
      centerId: center.id,
      parentUserId: parent.id,
      studentId: student.id,
      relationship: 'MOTHER',
      canRequestPickup: true,
    },
  });
}

let course = await owner.class.findFirst({
  where: { centerId: center.id, name: 'Maths 4e', deletedAt: null },
});
if (!course) {
  course = await owner.class.create({
    data: { centerId: center.id, name: 'Maths 4e', subject: 'Mathématiques', room: 'Salle 2' },
  });
}
const teaching = await owner.classTeacher.findFirst({
  where: { classId: course.id, teacherUserId: teacher.id, deletedAt: null },
});
if (!teaching) {
  await owner.classTeacher.create({
    data: { centerId: center.id, classId: course.id, teacherUserId: teacher.id },
  });
}
const enrollment = await owner.classEnrollment.findFirst({
  where: { classId: course.id, studentId: student.id, deletedAt: null },
});
if (!enrollment) {
  await owner.classEnrollment.create({
    data: { centerId: center.id, classId: course.id, studentId: student.id },
  });
}

const now = new Date();
const openSessions = await owner.classSession.findMany({
  where: {
    classId: course.id,
    deletedAt: null,
    startsAt: { lte: now },
    scheduledEndAt: { gt: now },
  },
});
if (openSessions.length === 0) {
  await owner.classSession.create({
    data: {
      centerId: center.id,
      classId: course.id,
      startsAt: new Date(now.getTime() - 30 * 60_000),
      scheduledEndAt: new Date(now.getTime() + 90 * 60_000),
      status: 'IN_PROGRESS',
    },
  });
}

console.log(`Parent ${parentEmail} / ${parentPassword}`);
console.log(`Teacher ${teacherEmail} / ${teacherPassword}`);
console.log(`Admin ${adminEmail} / ${adminPassword}`);
console.log(`Reception ${receptionEmail} / ${receptionPassword}`);
console.log(`Platform ${platformEmail} / ${platformPassword}`);
console.log(`Student ${student.firstName} ${student.lastName} at ${center.name}`);
await owner.$disconnect();

async function existingStudentId(centerId: string, firstName: string, lastName: string): Promise<string> {
  const found = await owner.student.findFirst({
    where: { centerId, firstName, lastName, deletedAt: null },
  });
  return found?.id ?? '00000000-0000-0000-0000-000000000000';
}
