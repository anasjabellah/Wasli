import { z } from 'zod';
import { PICKUP_STATUSES, TRANSITION_ACTORS } from '@wasli/shared';

export const pickupTransitionSchema = z.object({
  from: z.enum(PICKUP_STATUSES),
  to: z.enum(PICKUP_STATUSES),
  actor: z.enum(TRANSITION_ACTORS),
  pinVerified: z.boolean().optional(),
});

export const delayPreparationSchema = z.object({
  status: z.enum(PICKUP_STATUSES),
  actor: z.enum(TRANSITION_ACTORS),
  reason: z.string().trim().min(1),
});

export type PickupTransitionPayload = z.infer<typeof pickupTransitionSchema>;
export type DelayPreparationPayload = z.infer<typeof delayPreparationSchema>;
