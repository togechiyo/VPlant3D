import { describe, expect, it } from 'vitest';
import type { Category, NormalizedLandmark } from '@mediapipe/tasks-vision';

import { summarizeHandTracking } from '../src/mocap/hand-landmarks';

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
