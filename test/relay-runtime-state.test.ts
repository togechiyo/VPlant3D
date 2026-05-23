import { describe, expect, it } from 'vitest';

import {
  createRelayRuntimeState,
  shouldDiscardRelayRuntimeState,
} from '../src/relay/runtime-state';
import type { RelayRuntimeState } from '../src/relay/messages';

describe('relay runtime state', () => {
  it('discards stale runtime frames', () => {
    const state = createRuntimeState(2, 1000, 0.8, 0.6);

    expect(
      shouldDiscardRelayRuntimeState(
        state,
        {
          lastSequence: 1,
          lastSentAt: 999,
        },
        1301,
      ),
    ).toBe(true);
  });

  it('discards older sequence and timestamp frames', () => {
    const state = createRuntimeState(2, 1000, 0.8, 0.6);

    expect(
      shouldDiscardRelayRuntimeState(
        state,
        {
          lastSequence: 3,
          lastSentAt: 1001,
        },
        1010,
      ),
    ).toBe(true);
  });

  it('keeps held expression values until a new runtime state changes them', () => {
    const state = createRelayRuntimeState(4, 1200, {
      expressions: {
        blinkLeft: 1,
        blinkRight: 0.95,
        aa: 0.8,
      },
      pose: createRuntimeState(4, 1200, 0, 0).pose,
    });

    expect(state.expressions).toMatchObject({
      blinkLeft: 1,
      blinkRight: 0.95,
      aa: 0.8,
    });
    expect(state.expressions.aa).not.toBe(0);
    expect(state.expressions.blinkLeft).not.toBe(0);
  });
});

function createRuntimeState(
  sequence: number,
  sentAt: number,
  headYaw: number,
  mouthOpen: number,
): RelayRuntimeState {
  return {
    sequence,
    sentAt,
    expressions: {
      aa: mouthOpen,
      blinkLeft: mouthOpen,
      blinkRight: mouthOpen,
    },
    pose: {
      head: {
        enabled: true,
        pitch: 0,
        yaw: headYaw,
        roll: 0,
      },
      upperBody: {
        enabled: true,
        chestYaw: 0.1,
        chestRoll: 0.2,
        neckYaw: 0.3,
        neckRoll: 0.4,
        leftUpperArmRoll: 0,
        rightUpperArmRoll: 0,
        leftLowerArmRoll: 0,
        rightLowerArmRoll: 0,
      },
      hands: {
        left: null,
        right: null,
      },
    },
  };
}
