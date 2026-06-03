import { describe, expect, it } from 'vitest';

import { createIdleArmPoseAdjustments } from '../src/vrm/idle-arm-pose';

describe('createIdleArmPoseAdjustments', () => {
  it('applies the VRM 1.0 idle arm adjustment with the opposite upper arm roll', () => {
    expect(createIdleArmPoseAdjustments('1')).toEqual([
      { bone: 'leftUpperArm', rotation: [0, 0, -1.12] },
      { bone: 'rightUpperArm', rotation: [0, 0, 1.12] },
      { bone: 'leftHand', rotation: [0, 0.03, 0] },
      { bone: 'rightHand', rotation: [0, -0.03, 0] },
    ]);
  });

  it('keeps the legacy VRM 0.x idle arm adjustment', () => {
    expect(createIdleArmPoseAdjustments('0')).toEqual([
      { bone: 'leftUpperArm', rotation: [0, 0, 1.12] },
      { bone: 'rightUpperArm', rotation: [0, 0, -1.12] },
      { bone: 'leftHand', rotation: [0, 0.03, 0] },
      { bone: 'rightHand', rotation: [0, -0.03, 0] },
    ]);
  });

  it('falls back to the legacy adjustment for unknown metadata', () => {
    expect(createIdleArmPoseAdjustments(undefined)).toHaveLength(4);
  });
});
