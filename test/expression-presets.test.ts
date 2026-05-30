import { describe, expect, it } from 'vitest';

import { vrmEmotionExpressionNames, vrmExpressionPresets } from '../src/vrm/expression-presets';

describe('VRM expression presets', () => {
  it('tracks the VRM emotion preset names handled by the quick buttons', () => {
    expect(vrmEmotionExpressionNames).toEqual(['happy', 'surprised', 'relaxed', 'angry', 'sad']);
  });

  it('keeps one-button presets focused on one dominant expression', () => {
    expect(vrmExpressionPresets.happy.happy).toBeGreaterThan(0.7);
    expect(vrmExpressionPresets.happy.surprised).toBe(0);
    expect(vrmExpressionPresets.angry.angry).toBeGreaterThan(0.7);
    expect(vrmExpressionPresets.sad.sad).toBeGreaterThan(0.7);
    expect(vrmExpressionPresets.relaxed.relaxed).toBeGreaterThan(0.7);
    expect(vrmExpressionPresets.surprised.surprised).toBeGreaterThan(0.7);
  });
});
