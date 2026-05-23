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
    expect(weights.aa).toBeCloseTo(0.5);
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

  it('keeps small mouth mocap values instead of over-filtering expression input', () => {
    const weights = createVrmFaceExpressionWeights([
      category('jawOpen', 0.03),
      category('mouthFunnel', 0.02),
      category('mouthPucker', 0.01),
    ]);

    expect(weights.aa).toBeCloseTo(0.03);
    expect(weights.ou).toBeCloseTo(0.02);
    expect(weights.oh).toBeCloseTo(0.015);
  });

  it('maps mouth blendshapes directly while still deriving oh from rounded or open mouth', () => {
    const weights = createVrmFaceExpressionWeights([
      category('jawOpen', 0.6),
      category('mouthFunnel', 0.75),
      category('mouthPucker', 0.2),
    ]);

    expect(weights.ou).toBeCloseTo(0.75);
    expect(weights.oh).toBeCloseTo(0.5625);
    expect(weights.aa).toBeCloseTo(0.6);
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

  it('smooths mocap blink and mouth with only a tiny deadband', () => {
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

    expect(smoothed.blinkLeft).toBeCloseTo(0.216);
    expect(smoothed.aa).toBeCloseTo(0.128);
    expect(smoothed.happy).toBe(0);
  });

  it('allows a held mocap blink and open mouth to coexist', () => {
    const previous = {
      ...createNeutralFaceExpressionWeights(),
      blinkLeft: 0.95,
      blinkRight: 0.92,
      aa: 0.58,
      ou: 0.24,
    };
    const smoothed = smoothFaceExpressionWeights(
      previous,
      {
        ...createNeutralFaceExpressionWeights(),
        blinkLeft: 0.96,
        blinkRight: 0.93,
        aa: 0.6,
        ou: 0.25,
      },
      0.8,
    );

    expect(smoothed.blinkLeft).toBeCloseTo(0.958);
    expect(smoothed.blinkRight).toBeCloseTo(0.928);
    expect(smoothed.aa).toBeCloseTo(0.596);
    expect(smoothed.ou).toBeCloseTo(0.248);
  });

  it('slows mouth release to avoid jittering back to neutral', () => {
    const smoothed = smoothFaceExpressionWeights(
      {
        ...createNeutralFaceExpressionWeights(),
        aa: 0.6,
      },
      {
        ...createNeutralFaceExpressionWeights(),
        aa: 0.1,
      },
      0.8,
    );

    expect(smoothed.aa).toBeCloseTo(0.46);
  });

  it('still reacts quickly when blink and mouth weights increase', () => {
    const smoothed = smoothFaceExpressionWeights(
      {
        ...createNeutralFaceExpressionWeights(),
        blinkLeft: 0.1,
        aa: 0.1,
      },
      {
        ...createNeutralFaceExpressionWeights(),
        blinkLeft: 0.7,
        aa: 0.6,
      },
      0.8,
    );

    expect(smoothed.blinkLeft).toBeCloseTo(0.58);
    expect(smoothed.aa).toBeCloseTo(0.5);
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
