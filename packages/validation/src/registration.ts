import { z } from 'zod';

const email = z
  .string()
  .trim()
  .max(160)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Adresse e-mail invalide.')
  .transform((value) => value.toLowerCase());
const phone = z.string().trim().min(8).max(30);
const personName = z.string().trim().min(1).max(80);

export const registerCenterSchema = z
  .object({
    centerName: z.string().trim().min(2).max(120),
    centerEmail: email,
    centerPhone: phone,
    city: z.string().trim().min(2).max(80),
    addressLine: z.string().trim().max(180).optional(),
    firstName: personName,
    lastName: personName,
    email,
    phone: phone.optional(),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Les mots de passe ne correspondent pas.',
  });

export const rejectCenterSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export type RegisterCenterPayload = z.infer<typeof registerCenterSchema>;
export type RejectCenterPayload = z.infer<typeof rejectCenterSchema>;
