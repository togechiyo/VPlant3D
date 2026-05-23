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

    expect(weights.blinkLeft).toBeCloseTo(0.986);
    expect(weights.blinkRight).toBeCloseTo(0.28);
    expect(weights.aa).toBeCloseTo(0.675);
    expect(weights.happy).toBeCloseTo(0.375);
    expect(weights.surprised).toBeCloseTo(0.165);
  });

  it('mirrors side-specific face blendshapes when mocap input is mirrored', () => {
    const weights = createVrmFaceExpressionWeights(
      [
        category('eyeBlinkLeft', 0.8),
        category('eyeBlinkRight', 0.2),
      ],
      { mirrorInput: true },
    );

    expect(weights.blinkLeft).toBeCloseTo(0.07);
    expect(weights.blinkRight).toBeCloseTo(0.986);
  });

  it('shapes blink weights away from a long half-closed state', () => {
    const noise = createVrmFaceExpressionWeights([category('eyeBlinkLeft', 0.04)]);
    const open = createVrmFaceExpressionWeights([category('eyeBlinkLeft', 0.25)]);
    const half = createVrmFaceExpressionWeights([category('eyeBlinkLeft', 0.5)]);
    const closed = createVrmFaceExpressionWeights([category('eyeBlinkLeft', 0.85)]);

    expect(noise.blinkLeft).toBe(0);
    expect(open.blinkLeft).toBeLessThan(0.15);
    expect(half.blinkLeft).toBeLessThan(0.4);
    expect(closed.blinkLeft).toBeGreaterThan(0.98);
  });

  it('removes tiny mouth mocap noise before smoothing', () => {
    const weights = createVrmFaceExpressionWeights([
      category('jawOpen', 0.03),
      category('mouthFunnel', 0.02),
      category('mouthPucker', 0.01),
    ]);

    expect(weights.aa).toBe(0);
    expect(weights.ou).toBe(0);
    expect(weights.oh).toBe(0);
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

  it('holds tiny expression jitter and snaps near-zero values closed', () => {
    const previous = {
      ...createNeutralFaceExpressionWeights(),
      blinkLeft: 0.2,
      aa: 0.12,
      happy: 0.01,
    };
    const smoothed = smoothFaceExpressionWeights(
      previous,
      {
        ...createNeutralFaceExpressionWeights(),
        blinkLeft: 0.22,
        aa: 0.13,
        happy: 0.015,
      },
      0.8,
    );

    expect(smoothed.blinkLeft).toBe(previous.blinkLeft);
    expect(smoothed.aa).toBe(previous.aa);
    expect(smoothed.happy).toBe(0);
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
