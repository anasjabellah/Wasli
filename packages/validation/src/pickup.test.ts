import { describe, expect, it } from 'vitest';
import { delayPreparationSchema, pickupTransitionSchema } from './pickup.js';

describe('pickup payloads', () => {
  it('accepts a staff handover payload', () => {
    expect(
      pickupTransitionSchema.parse({
        from: 'READY',
        to: 'HANDED_OVER',
        actor: 'RECEPTION',
        pinVerified: true,
      }),
    ).toMatchObject({ actor: 'RECEPTION' });
  });

  it('rejects an unknown status', () => {
    expect(pickupTransitionSchema.safeParse({ from: 'RELEASED', to: 'READY', actor: 'TEACHER' }).success).toBe(
      false,
    );
  });

  it('rejects a blank delay reason', () => {
    expect(
      delayPreparationSchema.safeParse({ status: 'NOTIFIED', actor: 'TEACHER', reason: '   ' }).success,
    ).toBe(false);
  });
});
