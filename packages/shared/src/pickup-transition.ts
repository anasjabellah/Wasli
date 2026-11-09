export const PICKUP_STATUSES = [
  'PENDING',
  'SCHEDULED',
  'NOTIFIED',
  'PREPARING',
  'READY',
  'HANDED_OVER',
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
] as const;

export type PickupStatus = (typeof PICKUP_STATUSES)[number];

export const ACTIVE_PICKUP_STATUSES = [
  'PENDING',
  'SCHEDULED',
  'NOTIFIED',
  'PREPARING',
  'READY',
] as const satisfies readonly PickupStatus[];

export const TERMINAL_PICKUP_STATUSES = [
  'HANDED_OVER',
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
] as const satisfies readonly PickupStatus[];

export const TRANSITION_ACTORS = [
  'SYSTEM',
  'PARENT',
  'TEACHER',
  'RECEPTION',
  'CENTER_ADMIN',
] as const;

export type TransitionActor = (typeof TRANSITION_ACTORS)[number];

export type PickupTransitionCode =
  | 'TERMINAL_STATE'
  | 'TRANSITION_NOT_ALLOWED'
  | 'ACTOR_NOT_ALLOWED'
  | 'PIN_REQUIRED'
  | 'AUTOMATIC_RELEASE_FORBIDDEN'
  | 'REASON_REQUIRED';

export class PickupTransitionError extends Error {
  readonly code: PickupTransitionCode;

  constructor(code: PickupTransitionCode, message: string) {
    super(message);
    this.name = 'PickupTransitionError';
    this.code = code;
  }
}

const STAFF_HANDOVER = ['TEACHER', 'RECEPTION', 'CENTER_ADMIN'] as const satisfies readonly TransitionActor[];
const CANCEL_ACTORS = ['PARENT', 'TEACHER', 'RECEPTION', 'CENTER_ADMIN'] as const satisfies readonly TransitionActor[];
const REJECT_ACTORS = ['TEACHER', 'RECEPTION', 'CENTER_ADMIN'] as const satisfies readonly TransitionActor[];
const SCHEDULE_ACTORS = ['SYSTEM', 'CENTER_ADMIN'] as const satisfies readonly TransitionActor[];
const PREPARE_ACTORS = ['TEACHER', 'CENTER_ADMIN'] as const satisfies readonly TransitionActor[];

export type PickupTransitionRule = {
  from: PickupStatus;
  to: PickupStatus;
  actors: readonly TransitionActor[];
  requiresPin: boolean;
};

function rule(
  from: PickupStatus,
  to: PickupStatus,
  actors: readonly TransitionActor[],
  requiresPin = false,
): PickupTransitionRule {
  return { from, to, actors, requiresPin };
}

export const PICKUP_TRANSITION_RULES: readonly PickupTransitionRule[] = [
  rule('PENDING', 'SCHEDULED', SCHEDULE_ACTORS),
  rule('PENDING', 'NOTIFIED', SCHEDULE_ACTORS),
  rule('SCHEDULED', 'NOTIFIED', SCHEDULE_ACTORS),
  rule('NOTIFIED', 'PREPARING', PREPARE_ACTORS),
  rule('PREPARING', 'READY', PREPARE_ACTORS),
  rule('READY', 'HANDED_OVER', STAFF_HANDOVER, true),
  ...ACTIVE_PICKUP_STATUSES.map((from) => rule(from, 'CANCELLED', CANCEL_ACTORS)),
  ...ACTIVE_PICKUP_STATUSES.map((from) => rule(from, 'REJECTED', REJECT_ACTORS)),
  ...ACTIVE_PICKUP_STATUSES.map((from) => rule(from, 'EXPIRED', ['SYSTEM'])),
];

const RELEASE_STATES = new Set<PickupStatus>(['PREPARING', 'READY', 'HANDED_OVER']);

export type PickupTransitionInput = {
  from: PickupStatus;
  to: PickupStatus;
  actor: TransitionActor;
  pinVerified?: boolean;
};

export function assertPickupTransition(input: PickupTransitionInput): void {
  if ((TERMINAL_PICKUP_STATUSES as readonly PickupStatus[]).includes(input.from)) {
    throw new PickupTransitionError('TERMINAL_STATE', `${input.from} is a terminal pickup state`);
  }

  if (input.actor === 'SYSTEM' && RELEASE_STATES.has(input.to)) {
    throw new PickupTransitionError(
      'AUTOMATIC_RELEASE_FORBIDDEN',
      'Scheduling can prioritize and notify, but it cannot prepare, mark ready, or release a student',
    );
  }

  const match = PICKUP_TRANSITION_RULES.find(
    (candidate) => candidate.from === input.from && candidate.to === input.to,
  );

  if (!match) {
    throw new PickupTransitionError(
      'TRANSITION_NOT_ALLOWED',
      `${input.from} cannot transition to ${input.to}`,
    );
  }

  if (!match.actors.includes(input.actor)) {
    throw new PickupTransitionError(
      'ACTOR_NOT_ALLOWED',
      `${input.actor} cannot perform ${input.from} -> ${input.to}`,
    );
  }

  if (match.requiresPin && input.pinVerified !== true) {
    throw new PickupTransitionError('PIN_REQUIRED', 'Handover requires a verified one-time PIN');
  }
}

export function assertCanDelayPreparation(input: {
  status: PickupStatus;
  actor: TransitionActor;
  reason: string;
}): void {
  if (input.actor !== 'TEACHER' && input.actor !== 'CENTER_ADMIN') {
    throw new PickupTransitionError('ACTOR_NOT_ALLOWED', 'Only a teacher can delay preparation');
  }

  if (input.status !== 'NOTIFIED' && input.status !== 'PREPARING') {
    throw new PickupTransitionError(
      'TRANSITION_NOT_ALLOWED',
      `Preparation cannot be delayed from ${input.status}`,
    );
  }

  if (input.reason.trim().length === 0) {
    throw new PickupTransitionError('REASON_REQUIRED', 'A delay reason is required');
  }
}
