import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ClassWrite, ParentLinkWrite, ParentWrite, ScheduleWrite, StudentWrite, TeacherWrite } from '@wasli/validation';
import type { AuthContext } from '../auth/auth.types.js';
import { PasswordService } from '../auth/password.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { scheduleConflict } from './directory-conflicts.js';

type Role = 'CENTER_ADMIN' | 'RECEPTION' | 'TEACHER';
type Tx = Prisma.TransactionClient;

@Injectable()
export class DirectoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async summary(auth: AuthContext) {
    const centerId = this.adminCenter(auth);
    return this.prisma.withTenant(centerId, async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      const [students, links, teachers] = await Promise.all([
        tx.student.count({ where: { deletedAt: null } }),
        tx.parentStudent.count({ where: { deletedAt: null } }),
        tx.centerMembership.count({ where: { deletedAt: null, role: 'TEACHER', status: 'ACTIVE' } }),
      ]);
      return { students, links, teachers };
    }, auth.userId);
  }

  async students(auth: AuthContext, query?: { q?: string; status?: string; classId?: string }) {
    const status = this.status(query?.status, ['ACTIVE', 'INACTIVE']);
    return this.read(auth, ['CENTER_ADMIN', 'RECEPTION', 'TEACHER'], async (tx, broad) => {
      const classIds = await this.teacherClassIds(tx, auth.userId, broad);
      const allowedClass = !query?.classId || !classIds || classIds.includes(query.classId);
      const rows = await tx.student.findMany({
        where: {
          deletedAt: null,
          ...(status ? { status } : {}),
          ...(!allowedClass ? { id: { in: [] } } : {}),
          ...(query?.classId || classIds
            ? { classEnrollments: { some: { deletedAt: null, classId: query?.classId ?? { in: classIds ?? [] } } } }
            : {}),
          ...(query?.q
            ? { OR: [{ firstName: { contains: query.q, mode: 'insensitive' } }, { lastName: { contains: query.q, mode: 'insensitive' } }] }
            : {}),
        },
        include: studentInclude,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 100,
      });
      return rows.map((row) => {
        const student = presentStudent(row);
        return broad ? student : { ...student, parents: [] };
      });
    });
  }

  async student(auth: AuthContext, id: string) {
    const rows = await this.students(auth, {});
    const found = rows.items.find((item) => item.id === id);
    if (!found) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Élève introuvable.' });
    return found;
  }

  async createStudent(auth: AuthContext, input: StudentWrite) {
    const centerId = this.adminCenter(auth);
    return this.prisma.withTenant(centerId, async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      const student = await tx.student.create({
        data: {
          centerId,
          firstName: input.firstName,
          lastName: input.lastName,
          dateOfBirth: input.dateOfBirth ? this.day(input.dateOfBirth) : null,
          status: input.status ?? 'ACTIVE',
          notes: input.notes ?? null,
        },
      });
      if (input.classId) await this.enroll(tx, centerId, student.id, input.classId);
      await this.audit(tx, centerId, auth.userId, 'student.created', 'student', student.id);
      return presentStudent(await tx.student.findFirstOrThrow({ where: { id: student.id }, include: studentInclude }));
    }, auth.userId);
  }

  async updateStudent(auth: AuthContext, id: string, input: StudentWrite) {
    const centerId = this.adminCenter(auth);
    return this.prisma.withTenant(centerId, async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      const current = await tx.student.findFirst({ where: { id, deletedAt: null } });
      if (!current) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Élève introuvable.' });
      await tx.student.update({
        where: { id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          dateOfBirth: input.dateOfBirth ? this.day(input.dateOfBirth) : null,
          status: input.status ?? current.status,
          notes: input.notes ?? null,
        },
      });
      if (input.classId) await this.enroll(tx, centerId, id, input.classId);
      await this.audit(tx, centerId, auth.userId, 'student.updated', 'student', id);
      return presentStudent(await tx.student.findFirstOrThrow({ where: { id }, include: studentInclude }));
    }, auth.userId);
  }

  async archiveStudent(auth: AuthContext, id: string) {
    const centerId = this.adminCenter(auth);
    return this.prisma.withTenant(centerId, async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      const current = await tx.student.findFirst({ where: { id, deletedAt: null } });
      if (!current) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Élève introuvable.' });
      const now = new Date();
      await tx.student.update({ where: { id }, data: { status: 'INACTIVE', deletedAt: now } });
      await tx.classEnrollment.updateMany({ where: { studentId: id, deletedAt: null }, data: { deletedAt: now } });
      await tx.parentStudent.updateMany({ where: { studentId: id, deletedAt: null }, data: { deletedAt: now } });
      await this.audit(tx, centerId, auth.userId, 'student.archived', 'student', id);
      return { id, archived: true };
    }, auth.userId);
  }

  async parents(auth: AuthContext, query?: string) {
    const centerId = this.adminCenter(auth);
    return this.prisma.withTenant(centerId, async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      const memberships = await tx.centerMembership.findMany({
        where: {
          deletedAt: null,
          role: 'PARENT',
          ...(query
            ? {
                user: {
                  OR: [
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                  ],
                },
              }
            : {}),
        },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      const links = await tx.parentStudent.findMany({
        where: { deletedAt: null, parentUserId: { in: memberships.map((membership) => membership.userId) } },
        include: { student: true },
      });
      return {
        items: memberships.map((membership) => ({
          id: membership.userId,
          firstName: membership.user.firstName,
          lastName: membership.user.lastName,
          email: membership.user.email,
          phone: membership.user.phone,
          status: membership.status,
          children: links
            .filter((link) => link.parentUserId === membership.userId && !link.student.deletedAt)
            .map((link) => ({
              linkId: link.id,
              studentId: link.studentId,
              studentName: `${link.student.firstName} ${link.student.lastName}`,
              relationship: link.relationship,
              canRequestPickup: link.canRequestPickup,
            })),
        })),
      };
    }, auth.userId);
  }

  async createParent(auth: AuthContext, input: ParentWrite) {
    return this.saveAccount(auth, input, 'PARENT');
  }

  async updateParent(auth: AuthContext, userId: string, input: ParentWrite) {
    return this.saveAccount(auth, input, 'PARENT', userId);
  }

  async linkParent(auth: AuthContext, input: ParentLinkWrite) {
    const centerId = this.adminCenter(auth);
    return this.prisma.withTenant(centerId, async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      const parent = await tx.centerMembership.findFirst({
        where: { userId: input.parentUserId, role: 'PARENT', deletedAt: null, status: 'ACTIVE' },
      });
      const student = await tx.student.findFirst({ where: { id: input.studentId, deletedAt: null } });
      if (!parent || !student) throw new NotFoundException({ code: 'LINK_TARGET_NOT_FOUND', message: 'Parent ou élève introuvable.' });
      const existing = await tx.parentStudent.findFirst({ where: { parentUserId: input.parentUserId, studentId: input.studentId } });
      const data = { relationship: input.relationship, canRequestPickup: input.canRequestPickup ?? true, deletedAt: null };
      const link = existing
        ? await tx.parentStudent.update({ where: { id: existing.id }, data })
        : await tx.parentStudent.create({ data: { centerId, parentUserId: input.parentUserId, studentId: input.studentId, ...data } });
      await this.audit(tx, centerId, auth.userId, 'parent.linked', 'parent_student', link.id);
      return { id: link.id };
    }, auth.userId);
  }

  async unlinkParent(auth: AuthContext, id: string) {
    const centerId = this.adminCenter(auth);
    return this.prisma.withTenant(centerId, async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      const link = await tx.parentStudent.findFirst({ where: { id, deletedAt: null } });
      if (!link) throw new NotFoundException({ code: 'LINK_NOT_FOUND', message: 'Lien introuvable.' });
      await tx.parentStudent.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.audit(tx, centerId, auth.userId, 'parent.unlinked', 'parent_student', id);
      return { id, removed: true };
    }, auth.userId);
  }

  async teachers(auth: AuthContext, query?: string) {
    const centerId = this.adminCenter(auth);
    return this.prisma.withTenant(centerId, async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      const memberships = await tx.centerMembership.findMany({
        where: {
          deletedAt: null,
          role: 'TEACHER',
          ...(query
            ? {
                user: {
                  OR: [
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                  ],
                },
              }
            : {}),
        },
        include: { user: true },
        take: 100,
      });
      const assignments = await tx.classTeacher.findMany({
        where: { deletedAt: null, teacherUserId: { in: memberships.map((membership) => membership.userId) } },
        include: { class: true },
      });
      return {
        items: memberships.map((membership) => ({
          id: membership.userId,
          firstName: membership.user.firstName,
          lastName: membership.user.lastName,
          email: membership.user.email,
          phone: membership.user.phone,
          status: membership.status,
          classes: assignments
            .filter((assignment) => assignment.teacherUserId === membership.userId && !assignment.class.deletedAt)
            .map((assignment) => ({ assignmentId: assignment.id, classId: assignment.classId, name: assignment.class.name })),
        })),
      };
    }, auth.userId);
  }

  async createTeacher(auth: AuthContext, input: TeacherWrite) {
    return this.saveAccount(auth, input, 'TEACHER');
  }

  async updateTeacher(auth: AuthContext, userId: string, input: TeacherWrite) {
    return this.saveAccount(auth, input, 'TEACHER', userId);
  }

  async assignTeacher(auth: AuthContext, classId: string, teacherUserId: string) {
    const centerId = this.adminCenter(auth);
    return this.prisma.withTenant(centerId, async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      await this.requireClass(tx, classId);
      const teacher = await tx.centerMembership.findFirst({
        where: { userId: teacherUserId, role: 'TEACHER', status: 'ACTIVE', deletedAt: null },
      });
      if (!teacher) throw new NotFoundException({ code: 'TEACHER_NOT_FOUND', message: 'Enseignant introuvable.' });
      const existing = await tx.classTeacher.findFirst({ where: { classId, teacherUserId } });
      const row = existing
        ? await tx.classTeacher.update({ where: { id: existing.id }, data: { deletedAt: null } })
        : await tx.classTeacher.create({ data: { centerId, classId, teacherUserId } });
      await this.audit(tx, centerId, auth.userId, 'teacher.assigned', 'class_teacher', row.id);
      return { id: row.id };
    }, auth.userId);
  }

  async unassignTeacher(auth: AuthContext, id: string) {
    const centerId = this.adminCenter(auth);
    return this.prisma.withTenant(centerId, async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      const found = await tx.classTeacher.findFirst({ where: { id, deletedAt: null } });
      if (!found) throw new NotFoundException({ code: 'TEACHER_ASSIGNMENT_NOT_FOUND', message: 'Affectation introuvable.' });
      await tx.classTeacher.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.audit(tx, centerId, auth.userId, 'teacher.unassigned', 'class_teacher', id);
      return { id, removed: true };
    }, auth.userId);
  }

  async classes(auth: AuthContext, query?: { q?: string; status?: string }) {
    const status = this.status(query?.status, ['ACTIVE', 'ARCHIVED']);
    return this.read(auth, ['CENTER_ADMIN', 'RECEPTION', 'TEACHER'], async (tx, broad) => {
      const rows = await tx.class.findMany({
        where: {
          deletedAt: null,
          ...(status ? { status } : {}),
          ...(broad ? {} : { teachers: { some: { teacherUserId: auth.userId, deletedAt: null } } }),
          ...(query?.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
        },
        include: classInclude,
        orderBy: { name: 'asc' },
        take: 100,
      });
      return rows.map(presentClass);
    });
  }

  async createClass(auth: AuthContext, input: ClassWrite) {
    const centerId = this.adminCenter(auth);
    return this.prisma.withTenant(centerId, async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      const created = await tx.class.create({
        data: { centerId, name: input.name, subject: input.subject ?? null, room: input.room ?? null },
        include: classInclude,
      });
      await this.audit(tx, centerId, auth.userId, 'class.created', 'class', created.id);
      return presentClass(created);
    }, auth.userId);
  }

  async updateClass(auth: AuthContext, id: string, input: ClassWrite) {
    const centerId = this.adminCenter(auth);
    return this.prisma.withTenant(centerId, async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      await this.requireClass(tx, id, true);
      const updated = await tx.class.update({
        where: { id },
        data: { name: input.name, subject: input.subject ?? null, room: input.room ?? null },
        include: classInclude,
      });
      await this.audit(tx, centerId, auth.userId, 'class.updated', 'class', id);
      return presentClass(updated);
    }, auth.userId);
  }

  async archiveClass(auth: AuthContext, id: string) {
    const centerId = this.adminCenter(auth);
    return this.prisma.withTenant(centerId, async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      await this.requireClass(tx, id, true);
      await tx.class.update({ where: { id }, data: { status: 'ARCHIVED' } });
      await this.audit(tx, centerId, auth.userId, 'class.archived', 'class', id);
      return { id, archived: true };
    }, auth.userId);
  }

  async enrollStudent(auth: AuthContext, classId: string, studentId: string) {
    const centerId = this.adminCenter(auth);
    return this.prisma.withTenant(centerId, async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      const row = await this.enroll(tx, centerId, studentId, classId);
      await this.audit(tx, centerId, auth.userId, 'student.enrolled', 'class_enrollment', row.id);
      return { id: row.id };
    }, auth.userId);
  }

  async unenroll(auth: AuthContext, id: string) {
    const centerId = this.adminCenter(auth);
    return this.prisma.withTenant(centerId, async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      const found = await tx.classEnrollment.findFirst({ where: { id, deletedAt: null } });
      if (!found) throw new NotFoundException({ code: 'ENROLLMENT_NOT_FOUND', message: 'Inscription introuvable.' });
      await tx.classEnrollment.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.audit(tx, centerId, auth.userId, 'student.unenrolled', 'class_enrollment', id);
      return { id, removed: true };
    }, auth.userId);
  }

  async schedules(auth: AuthContext) {
    return this.read(auth, ['CENTER_ADMIN', 'RECEPTION', 'TEACHER'], async (tx, broad) => {
      const rows = await tx.classSchedule.findMany({
        where: {
          deletedAt: null,
          ...(broad ? {} : { class: { teachers: { some: { teacherUserId: auth.userId, deletedAt: null } } } }),
        },
        include: { class: { include: { teachers: { where: { deletedAt: null }, include: { teacher: true } } } } },
        orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
        take: 200,
      });
      return rows.map((row) => this.presentSchedule(row));
    });
  }

  async createSchedule(auth: AuthContext, input: ScheduleWrite) {
    return this.saveSchedule(auth, input);
  }

  async updateSchedule(auth: AuthContext, id: string, input: ScheduleWrite) {
    return this.saveSchedule(auth, input, id);
  }

  async deleteSchedule(auth: AuthContext, id: string) {
    const centerId = this.adminCenter(auth);
    return this.prisma.withTenant(centerId, async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      const schedule = await tx.classSchedule.findFirst({ where: { id, deletedAt: null } });
      if (!schedule) throw new NotFoundException({ code: 'SCHEDULE_NOT_FOUND', message: 'Horaire introuvable.' });
      const used = await tx.classSession.count({ where: { scheduleId: id, deletedAt: null } });
      if (used > 0) {
        throw new ConflictException({ code: 'SCHEDULE_IN_USE', message: 'Cet horaire a déjà des séances. Il est conservé.' });
      }
      await tx.classSchedule.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.audit(tx, centerId, auth.userId, 'schedule.deleted', 'class_schedule', id);
      return { id, deleted: true };
    }, auth.userId);
  }

  private async saveSchedule(auth: AuthContext, input: ScheduleWrite, id?: string) {
    const centerId = this.adminCenter(auth);
    return this.prisma.withTenant(centerId, async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      const course = await tx.class.findFirst({
        where: { id: input.classId, deletedAt: null, status: 'ACTIVE' },
        include: { teachers: { where: { deletedAt: null }, select: { teacherUserId: true } } },
      });
      if (!course) throw new NotFoundException({ code: 'CLASS_NOT_FOUND', message: 'Classe introuvable.' });
      if (id) {
        const current = await tx.classSchedule.findFirst({ where: { id, deletedAt: null } });
        if (!current) throw new NotFoundException({ code: 'SCHEDULE_NOT_FOUND', message: 'Horaire introuvable.' });
      }
      const rows = await tx.classSchedule.findMany({
        where: { deletedAt: null },
        include: { class: { include: { teachers: { where: { deletedAt: null }, select: { teacherUserId: true } } } } },
        take: 500,
      });
      const conflict = scheduleConflict(
        {
          id: id ?? '',
          classId: input.classId,
          weekday: input.weekday,
          startTime: input.startTime,
          endTime: input.endTime,
          effectiveFrom: input.effectiveFrom,
          effectiveUntil: input.effectiveUntil ?? null,
          teacherIds: course.teachers.map((teacher) => teacher.teacherUserId),
        },
        rows.map((row) => ({
          id: row.id,
          classId: row.classId,
          weekday: row.weekday,
          startTime: row.startTime,
          endTime: row.endTime,
          effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
          effectiveUntil: row.effectiveUntil ? row.effectiveUntil.toISOString().slice(0, 10) : null,
          teacherIds: row.class.teachers.map((teacher) => teacher.teacherUserId),
        })),
      );
      if (conflict) {
        throw new ConflictException({
          code: 'SCHEDULE_CONFLICT',
          message: conflict === 'class'
            ? 'Cet horaire chevauche un autre créneau de la classe.'
            : 'Un enseignant de cette classe a déjà un créneau à cette heure.',
        });
      }
      const data = {
        classId: input.classId,
        weekday: input.weekday,
        startTime: input.startTime,
        endTime: input.endTime,
        effectiveFrom: this.day(input.effectiveFrom),
        effectiveUntil: input.effectiveUntil ? this.day(input.effectiveUntil) : null,
      };
      const saved = id
        ? await tx.classSchedule.update({ where: { id }, data, include: { class: { include: { teachers: { where: { deletedAt: null }, include: { teacher: true } } } } } })
        : await tx.classSchedule.create({ data: { centerId, ...data }, include: { class: { include: { teachers: { where: { deletedAt: null }, include: { teacher: true } } } } } });
      await this.audit(tx, centerId, auth.userId, id ? 'schedule.updated' : 'schedule.created', 'class_schedule', saved.id);
      return this.presentSchedule(saved);
    }, auth.userId);
  }

  private async saveAccount(auth: AuthContext, input: ParentWrite | TeacherWrite, role: 'PARENT' | 'TEACHER', userId?: string) {
    const centerId = this.adminCenter(auth);
    const passwordHash = 'password' in input && input.password ? await this.passwords.hash(input.password) : null;
    return this.prisma.withPlatformAccess(async (tx) => {
      await this.assertAdmin(tx, auth.userId, centerId);
      const membership = userId
        ? await tx.centerMembership.findFirst({ where: { userId, centerId, role, deletedAt: null }, include: { user: true } })
        : null;
      if (userId && !membership) throw new NotFoundException({ code: 'ACCOUNT_NOT_FOUND', message: 'Compte introuvable dans ce centre.' });
      let account = membership?.user ?? (await tx.user.findFirst({ where: { email: input.email, deletedAt: null } }));
      const linkedExisting = !userId && Boolean(account);
      if (!userId && account) {
        const sameRole = await tx.centerMembership.findFirst({ where: { userId: account.id, centerId, role, deletedAt: null } });
        if (sameRole?.status === 'ACTIVE') {
          throw new ConflictException({ code: 'MEMBERSHIP_EXISTS', message: 'Ce compte est déjà rattaché au centre.' });
        }
      }
      if (!account) {
        if (!passwordHash) throw new BadRequestException({ code: 'VALIDATION', message: 'Mot de passe requis.' });
        account = await tx.user.create({
          data: {
            email: input.email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone ?? null,
            status: 'ACTIVE',
            locale: 'fr',
          },
        });
      } else if (userId) {
        account = await tx.user.update({
          where: { id: account.id },
          data: { firstName: input.firstName, lastName: input.lastName, phone: input.phone ?? null },
        });
      }
      const status = 'status' in input && input.status ? input.status : 'ACTIVE';
      const current = await tx.centerMembership.findFirst({ where: { userId: account.id, centerId, role, deletedAt: null } });
      if (current) await tx.centerMembership.update({ where: { id: current.id }, data: { status } });
      else await tx.centerMembership.create({ data: { centerId, userId: account.id, role, status: 'ACTIVE' } });
      await this.audit(tx, centerId, auth.userId, userId ? `${role.toLowerCase()}.updated` : `${role.toLowerCase()}.created`, 'user', account.id);
      return { id: account.id, email: account.email, linkedExisting };
    });
  }

  private async enroll(tx: Tx, centerId: string, studentId: string, classId: string) {
    const student = await tx.student.findFirst({ where: { id: studentId, deletedAt: null } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Élève introuvable.' });
    await this.requireClass(tx, classId);
    const existing = await tx.classEnrollment.findFirst({ where: { classId, studentId } });
    if (existing) return tx.classEnrollment.update({ where: { id: existing.id }, data: { deletedAt: null } });
    return tx.classEnrollment.create({ data: { centerId, classId, studentId } });
  }

  private async requireClass(tx: Tx, id: string, allowArchived = false) {
    const course = await tx.class.findFirst({ where: { id, deletedAt: null, ...(allowArchived ? {} : { status: 'ACTIVE' }) } });
    if (!course) throw new NotFoundException({ code: 'CLASS_NOT_FOUND', message: 'Classe introuvable.' });
    return course;
  }

  private async read<T>(auth: AuthContext, roles: Role[], load: (tx: Tx, broad: boolean) => Promise<T[]>) {
    const scopes = this.scopes(auth, roles);
    const items: T[] = [];
    for (const scope of scopes) {
      items.push(...(await this.prisma.withTenant(scope.centerId, (tx) => load(tx, scope.broad), auth.userId)));
    }
    return { items };
  }

  private scopes(auth: AuthContext, roles: Role[]) {
    const centers = [...new Set(auth.centers.filter((center) => roles.includes(center.role as Role)).map((center) => center.centerId))];
    if (centers.length === 0) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Action non autorisée.' });
    return centers.map((centerId) => ({
      centerId,
      broad: auth.centers.some((center) => center.centerId === centerId && (center.role === 'CENTER_ADMIN' || center.role === 'RECEPTION')),
    }));
  }

  private adminCenter(auth: AuthContext): string {
    const centers = [...new Set(auth.centers.filter((center) => center.role === 'CENTER_ADMIN').map((center) => center.centerId))];
    if (centers.length === 1) return centers[0] ?? '';
    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Action non autorisée.' });
  }

  private async assertAdmin(tx: Tx, userId: string, centerId: string) {
    const membership = await tx.centerMembership.findFirst({
      where: { userId, centerId, role: 'CENTER_ADMIN', status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Action non autorisée.' });
  }

  private async teacherClassIds(tx: Tx, userId: string, broad: boolean) {
    if (broad) return null;
    const rows = await tx.classTeacher.findMany({ where: { teacherUserId: userId, deletedAt: null }, select: { classId: true } });
    return rows.map((row) => row.classId);
  }

  private status<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
    if (!value) return undefined;
    if ((allowed as readonly string[]).includes(value)) return value as T;
    throw new BadRequestException({ code: 'VALIDATION', message: 'Statut inconnu.' });
  }

  private day(value: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException({ code: 'VALIDATION', message: 'Date invalide.' });
    }
    return date;
  }

  private presentSchedule(row: {
    id: string;
    classId: string;
    weekday: string;
    startTime: string;
    endTime: string;
    effectiveFrom: Date;
    effectiveUntil: Date | null;
    class: { name: string; teachers: { id: string; teacher: { firstName: string; lastName: string } }[] };
  }) {
    return {
      id: row.id,
      classId: row.classId,
      className: row.class.name,
      weekday: row.weekday,
      startTime: row.startTime,
      endTime: row.endTime,
      effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
      effectiveUntil: row.effectiveUntil ? row.effectiveUntil.toISOString().slice(0, 10) : null,
      teachers: row.class.teachers.map((teacher) => `${teacher.teacher.firstName} ${teacher.teacher.lastName}`),
    };
  }

  private audit(tx: Tx, centerId: string, actorUserId: string, action: string, entityType: string, entityId: string) {
    return tx.auditLog.create({ data: { centerId, actorUserId, action, entityType, entityId } });
  }
}

const studentInclude = {
  classEnrollments: { where: { deletedAt: null }, include: { class: true } },
  parents: { where: { deletedAt: null }, include: { parent: true } },
} satisfies Prisma.StudentInclude;

const classInclude = {
  enrollments: { where: { deletedAt: null }, include: { student: true } },
  teachers: { where: { deletedAt: null }, include: { teacher: true } },
} satisfies Prisma.ClassInclude;

function presentStudent(student: Prisma.StudentGetPayload<{ include: typeof studentInclude }>) {
  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    status: student.status,
    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().slice(0, 10) : null,
    notes: student.notes,
    classes: student.classEnrollments.filter((enrollment) => !enrollment.class.deletedAt).map((enrollment) => ({
      enrollmentId: enrollment.id,
      id: enrollment.class.id,
      name: enrollment.class.name,
    })),
    parents: student.parents.map((link) => ({
      linkId: link.id,
      id: link.parentUserId,
      name: `${link.parent.firstName} ${link.parent.lastName}`,
      email: link.parent.email,
      phone: link.parent.phone,
      relationship: link.relationship,
      canRequestPickup: link.canRequestPickup,
    })),
  };
}

function presentClass(course: Prisma.ClassGetPayload<{ include: typeof classInclude }>) {
  return {
    id: course.id,
    name: course.name,
    subject: course.subject,
    room: course.room,
    status: course.status,
    students: course.enrollments.filter((enrollment) => !enrollment.student.deletedAt).map((enrollment) => ({
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      name: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
    })),
    teachers: course.teachers.map((assignment) => ({
      assignmentId: assignment.id,
      teacherUserId: assignment.teacherUserId,
      name: `${assignment.teacher.firstName} ${assignment.teacher.lastName}`,
    })),
  };
}
