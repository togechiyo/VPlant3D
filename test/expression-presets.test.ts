import { describe, expect, it } from 'vitest';

import {
  createNeutralVrmEmotionExpressionWeights,
  createVrmExpressionPresetTarget,
  smoothVrmEmotionExpressionWeights,
  vrmEmotionExpressionNames,
  vrmExpressionPresets,
} from '../src/vrm/expression-presets';

describe('VRM expression presets', () => {
  it('tracks the VRM emotion preset names handled by the quick buttons', () => {
    expect(vrmEmotionExpressionNames).toEqual(['neutral', 'happy', 'surprised', 'relaxed', 'angry', 'sad']);
  });

  it('keeps one-button presets focused on one dominant expression', () => {
    expect(vrmExpressionPresets.neutral.neutral).toBe(1);
    expect(vrmExpressionPresets.happy.happy).toBeGreaterThan(0.7);
    expect(vrmExpressionPresets.happy.surprised).toBe(0);
    expect(vrmExpressionPresets.angry.angry).toBeGreaterThan(0.7);
    expect(vrmExpressionPresets.sad.sad).toBeGreaterThan(0.7);
    expect(vrmExpressionPresets.relaxed.relaxed).toBeGreaterThan(0.7);
    expect(vrmExpressionPresets.surprised.surprised).toBeGreaterThan(0.7);
  });

  it('creates a zero target when no preset is selected', () => {
    expect(createVrmExpressionPresetTarget(null)).toEqual(
      createNeutralVrmEmotionExpressionWeights(),
    );
  });

  it('smooths preset changes instead of jumping to the target', () => {
    const previous = createNeutralVrmEmotionExpressionWeights();
    const target = createVrmExpressionPresetTarget('happy');
    const smoothed = smoothVrmEmotionExpressionWeights(previous, target, 0.4);

    expect(smoothed.happy).toBeGreaterThan(0);
    expect(smoothed.happy).toBeLessThan(target.happy);
    expect(smoothed.relaxed).toBeGreaterThan(0);
    expect(smoothed.relaxed).toBeLessThan(target.relaxed);
  });
});
