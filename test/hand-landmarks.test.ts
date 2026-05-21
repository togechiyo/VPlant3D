import { describe, expect, it } from 'vitest';
import type { Category, NormalizedLandmark } from '@mediapipe/tasks-vision';

import {
  createHandRetargetPose,
  getHandPoseGripAmount,
  smoothHandRetargetPose,
  summarizeHandTracking,
} from '../src/mocap/hand-landmarks';

describe('summarizeHandTracking', () => {
  it('returns empty summary when no hands are available', () => {
    expect(summarizeHandTracking([], [])).toEqual({
      handCount: 0,
      labels: [],
      averageVisibility: 0,
    });
  });

  it('summarizes handedness labels and visibility', () => {
    const summary = summarizeHandTracking(
      [
        [landmark(0.9), landmark(0.7)],
        [landmark(0.5), landmark(0.3)],
      ],
      [[category('Left')], [category('Right')]],
    );

    expect(summary).toEqual({
      handCount: 2,
      labels: ['Left', 'Right'],
      averageVisibility: 0.6,
    });
  });
});

describe('createHandRetargetPose', () => {
  it('maps straight fingers to low curl values', () => {
    const pose = createHandRetargetPose([openHand()], [[category('Right')]], {
      mirrorInput: false,
    });

    expect(pose.right?.index).toBeLessThan(0.05);
    expect(pose.right?.middle).toBeLessThan(0.05);
    expect(getHandPoseGripAmount(pose)).toBeLessThan(0.05);
  });

  it('maps bent fingers to higher curl values', () => {
    const pose = createHandRetargetPose([closedHand()], [[category('Right')]], {
      mirrorInput: false,
    });

    expect(pose.right?.index).toBeGreaterThan(0.55);
    expect(pose.right?.middle).toBeGreaterThan(0.55);
    expect(getHandPoseGripAmount(pose)).toBeGreaterThan(0.45);
  });

  it('mirrors handedness when requested', () => {
    const pose = createHandRetargetPose([closedHand()], [[category('Right')]], {
      mirrorInput: true,
    });

    expect(pose.left).not.toBeNull();
    expect(pose.right).toBeNull();
  });
});

describe('smoothHandRetargetPose', () => {
  it('releases toward neutral when detection is lost', () => {
    const previous = createHandRetargetPose([closedHand()], [[category('Right')]], {
      mirrorInput: false,
    });
    const smoothed = smoothHandRetargetPose(previous, { left: null, right: null }, 0.5);

    expect(smoothed.right?.index).toBeLessThan(previous.right?.index ?? 0);
    expect(smoothed.right?.index).toBeGreaterThan(0);
  });
});

function landmark(visibility: number): NormalizedLandmark {
  return {
    x: 0,
    y: 0,
    z: 0,
    visibility,
  };
}

function category(categoryName: string): Category {
  return {
    categoryName,
    score: 1,
    index: 0,
    displayName: '',
  };
}

function openHand(): NormalizedLandmark[] {
  const points = Array.from({ length: 21 }, () => point(0, 0, 0));
  points[0] = point(0, 0, 0);
  setFinger(points, [5, 6, 7, 8], 0.12, [0.18, 0.34, 0.5, 0.66]);
  setFinger(points, [9, 10, 11, 12], 0, [0.2, 0.4, 0.6, 0.8]);
  setFinger(points, [13, 14, 15, 16], -0.12, [0.18, 0.34, 0.5, 0.66]);
  setFinger(points, [17, 18, 19, 20], -0.24, [0.16, 0.3, 0.44, 0.58]);
  setFinger(points, [1, 2, 3, 4], 0.28, [0.1, 0.2, 0.3, 0.4]);
  return points;
}

function closedHand(): NormalizedLandmark[] {
  const points = openHand();
  points[6] = point(0.12, 0.36, 0);
  points[7] = point(0.02, 0.36, 0);
  points[8] = point(0.02, 0.22, 0);
  points[10] = point(0, 0.4, 0);
  points[11] = point(-0.1, 0.4, 0);
  points[12] = point(-0.1, 0.24, 0);
  points[14] = point(-0.12, 0.36, 0);
  points[15] = point(-0.22, 0.36, 0);
  points[16] = point(-0.22, 0.22, 0);
  points[18] = point(-0.24, 0.32, 0);
  points[19] = point(-0.34, 0.32, 0);
  points[20] = point(-0.34, 0.2, 0);
  points[2] = point(0.28, 0.22, 0);
  points[3] = point(0.18, 0.22, 0);
  points[4] = point(0.18, 0.1, 0);
  return points;
}

function setFinger(
  points: NormalizedLandmark[],
  indices: [number, number, number, number],
  x: number,
  ys: [number, number, number, number],
): void {
  for (const [offset, index] of indices.entries()) {
    points[index] = point(x, ys[offset] ?? 0, 0);
  }
}

function point(x: number, y: number, z: number): NormalizedLandmark {
  return {
    x,
    y,
    z,
    visibility: 1,
  };
}
