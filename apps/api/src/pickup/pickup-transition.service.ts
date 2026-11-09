import { Injectable } from '@nestjs/common';
import {
  assertCanDelayPreparation,
  assertPickupTransition,
  type PickupStatus,
  type PickupTransitionInput,
  type TransitionActor,
} from '@wasli/shared';

@Injectable()
export class PickupTransitionService {
  assert(input: PickupTransitionInput): void {
    assertPickupTransition(input);
  }

  assertDelay(input: { status: PickupStatus; actor: TransitionActor; reason: string }): void {
    assertCanDelayPreparation(input);
  }
}
