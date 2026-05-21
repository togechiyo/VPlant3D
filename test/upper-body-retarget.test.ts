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

  it('maps torso lean and shoulder tilt to conservative chest and neck motion', () => {
    const pose = createUpperBodyRetargetPose(
      createSummary({
        averageUpperBodyVisibility: 0.8,
        shoulderTilt: 0.06,
        torsoLean: -0.05,
      }),
    );

    expect(pose.enabled).toBe(true);
    expect(pose.chestYaw).toBeCloseTo(0.08);
    expect(pose.chestRoll).toBeCloseTo(-0.102);
    expect(pose.neckYaw).toBeCloseTo(0.036);
    expect(pose.neckRoll).toBeCloseTo(-0.0459);
  });

  it('clamps large movements', () => {
    const pose = createUpperBodyRetargetPose(
      createSummary({
        averageUpperBodyVisibility: 0.9,
        shoulderTilt: 0.6,
        torsoLean: 0.6,
      }),
    );

    expect(pose.chestYaw).toBeCloseTo(-0.18);
    expect(pose.chestRoll).toBeCloseTo(-0.22);
    expect(pose.neckYaw).toBeCloseTo(-0.08);
    expect(pose.neckRoll).toBeCloseTo(-0.099);
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
      },
      0.25,
    );

    expect(smoothed).toEqual({
      enabled: true,
      chestYaw: 0.025,
      chestRoll: -0.05,
      neckYaw: 0.0125,
      neckRoll: -0.02,
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
    ...overrides,
  };
}
