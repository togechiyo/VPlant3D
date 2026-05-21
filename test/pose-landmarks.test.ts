import { describe, expect, it } from 'vitest';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

import { summarizeUpperBodyPose } from '../src/mocap/pose-landmarks';

describe('summarizeUpperBodyPose', () => {
  it('returns an empty summary when no landmarks are available', () => {
    expect(summarizeUpperBodyPose(null)).toMatchObject({
      poseDetected: false,
      landmarkCount: 0,
      upperBodyVisibleCount: 0,
      averageUpperBodyVisibility: 0,
      shoulderCenter: null,
      hipCenter: null,
      torsoCenter: null,
      shoulderSpan: null,
      shoulderTilt: null,
      torsoLean: null,
      torsoTurn: null,
      leftArmLift: null,
      rightArmLift: null,
    });
  });

  it('summarizes shoulders, hips, and torso geometry', () => {
    const landmarks = createLandmarks(33, 0.9);
    landmarks[11] = createLandmark(0.3, 0.4, 0.8, -0.1);
    landmarks[12] = createLandmark(0.7, 0.5, 0.6, 0.05);
    landmarks[13] = createLandmark(0.22, 0.55, 0.9);
    landmarks[14] = createLandmark(0.78, 0.75, 0.9);
    landmarks[23] = createLandmark(0.4, 0.8, 0.9);
    landmarks[24] = createLandmark(0.6, 0.8, 0.7);

    const summary = summarizeUpperBodyPose(landmarks);

    expect(summary.poseDetected).toBe(true);
    expect(summary.landmarkCount).toBe(33);
    expect(summary.upperBodyVisibleCount).toBe(9);
    expect(summary.shoulderCenter).toEqual({ x: 0.5, y: 0.45, z: -0.025, visibility: 0.7 });
    expect(summary.hipCenter).toEqual({ x: 0.5, y: 0.8, z: 0, visibility: 0.8 });
    expect(summary.torsoCenter).toEqual({ x: 0.5, y: 0.625, z: -0.0125, visibility: 0.75 });
    expect(summary.shoulderSpan).toBeCloseTo(0.4123, 4);
    expect(summary.shoulderTilt).toBeCloseTo(0.1);
    expect(summary.torsoLean).toBeCloseTo(0);
    expect(summary.torsoTurn).toBeCloseTo(0.15);
    expect(summary.leftArmLift).toBeCloseTo(0.5588, 4);
    expect(summary.rightArmLift).toBeCloseTo(0.2647, 4);
  });

  it('counts only upper-body landmarks above the visibility threshold', () => {
    const landmarks = createLandmarks(33, 0.2);
    landmarks[11] = createLandmark(0.3, 0.4, 0.8);
    landmarks[12] = createLandmark(0.7, 0.4, 0.8);

    const summary = summarizeUpperBodyPose(landmarks, 0.5);

    expect(summary.upperBodyVisibleCount).toBe(2);
    expect(summary.averageUpperBodyVisibility).toBeCloseTo((0.8 + 0.8 + 0.2 * 7) / 9);
  });
});

function createLandmarks(count: number, visibility: number): NormalizedLandmark[] {
  return Array.from({ length: count }, () => createLandmark(0.5, 0.5, visibility));
}

function createLandmark(
  x: number,
  y: number,
  visibility: number,
  z = 0,
): NormalizedLandmark {
  return {
    x,
    y,
    z,
    visibility,
  };
}
