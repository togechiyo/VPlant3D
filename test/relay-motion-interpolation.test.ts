import { describe, expect, it } from 'vitest';

import {
  interpolateRelayMotionState,
  sampleRelayMotionFrames,
  type RelayMotionFrame,
} from '../src/relay/motion-interpolation';
import type { RelayMotionState } from '../src/relay/messages';

describe('relay motion interpolation', () => {
  it('samples between two motion frames after the render delay', () => {
    const previous = createFrame(1000, createMotionState(1, 0, 0, 0));
    const current = createFrame(1100, createMotionState(2, 1, 0.5, 0.8));

    const sampled = sampleRelayMotionFrames(previous, current, 1130, 80);

    expect(sampled?.sequence).toBe(2);
    expect(sampled?.pose.head?.yaw).toBeCloseTo(0.5);
    expect(sampled?.pose.upperBody?.chestRoll).toBeCloseTo(0.25);
    expect(sampled?.expressions.aa).toBeCloseTo(0.8);
  });

  it('falls back to current motion when only one frame exists', () => {
    const current = createFrame(1100, createMotionState(2, 1, 0.5, 0.8));

    const sampled = sampleRelayMotionFrames(null, current, 1130, 80);

    expect(sampled).toEqual(current.state);
  });

  it('interpolates missing hand targets without dropping the detected side', () => {
    const previous = createMotionState(1, 0, 0, 0);
    const current = createMotionState(2, 0, 0, 0);
    current.pose.hands = {
      left: {
        fingers: {
          thumb: 0.2,
          index: 0.4,
          middle: 0.6,
          ring: 0.8,
          little: 1,
        },
        wristPitch: 0.1,
        wristYaw: 0.2,
        wristRoll: 0.3,
      },
      right: null,
    };

    const sampled = interpolateRelayMotionState(previous, current, 0.5);

    expect(sampled.pose.hands?.left?.fingers.middle).toBeCloseTo(0.6);
    expect(sampled.pose.hands?.right).toBeNull();
  });

  it('interpolates arm IK targets only when a motion frame includes them', () => {
    const previous = createMotionState(1, 0, 0, 0);
    const current = createMotionState(2, 0, 0, 0);
    current.pose.arms = {
      left: {
        enabled: true,
        side: 'left',
        shoulder: { x: 0.5, y: 0, z: 0 },
        elbow: { x: 0.8, y: -0.5, z: 0 },
        wrist: { x: 1.1, y: -1, z: 0 },
        pole: { x: 0.3, y: -0.5, z: 0 },
        confidence: 0.9,
      },
      right: null,
    };

    const sampled = interpolateRelayMotionState(previous, current, 0.5);

    expect(sampled.pose.arms?.left?.wrist.y).toBeCloseTo(-1);
    expect(sampled.pose.arms?.left?.confidence).toBeCloseTo(0.9);
    expect(sampled.pose.arms?.right).toBeNull();
  });

  it('leaves arm IK undefined for legacy motion frames without arm payloads', () => {
    const previous = createMotionState(1, 0, 0, 0);
    const current = createMotionState(2, 0, 0, 0);

    const sampled = interpolateRelayMotionState(previous, current, 0.5);

    expect(sampled.pose.arms).toBeUndefined();
  });

  it('holds head and body pose instead of interpolating toward neutral during brief tracking loss', () => {
    const previous = createMotionState(1, 0.8, 0.4, 0);
    const current = createMotionState(2, 0, 0, 0);
    current.pose.head = {
      enabled: false,
      pitch: 0,
      yaw: 0,
      roll: 0,
    };
    current.pose.upperBody = {
      enabled: false,
      chestYaw: 0,
      chestRoll: 0,
      neckYaw: 0,
      neckRoll: 0,
      leftUpperArmRoll: 0,
      rightUpperArmRoll: 0,
      leftLowerArmRoll: 0,
      rightLowerArmRoll: 0,
    };

    const sampled = interpolateRelayMotionState(previous, current, 0.5);

    expect(sampled.pose.head).toEqual(previous.pose.head);
    expect(sampled.pose.upperBody).toEqual(previous.pose.upperBody);
  });
});

function createFrame(receivedAt: number, state: RelayMotionState): RelayMotionFrame {
  return {
    receivedAt,
    state,
  };
}

function createMotionState(
  sequence: number,
  headYaw: number,
  chestRoll: number,
  mouthOpen: number,
): RelayMotionState {
  return {
    sequence,
    sentAt: 1000 + sequence,
    expressions: {
      aa: mouthOpen,
      blinkLeft: headYaw,
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
        chestYaw: 0,
        chestRoll,
        neckYaw: 0,
        neckRoll: 0,
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
