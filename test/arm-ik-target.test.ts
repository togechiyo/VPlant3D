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

  it('keeps a lowered arm close to neutral', () => {
    const pose = createArmIkRetargetPose(createLoweredPose(), { mirrorInput: false });

    expect(pose.left?.upperArmRaise).toBeLessThan(0.08);
    expect(pose.left?.upperArmSpread).toBeLessThan(0.08);
    expect(pose.left?.lowerArmBend).toBeLessThan(0.12);
    expect(pose.left?.confidence).toBeCloseTo(0.9);
  });

  it('raises the upper arm when the elbow moves outward and upward', () => {
    const pose = createArmIkRetargetPose(createRaisedPose(), { mirrorInput: false });

    expect(pose.left?.upperArmRaise).toBeGreaterThan(0.85);
    expect(pose.left?.upperArmSpread).toBeGreaterThan(0.75);
    expect(pose.left?.upperArmRotation?.x).toBeLessThanOrEqual(-0.18);
    expect(pose.left?.upperArmRotation?.z).toBeLessThan(-0.5);
  });

  it('increases lower arm bend when the wrist folds toward the shoulder', () => {
    const pose = createArmIkRetargetPose(createBentElbowPose(), { mirrorInput: false });

    expect(pose.left?.lowerArmBend).toBeGreaterThan(0.65);
    expect(pose.left?.lowerArmRotation?.x).toBeGreaterThan(0.45);
    expect(pose.left?.lowerArmRotation?.z).toBeGreaterThan(0.8);
    expect(Math.sign(pose.left?.lowerArmRotation?.z ?? 0)).not.toBe(
      Math.sign(pose.left?.upperArmRotation?.z ?? 0),
    );
  });

  it('uses elbow-to-wrist direction as lower arm controls', () => {
    const pose = createArmIkRetargetPose(createRaisedPose(), { mirrorInput: false });

    expect(pose.left?.lowerArmSpread).toBeGreaterThan(0.35);
    expect(Math.abs(pose.left?.lowerArmRaise ?? 0)).toBeLessThan(0.12);
  });

  it('does not create a target when wrist visibility is too low', () => {
    const landmarks = createLoweredPose();
    landmarks[15] = point(0.6, 0.72, 0, 0.1);

    const pose = createArmIkRetargetPose(landmarks, { mirrorInput: false });

    expect(pose.left).toBeNull();
    expect(pose.right).not.toBeNull();
  });

  it('mirrors source sides for user-facing camera input', () => {
    const pose = createArmIkRetargetPose(createRaisedPose(), { mirrorInput: true });

    expect(pose.left?.upperArmRaise).toBeLessThan(0.08);
    expect(pose.right?.upperArmRaise).toBeGreaterThan(0.85);
  });
});

describe('smoothArmIkRetargetPose', () => {
  it('holds the previous target when detection is lost', () => {
    const previous = createArmIkRetargetPose(createRaisedPose(), { mirrorInput: false });
    const smoothed = smoothArmIkRetargetPose(previous, createNeutralArmIkRetargetPose(), 0.5);

    expect(smoothed).toEqual(previous);
  });

  it('lerps detected arm controls', () => {
    const previous = createArmIkRetargetPose(createLoweredPose(), { mirrorInput: false });
    const next = createArmIkRetargetPose(createRaisedPose(), { mirrorInput: false });
    const smoothed = smoothArmIkRetargetPose(previous, next, 0.5);

    expect(smoothed.left?.upperArmRaise).toBeCloseTo(
      ((previous.left?.upperArmRaise ?? 0) + (next.left?.upperArmRaise ?? 0)) / 2,
    );
    expect(smoothed.left?.upperArmRotation?.z).toBeCloseTo(
      ((previous.left?.upperArmRotation?.z ?? 0) + (next.left?.upperArmRotation?.z ?? 0)) / 2,
    );
  });
});

function createLoweredPose(): NormalizedLandmark[] {
  const landmarks = createBasePose();
  landmarks[13] = point(0.6, 0.565, 0.02, 0.9);
  landmarks[15] = point(0.6, 0.71, 0.04, 0.9);
  return landmarks;
}

function createRaisedPose(): NormalizedLandmark[] {
  const landmarks = createBasePose();
  landmarks[13] = point(0.74, 0.42, 0.02, 0.9);
  landmarks[15] = point(0.9, 0.43, 0.04, 0.9);
  return landmarks;
}

function createBentElbowPose(): NormalizedLandmark[] {
  const landmarks = createBasePose();
  landmarks[13] = point(0.73, 0.43, 0.02, 0.9);
  landmarks[15] = point(0.61, 0.34, 0.04, 0.9);
  return landmarks;
}

function createBasePose(): NormalizedLandmark[] {
  const landmarks = Array.from({ length: 33 }, () => point(0.5, 0.5, 0, 0.9));
  landmarks[11] = point(0.6, 0.42, -0.02, 0.9);
  landmarks[12] = point(0.4, 0.42, 0.02, 0.9);
  landmarks[14] = point(0.4, 0.565, -0.01, 0.9);
  landmarks[16] = point(0.4, 0.71, -0.04, 0.9);
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
