import { describe, expect, it } from 'vitest';
import type { Category } from '@mediapipe/tasks-vision';

import {
  createNeutralFaceExpressionWeights,
  createVrmFaceExpressionWeights,
  smoothFaceExpressionWeights,
} from '../src/mocap/face-expression-retarget';

describe('createVrmFaceExpressionWeights', () => {
  it('returns neutral weights when blendshapes are missing', () => {
    expect(createVrmFaceExpressionWeights(null)).toEqual(createNeutralFaceExpressionWeights());
  });

  it('maps MediaPipe blendshapes to VRM expression weights', () => {
    const weights = createVrmFaceExpressionWeights([
      category('eyeBlinkLeft', 0.8),
      category('eyeBlinkRight', 0.4),
      category('jawOpen', 0.5),
      category('mouthSmileLeft', 0.6),
      category('mouthSmileRight', 0.4),
      category('browInnerUp', 0.3),
    ]);

    expect(weights.blinkLeft).toBeCloseTo(1);
    expect(weights.blinkRight).toBeCloseTo(0.5);
    expect(weights.aa).toBeCloseTo(0.675);
    expect(weights.happy).toBeCloseTo(0.375);
    expect(weights.surprised).toBeCloseTo(0.165);
  });

  it('prioritizes rounded mouth shapes for ou and oh', () => {
    const weights = createVrmFaceExpressionWeights([
      category('jawOpen', 0.6),
      category('mouthFunnel', 0.75),
      category('mouthPucker', 0.2),
    ]);

    expect(weights.ou).toBeCloseTo(0.7875);
    expect(weights.oh).toBeCloseTo(0.3375);
    expect(weights.aa).toBeCloseTo(0.55625);
  });
});

describe('smoothFaceExpressionWeights', () => {
  it('eases every weight toward the next frame', () => {
    const smoothed = smoothFaceExpressionWeights(
      createNeutralFaceExpressionWeights(),
      {
        blinkLeft: 1,
        blinkRight: 0.5,
        aa: 0.25,
        ih: 0,
        ou: 0,
        ee: 0,
        oh: 0,
        happy: 0.5,
        surprised: 0,
      },
      0.4,
    );

    expect(smoothed.blinkLeft).toBeCloseTo(0.4);
    expect(smoothed.blinkRight).toBeCloseTo(0.2);
    expect(smoothed.aa).toBeCloseTo(0.1);
    expect(smoothed.happy).toBeCloseTo(0.2);
  });
});

function category(categoryName: string, score: number): Category {
  return {
    categoryName,
    score,
    index: 0,
    displayName: '',
  };
}
