import { describe, expect, it } from 'vitest';

import { resolveLookLights } from '../src/look/look-presets';
import {
  smoothRelayAvatarTransform,
  smoothResolvedLookLights,
} from '../src/relay/render-smoothing';

describe('render smoothing', () => {
  it('smooths relay avatar transform and takes the shortest rotation path', () => {
    const smoothed = smoothRelayAvatarTransform(
      {
        offsetX: 0,
        offsetY: 0,
        scale: 1,
        rotationY: 170,
      },
      {
        offsetX: 1,
        offsetY: -0.5,
        scale: 1.5,
        rotationY: -170,
      },
      0.5,
    );

    expect(smoothed.offsetX).toBeCloseTo(0.5);
    expect(smoothed.offsetY).toBeCloseTo(-0.25);
    expect(smoothed.scale).toBeCloseTo(1.25);
    expect(smoothed.rotationY).toBeCloseTo(-180);
  });

  it('smooths look light intensity, position, target, exposure, and colors', () => {
    const previous = resolveLookLights({
      preset: 'standard',
      keyIntensityScale: 1,
      fillIntensityScale: 1,
      rimStrength: 'soft',
      rimColor: 'blue',
      rimDirection: 'right-back',
    });
    const target = resolveLookLights({
      preset: 'neon',
      keyIntensityScale: 2,
      fillIntensityScale: 0,
      rimStrength: 'strong',
      rimColor: 'green',
      rimDirection: 'left-back',
    });
    const smoothed = smoothResolvedLookLights(previous, target, 0.5);

    expect(smoothed.keyIntensity).toBeCloseTo((previous.keyIntensity + target.keyIntensity) / 2);
    expect(smoothed.fillIntensity).toBeCloseTo(previous.fillIntensity / 2);
    expect(smoothed.rimIntensity).toBeCloseTo((previous.rimIntensity + target.rimIntensity) / 2);
    expect(smoothed.rimPosition).toEqual([0, 3.85, -2.75]);
    expect(smoothed.keyTarget).toEqual([0, 1.42, 0]);
    expect(smoothed.exposure).toBeCloseTo((previous.exposure + target.exposure) / 2);
    expect(smoothed.rimColor).not.toBe(previous.rimColor);
    expect(smoothed.rimColor).not.toBe(target.rimColor);
  });
});
