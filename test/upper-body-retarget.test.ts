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
    expect(pose.chestRoll).toBeCloseTo(0.114);
    expect(pose.neckYaw).toBeCloseTo(-0.054);
    expect(pose.neckRoll).toBeCloseTo(0.03648);
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
        maxLowerArmRoll: 1.08,
        trackArms: true,
      },
    );

    expect(pose.chestYaw).toBeCloseTo(0.12);
    expect(pose.chestRoll).toBeCloseTo(-0.114);
  });

  it('adds a subtle torso turn from shoulder depth', () => {
    const pose = createUpperBodyRetargetPose(
      createSummary({
        averageUpperBodyVisibility: 0.8,
        torsoLean: 0,
        torsoTurn: 0.5,
      }),
    );

    expect(pose.chestYaw).toBeCloseTo(0.17);
    expect(pose.neckYaw).toBeCloseTo(0.0765);
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

  it('mirrors wrist lift before mapping lower arm roll deltas by default', () => {
    const pose = createUpperBodyRetargetPose(
      createSummary({
        averageUpperBodyVisibility: 0.8,
        leftLowerArmLift: 0.7,
        rightLowerArmLift: 0.25,
      }),
    );

    expect(pose.leftLowerArmRoll).toBeCloseTo(-0.1215);
    expect(pose.rightLowerArmRoll).toBeCloseTo(0.3402);
  });

  it('uses elbow bend as the main lower-arm target', () => {
    const pose = createUpperBodyRetargetPose(
      createSummary({
        averageUpperBodyVisibility: 0.8,
        leftLowerArmBend: 0.75,
        rightLowerArmBend: 0.25,
      }),
    );

    expect(pose.leftLowerArmRoll).toBeCloseTo(-0.27);
    expect(pose.rightLowerArmRoll).toBeCloseTo(0.81);
  });

  it('can disable upper and lower arm tracking while preserving torso motion', () => {
    const pose = createUpperBodyRetargetPose(
      createSummary({
        averageUpperBodyVisibility: 0.8,
        shoulderTilt: 0.06,
        torsoLean: -0.05,
        leftArmLift: 0.7,
        rightArmLift: 0.4,
        leftLowerArmBend: 0.8,
        rightLowerArmBend: 0.6,
      }),
      {
        minVisibility: 0.32,
        mirrorInput: true,
        maxChestYaw: 0.26,
        maxChestRoll: 0.34,
        maxNeckYaw: 0.12,
        maxNeckRoll: 0.15,
        maxArmRoll: 0.58,
        maxLowerArmRoll: 1.08,
        trackArms: false,
      },
    );

    expect(pose.chestYaw).not.toBe(0);
    expect(pose.leftUpperArmRoll).toBe(0);
    expect(pose.rightUpperArmRoll).toBe(0);
    expect(pose.leftLowerArmRoll).toBe(0);
    expect(pose.rightLowerArmRoll).toBe(0);
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
        maxLowerArmRoll: 1.08,
        trackArms: true,
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
    expect(pose.neckRoll).toBeCloseTo(0.1088);
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
        leftLowerArmRoll: -0.4,
        rightLowerArmRoll: 0.2,
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
      leftLowerArmRoll: -0.1,
      rightLowerArmRoll: 0.05,
    });
  });

  it('holds the last visible pose when tracking is lost', () => {
    const previous = {
      enabled: true,
      chestYaw: 0.1,
      chestRoll: -0.1,
      neckYaw: 0.04,
      neckRoll: -0.03,
      leftUpperArmRoll: -0.2,
      rightUpperArmRoll: 0.1,
      leftLowerArmRoll: -0.4,
      rightLowerArmRoll: 0.2,
    };
    const smoothed = smoothUpperBodyRetargetPose(
      previous,
      createNeutralRetargetPose(false),
      0.25,
    );

    expect(smoothed).toEqual(previous);
  });

  it('ignores tiny body jitter', () => {
    const previous = {
      enabled: true,
      chestYaw: 0.1,
      chestRoll: -0.1,
      neckYaw: 0.04,
      neckRoll: -0.03,
      leftUpperArmRoll: -0.2,
      rightUpperArmRoll: 0.1,
      leftLowerArmRoll: -0.4,
      rightLowerArmRoll: 0.2,
    };
    const smoothed = smoothUpperBodyRetargetPose(
      previous,
      {
        enabled: true,
        chestYaw: 0.103,
        chestRoll: -0.096,
        neckYaw: 0.043,
        neckRoll: -0.027,
        leftUpperArmRoll: -0.191,
        rightUpperArmRoll: 0.109,
        leftLowerArmRoll: -0.389,
        rightLowerArmRoll: 0.211,
      },
      0.25,
    );

    expect(smoothed).toEqual(previous);
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
    leftLowerArmLift: 0,
    rightLowerArmLift: 0,
    leftLowerArmBend: 0,
    rightLowerArmBend: 0,
    ...overrides,
  };
}
