import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(160),
  password: z.string().min(8).max(128),
});

export const refreshSessionSchema = z.object({
  refreshToken: z.string().min(20).max(500),
});

export const logoutSchema = refreshSessionSchema;

export type LoginPayload = z.infer<typeof loginSchema>;
export type RefreshSessionPayload = z.infer<typeof refreshSessionSchema>;
