import { z } from 'zod';

export const createPickupRequestSchema = z.object({
  studentId: z.string().uuid(),
});

export const cancelPickupRequestSchema = z.object({
  reason: z.string().trim().min(1).max(280).optional(),
});

export const rejectPickupRequestSchema = z.object({
  reason: z.string().trim().min(1).max(280),
});

export const delayPickupSchema = z.object({
  reason: z.string().trim().min(1).max(280),
});

export const verifyHandoverSchema = z.object({
  pin: z.string().regex(/^\d{4,8}$/),
});

export type CreatePickupRequestPayload = z.infer<typeof createPickupRequestSchema>;
export type CancelPickupRequestPayload = z.infer<typeof cancelPickupRequestSchema>;
export type RejectPickupRequestPayload = z.infer<typeof rejectPickupRequestSchema>;
export type DelayPickupPayload = z.infer<typeof delayPickupSchema>;
export type VerifyHandoverPayload = z.infer<typeof verifyHandoverSchema>;
