import { describe, expect, it } from 'vitest';

import {
  createNeutralRetargetPose,
  createUpperBodyRetargetPose,
  smoothUpperBodyRetargetPose,
} from '../src/mocap/upper-body-retarget';
import type { UpperBodyPoseSummary } from '../src/mocap/pose-landmarks';

describe('createUpperBodyRetargetPose', () => {
  it('returns disabled neutral pose when landmarks are missing', () => {
    const pose = createUpperBodyRetargetPose(createSummary({ poseDetected: false }));

    expect(pose).toEqual(createNeutralRetargetPose(false));
  });

  it('returns disabled neutral pose when upper-body visibility is low', () => {
    const pose = createUpperBodyRetargetPose(
      createSummary({
        averageUpperBodyVisibility: 0.2,
        shoulderTilt: 0.1,
        torsoLean: 0.1,
      }),
    );

    expect(pose).toEqual(createNeutralRetargetPose(false));
  });

  it('maps mirrored torso lean and shoulder tilt to responsive chest and neck motion', () => {
    const pose = createUpperBodyRetargetPose(
      createSummary({
        averageUpperBodyVisibility: 0.8,
        shoulderTilt: 0.06,
        torsoLean: -0.05,
      }),
    );

    expect(pose.enabled).toBe(true);
    expect(pose.chestYaw).toBeCloseTo(-0.12);
    expect(pose.leftUpperArmRoll).toBeCloseTo(0);
    expect(pose.rightUpperArmRoll).toBeCloseTo(0);
    expect(pose.chestRoll).toBeCloseTo(0.168);
    expect(pose.neckYaw).toBeCloseTo(-0.054);
    expect(pose.neckRoll).toBeCloseTo(0.0756);
  });

  it('can map motion without mirroring', () => {
    const pose = createUpperBodyRetargetPose(
      createSummary({
        averageUpperBodyVisibility: 0.8,
        shoulderTilt: 0.06,
        torsoLean: -0.05,
      }),
      {
        minVisibility: 0.32,
        mirrorInput: false,
        maxChestYaw: 0.26,
        maxChestRoll: 0.34,
        maxNeckYaw: 0.12,
        maxNeckRoll: 0.15,
        maxArmRoll: 0.58,
      },
    );

    expect(pose.chestYaw).toBeCloseTo(0.12);
    expect(pose.chestRoll).toBeCloseTo(-0.168);
  });

  it('adds a subtle torso turn from shoulder depth', () => {
    const pose = createUpperBodyRetargetPose(
      createSummary({
        averageUpperBodyVisibility: 0.8,
        torsoLean: 0,
        torsoTurn: 0.5,
      }),
    );

    expect(pose.chestYaw).toBeCloseTo(0.09);
    expect(pose.neckYaw).toBeCloseTo(0.0405);
  });

  it('mirrors elbow lift before mapping upper arm roll deltas by default', () => {
    const pose = createUpperBodyRetargetPose(
      createSummary({
        averageUpperBodyVisibility: 0.8,
        leftArmLift: 0.5,
        rightArmLift: 0.25,
      }),
    );

    expect(pose.leftUpperArmRoll).toBeCloseTo(-0.145);
    expect(pose.rightUpperArmRoll).toBeCloseTo(0.29);
  });

  it('can map elbow lift without mirroring', () => {
    const pose = createUpperBodyRetargetPose(
      createSummary({
        averageUpperBodyVisibility: 0.8,
        leftArmLift: 0.5,
        rightArmLift: 0.25,
      }),
      {
        minVisibility: 0.32,
        mirrorInput: false,
        maxChestYaw: 0.26,
        maxChestRoll: 0.34,
        maxNeckYaw: 0.12,
        maxNeckRoll: 0.15,
        maxArmRoll: 0.58,
      },
    );

    expect(pose.leftUpperArmRoll).toBeCloseTo(-0.29);
    expect(pose.rightUpperArmRoll).toBeCloseTo(0.145);
  });

  it('clamps large movements', () => {
    const pose = createUpperBodyRetargetPose(
      createSummary({
        averageUpperBodyVisibility: 0.9,
        shoulderTilt: 0.6,
        torsoLean: 0.6,
      }),
    );

    expect(pose.chestYaw).toBeCloseTo(0.26);
    expect(pose.chestRoll).toBeCloseTo(0.34);
    expect(pose.neckYaw).toBeCloseTo(0.117);
    expect(pose.neckRoll).toBeCloseTo(0.15);
  });
});

describe('smoothUpperBodyRetargetPose', () => {
  it('eases toward the next pose', () => {
    const smoothed = smoothUpperBodyRetargetPose(
      createNeutralRetargetPose(false),
      {
        enabled: true,
        chestYaw: 0.1,
        chestRoll: -0.2,
        neckYaw: 0.05,
        neckRoll: -0.08,
        leftUpperArmRoll: -0.2,
        rightUpperArmRoll: 0.1,
      },
      0.25,
    );

    expect(smoothed).toEqual({
      enabled: true,
      chestYaw: 0.025,
      chestRoll: -0.05,
      neckYaw: 0.0125,
      neckRoll: -0.02,
      leftUpperArmRoll: -0.05,
      rightUpperArmRoll: 0.025,
    });
  });
});

function createSummary(overrides: Partial<UpperBodyPoseSummary>): UpperBodyPoseSummary {
  return {
    poseDetected: true,
    landmarkCount: 33,
    upperBodyVisibleCount: 9,
    averageUpperBodyVisibility: 0.8,
    shoulderCenter: null,
    hipCenter: null,
    torsoCenter: null,
    shoulderSpan: 0.4,
    shoulderTilt: 0,
    torsoLean: 0,
    torsoTurn: 0,
    leftArmLift: 0,
    rightArmLift: 0,
    ...overrides,
  };
}
