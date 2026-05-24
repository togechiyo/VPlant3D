import { describe, expect, it } from 'vitest';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

import {
  createArmIkRetargetPose,
  createNeutralArmIkRetargetPose,
  smoothArmIkRetargetPose,
} from '../src/mocap/arm-ik-target';

describe('createArmIkRetargetPose', () => {
  it('returns neutral when landmarks are missing', () => {
    expect(createArmIkRetargetPose(null)).toEqual(createNeutralArmIkRetargetPose());
  });

  it('does not create a target when wrist visibility is too low', () => {
    const landmarks = createPose();
    landmarks[15] = point(0.22, 0.7, 0.1, 0.1);

    const pose = createArmIkRetargetPose(landmarks, { mirrorInput: false });

    expect(pose.left).toBeNull();
    expect(pose.right).not.toBeNull();
  });

  it('normalizes target points around the shoulder center', () => {
    const pose = createArmIkRetargetPose(createPose(), { mirrorInput: false });

    expect(pose.left?.shoulder.x).toBeCloseTo(0.5);
    expect(pose.right?.shoulder.x).toBeCloseTo(-0.5);
    expect(pose.left?.wrist.y).toBeLessThan(0);
    expect(pose.left?.confidence).toBeCloseTo(0.9);
  });

  it('mirrors source sides and x coordinates for user-facing camera input', () => {
    const pose = createArmIkRetargetPose(createPose(), { mirrorInput: true });

    expect(pose.left?.shoulder.x).toBeCloseTo(0.5);
    expect(pose.left?.wrist.x).toBeCloseTo(-0.8);
    expect(pose.right?.shoulder.x).toBeCloseTo(-0.5);
  });

  it('clamps shallow z movement', () => {
    const landmarks = createPose();
    landmarks[15] = point(0.22, 0.7, 2, 0.9);

    const pose = createArmIkRetargetPose(landmarks, {
      mirrorInput: false,
      zClamp: 0.2,
      zGain: 1,
    });

    expect(pose.left?.wrist.z).toBeCloseTo(0.2);
  });
});

describe('smoothArmIkRetargetPose', () => {
  it('holds the previous target when detection is lost', () => {
    const previous = createArmIkRetargetPose(createPose(), { mirrorInput: false });
    const smoothed = smoothArmIkRetargetPose(previous, createNeutralArmIkRetargetPose(), 0.5);

    expect(smoothed).toEqual(previous);
  });

  it('lerps detected targets', () => {
    const previous = createArmIkRetargetPose(createPose(), { mirrorInput: false });
    const nextPose = createPose();
    nextPose[15] = point(0.5, 0.5, 0, 0.9);
    const next = createArmIkRetargetPose(nextPose, { mirrorInput: false });
    const smoothed = smoothArmIkRetargetPose(previous, next, 0.5);

    expect(smoothed.left?.wrist.x).toBeCloseTo(
      ((previous.left?.wrist.x ?? 0) + (next.left?.wrist.x ?? 0)) / 2,
    );
  });
});

function createPose(): NormalizedLandmark[] {
  const landmarks = Array.from({ length: 33 }, () => point(0.5, 0.5, 0, 0.9));
  landmarks[11] = point(0.6, 0.42, -0.02, 0.9);
  landmarks[13] = point(0.48, 0.57, 0.02, 0.9);
  landmarks[15] = point(0.34, 0.72, 0.06, 0.9);
  landmarks[12] = point(0.4, 0.42, 0.02, 0.9);
  landmarks[14] = point(0.52, 0.57, -0.01, 0.9);
  landmarks[16] = point(0.66, 0.72, -0.04, 0.9);
  return landmarks;
}

function point(x: number, y: number, z: number, visibility: number): NormalizedLandmark {
  return {
    x,
    y,
    z,
    visibility,
  };
}
