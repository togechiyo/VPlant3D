import { describe, expect, it } from 'vitest';

import {
  createDefaultLookSettings,
  normalizeLookSettings,
  resolveLookLights,
} from '../src/look/look-presets';

describe('look presets', () => {
  it('resolves the default key-light setup', () => {
    const lights = resolveLookLights(createDefaultLookSettings());

    expect(lights.id).toBe('standard');
    expect(lights.keyIntensity).toBeCloseTo(2.15);
    expect(lights.keyColor).toBe(0xf4fbff);
    expect(lights.keyPosition[1]).toBeGreaterThan(3.5);
    expect(lights.keyPosition[2]).toBeGreaterThan(0);
    expect(lights.keyShadowEnabled).toBe(false);
    expect(lights.fillIntensity).toBe(0);
    expect(lights.rimIntensity).toBe(0);
    expect(lights.rimColor).toBe(0x38d5ff);
    expect(lights.rimPosition).toEqual([0, 5.65, -1.05]);
    expect(lights.rimTarget).toEqual([0, 1.52, 0]);
  });

  it('applies key and fill intensity scales with clamping', () => {
    const lights = resolveLookLights({
      ...createDefaultLookSettings(),
      keyIntensityScale: 2.5,
      fillIntensityScale: -1,
    });

    expect(lights.keyIntensity).toBeCloseTo(4.3);
    expect(lights.fillIntensity).toBe(0);
  });

  it('keeps rim disabled while retaining old setting compatibility', () => {
    const lights = resolveLookLights({
      ...createDefaultLookSettings(),
      rimStrength: 'strong',
      rimColor: 'green',
      rimDirection: 'left-back',
    });

    expect(lights.rimIntensity).toBe(0);
    expect(lights.rimColor).toBe(0x6dff9a);
    expect(lights.rimPosition).toEqual([-2.35, 3.85, -2.75]);
  });

  it('applies key color, direction, and shadow settings', () => {
    const lights = resolveLookLights({
      ...createDefaultLookSettings(),
      keyColor: 'warm',
      keyDirection: 'left-top',
      keyShadowEnabled: true,
    });

    expect(lights.keyColor).toBe(0xfff0d2);
    expect(lights.keyPosition).toEqual([-2.25, 3.75, 3.25]);
    expect(lights.keyShadowEnabled).toBe(true);
  });

  it('normalizes partial or invalid settings', () => {
    const settings = normalizeLookSettings(
      {
        preset: 'not-a-preset',
        keyIntensityScale: Number.NaN,
        keyColor: 'nope',
        keyDirection: 'sideways',
        keyShadowEnabled: 'yes',
        fillIntensityScale: 1.5,
        rimStrength: 'medium',
        rimColor: 'nope',
        rimDirection: 'top-back',
      } as unknown as Parameters<typeof normalizeLookSettings>[0],
    );

    expect(settings).toEqual({
      preset: 'standard',
      keyIntensityScale: 1,
      keyColor: 'neutral',
      keyDirection: 'front-top',
      keyShadowEnabled: false,
      fillIntensityScale: 1.5,
      rimStrength: 'medium',
      rimColor: 'blue',
      rimDirection: 'top-back',
    });
  });
});
