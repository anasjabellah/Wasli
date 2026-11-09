import { describe, expect, it } from 'vitest';
import { PickupTransitionError } from '@wasli/shared';
import { PickupTransitionService } from './pickup-transition.service.js';

describe('PickupTransitionService', () => {
  const service = new PickupTransitionService();

  it('refuses automatic handover even when a PIN is present', () => {
    expect(() =>
      service.assert({ from: 'READY', to: 'HANDED_OVER', actor: 'SYSTEM', pinVerified: true }),
    ).toThrow(PickupTransitionError);
  });

  it('allows a teacher to mark an eligible student ready', () => {
    expect(() => service.assert({ from: 'PREPARING', to: 'READY', actor: 'TEACHER' })).not.toThrow();
  });
});
