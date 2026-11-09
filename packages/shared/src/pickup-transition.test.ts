import { describe, expect, it } from 'vitest';
import {
  ACTIVE_PICKUP_STATUSES,
  PICKUP_STATUSES,
  PICKUP_TRANSITION_RULES,
  PickupTransitionError,
  TERMINAL_PICKUP_STATUSES,
  TRANSITION_ACTORS,
  assertCanDelayPreparation,
  assertPickupTransition,
  type PickupStatus,
  type TransitionActor,
} from './pickup-transition.js';

const SPEC_EDGES: ReadonlyArray<readonly [PickupStatus, PickupStatus]> = [
  ['PENDING', 'SCHEDULED'],
  ['PENDING', 'NOTIFIED'],
  ['SCHEDULED', 'NOTIFIED'],
  ['NOTIFIED', 'PREPARING'],
  ['PREPARING', 'READY'],
  ['READY', 'HANDED_OVER'],
  ...ACTIVE_PICKUP_STATUSES.map((status) => [status, 'CANCELLED'] as const),
  ...ACTIVE_PICKUP_STATUSES.map((status) => [status, 'REJECTED'] as const),
  ...ACTIVE_PICKUP_STATUSES.map((status) => [status, 'EXPIRED'] as const),
];

function edgeKey(from: PickupStatus, to: PickupStatus): string {
  return `${from}->${to}`;
}

function isActive(status: PickupStatus): boolean {
  return (ACTIVE_PICKUP_STATUSES as readonly PickupStatus[]).includes(status);
}

function isTerminal(status: PickupStatus): boolean {
  return (TERMINAL_PICKUP_STATUSES as readonly PickupStatus[]).includes(status);
}

/** Independent reading of the pickup state machine in the product specification. */
function specificationAllows(
  from: PickupStatus,
  to: PickupStatus,
  actor: TransitionActor,
  pinVerified: boolean,
): boolean {
  if (isTerminal(from)) {
    return false;
  }

  if (actor === 'SYSTEM' && (to === 'PREPARING' || to === 'READY' || to === 'HANDED_OVER')) {
    return false;
  }

  if (to === 'CANCELLED') {
    return isActive(from) && ['PARENT', 'TEACHER', 'RECEPTION', 'CENTER_ADMIN'].includes(actor);
  }

  if (to === 'REJECTED') {
    return isActive(from) && ['TEACHER', 'RECEPTION', 'CENTER_ADMIN'].includes(actor);
  }

  if (to === 'EXPIRED') {
    return isActive(from) && actor === 'SYSTEM';
  }

  if (from === 'PENDING' && (to === 'SCHEDULED' || to === 'NOTIFIED')) {
    return actor === 'SYSTEM' || actor === 'CENTER_ADMIN';
  }

  if (from === 'SCHEDULED' && to === 'NOTIFIED') {
    return actor === 'SYSTEM' || actor === 'CENTER_ADMIN';
  }

  if (from === 'NOTIFIED' && to === 'PREPARING') {
    return actor === 'TEACHER' || actor === 'CENTER_ADMIN';
  }

  if (from === 'PREPARING' && to === 'READY') {
    return actor === 'TEACHER' || actor === 'CENTER_ADMIN';
  }

  if (from === 'READY' && to === 'HANDED_OVER') {
    return (
      pinVerified && (actor === 'TEACHER' || actor === 'RECEPTION' || actor === 'CENTER_ADMIN')
    );
  }

  return false;
}

function errorCode(run: () => void): PickupTransitionError['code'] | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    if (error instanceof PickupTransitionError) {
      return error.code;
    }
    throw error;
  }
}

describe('pickup state machine', () => {
  it('exposes only the transitions named in the specification', () => {
    expect(PICKUP_TRANSITION_RULES.map((rule) => edgeKey(rule.from, rule.to)).sort()).toEqual(
      SPEC_EDGES.map(([from, to]) => edgeKey(from, to)).sort(),
    );
  });

  it('accepts permitted transitions and rejects every other combination', () => {
    for (const from of PICKUP_STATUSES) {
      for (const to of PICKUP_STATUSES) {
        for (const actor of TRANSITION_ACTORS) {
          for (const pinVerified of [false, true]) {
            const label = `${actor} ${from} -> ${to} pin=${pinVerified}`;
            const run = () => assertPickupTransition({ from, to, actor, pinVerified });
            if (specificationAllows(from, to, actor, pinVerified)) {
              expect(run, label).not.toThrow();
            } else {
              expect(run, label).toThrow(PickupTransitionError);
            }
          }
        }
      }
    }
  });

  it('blocks the scheduler from preparing, readying, or releasing a student', () => {
    for (const from of ACTIVE_PICKUP_STATUSES) {
      for (const to of ['PREPARING', 'READY', 'HANDED_OVER'] as const) {
        expect(
          errorCode(() =>
            assertPickupTransition({ from, to, actor: 'SYSTEM', pinVerified: true }),
          ),
        ).toBe('AUTOMATIC_RELEASE_FORBIDDEN');
      }
    }
  });

  it('requires a verified one-time PIN and an authorized staff member for handover', () => {
    expect(
      errorCode(() =>
        assertPickupTransition({
          from: 'READY',
          to: 'HANDED_OVER',
          actor: 'RECEPTION',
          pinVerified: false,
        }),
      ),
    ).toBe('PIN_REQUIRED');

    expect(
      errorCode(() =>
        assertPickupTransition({
          from: 'READY',
          to: 'HANDED_OVER',
          actor: 'PARENT',
          pinVerified: true,
        }),
      ),
    ).toBe('ACTOR_NOT_ALLOWED');

    expect(() =>
      assertPickupTransition({
        from: 'READY',
        to: 'HANDED_OVER',
        actor: 'TEACHER',
        pinVerified: true,
      }),
    ).not.toThrow();
  });

  it('keeps a delay as an operational note instead of a student release', () => {
    expect(() =>
      assertCanDelayPreparation({
        status: 'NOTIFIED',
        actor: 'TEACHER',
        reason: 'Élève encore en exercice',
      }),
    ).not.toThrow();

    expect(
      errorCode(() => assertCanDelayPreparation({ status: 'NOTIFIED', actor: 'TEACHER', reason: '  ' })),
    ).toBe('REASON_REQUIRED');

    expect(
      errorCode(() =>
        assertCanDelayPreparation({ status: 'NOTIFIED', actor: 'RECEPTION', reason: 'file' }),
      ),
    ).toBe('ACTOR_NOT_ALLOWED');

    expect(
      errorCode(() =>
        assertCanDelayPreparation({ status: 'READY', actor: 'TEACHER', reason: 'trop tard' }),
      ),
    ).toBe('TRANSITION_NOT_ALLOWED');
  });
});
