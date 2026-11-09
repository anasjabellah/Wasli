import type { PickupStatus } from '@wasli/shared';

export const STAGES = ['PENDING', 'SCHEDULED', 'NOTIFIED', 'PREPARING', 'READY', 'HANDED_OVER'] as const satisfies readonly PickupStatus[];

export const ACTIVE: PickupStatus[] = ['PENDING', 'SCHEDULED', 'NOTIFIED', 'PREPARING', 'READY'];

export const TERMINAL: PickupStatus[] = ['HANDED_OVER', 'CANCELLED', 'REJECTED', 'EXPIRED'];
