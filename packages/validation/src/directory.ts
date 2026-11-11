import { z } from 'zod';

const personName = z.string().trim().min(1, 'Nom requis.').max(80);
const email = z
  .string()
  .trim()
  .max(160)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Adresse e-mail invalide.')
  .transform((value) => value.toLowerCase());
const phone = z.string().trim().min(8, 'Numéro trop court.').max(30);
const notes = z.string().trim().max(500);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.');
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide.');
const weekday = z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);

export const studentWriteSchema = z.object({
  firstName: personName,
  lastName: personName,
  dateOfBirth: day.nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  notes: notes.nullable().optional(),
  classId: z.string().uuid().nullable().optional(),
});

export const parentWriteSchema = z.object({
  firstName: personName,
  lastName: personName,
  email,
  phone: phone.nullable().optional(),
  password: z.string().min(8, '8 caractères minimum.').max(128).optional(),
});

export const parentLinkSchema = z.object({
  parentUserId: z.string().uuid(),
  studentId: z.string().uuid(),
  relationship: z.enum(['MOTHER', 'FATHER', 'GUARDIAN', 'OTHER']),
  canRequestPickup: z.boolean().optional(),
});

export const teacherWriteSchema = z.object({
  firstName: personName,
  lastName: personName,
  email,
  phone: phone.nullable().optional(),
  password: z.string().min(8, '8 caractères minimum.').max(128).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const classWriteSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis.').max(80),
  subject: z.string().trim().max(80).nullable().optional(),
  room: z.string().trim().max(80).nullable().optional(),
});

export const teacherAssignmentSchema = z.object({
  classId: z.string().uuid(),
  teacherUserId: z.string().uuid(),
});

export const enrollmentSchema = z.object({
  classId: z.string().uuid(),
  studentId: z.string().uuid(),
});

export const scheduleWriteSchema = z
  .object({
    classId: z.string().uuid(),
    weekday,
    startTime: clock,
    endTime: clock,
    effectiveFrom: day,
    effectiveUntil: day.nullable().optional(),
  })
  .refine((value) => value.startTime < value.endTime, {
    path: ['endTime'],
    message: 'L’heure de fin doit être après l’heure de début.',
  })
  .refine((value) => !value.effectiveUntil || value.effectiveUntil >= value.effectiveFrom, {
    path: ['effectiveUntil'],
    message: 'La date de fin doit être après la date de début.',
  });

export type StudentWrite = z.infer<typeof studentWriteSchema>;
export type ParentWrite = z.infer<typeof parentWriteSchema>;
export type ParentLinkWrite = z.infer<typeof parentLinkSchema>;
export type TeacherWrite = z.infer<typeof teacherWriteSchema>;
export type ClassWrite = z.infer<typeof classWriteSchema>;
export type TeacherAssignment = z.infer<typeof teacherAssignmentSchema>;
export type EnrollmentWrite = z.infer<typeof enrollmentSchema>;
export type ScheduleWrite = z.infer<typeof scheduleWriteSchema>;
