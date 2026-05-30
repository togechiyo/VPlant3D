import { describe, expect, it } from 'vitest';

import { vrmExpressionPresets } from '../src/vrm/expression-presets';

describe('VRM expression presets', () => {
  it('provides neutral reset weights for emotion expressions', () => {
    expect(vrmExpressionPresets.neutral).toMatchObject({
      happy: 0,
      surprised: 0,
      relaxed: 0,
      angry: 0,
      sad: 0,
    });
  });

  it('keeps one-button presets focused on one dominant expression', () => {
    expect(vrmExpressionPresets.happy.happy).toBeGreaterThan(0.7);
    expect(vrmExpressionPresets.happy.surprised).toBe(0);
    expect(vrmExpressionPresets.angry.angry).toBeGreaterThan(0.7);
    expect(vrmExpressionPresets.sad.sad).toBeGreaterThan(0.7);
    expect(vrmExpressionPresets.relaxed.relaxed).toBeGreaterThan(0.7);
  });
});
