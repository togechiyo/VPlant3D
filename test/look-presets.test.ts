import { describe, expect, it } from 'vitest';

import {
  createDefaultLookSettings,
  normalizeLookSettings,
  resolveLookLights,
} from '../src/look/look-presets';

describe('look presets', () => {
  it('resolves the default three-light setup', () => {
    const lights = resolveLookLights(createDefaultLookSettings());

    expect(lights.id).toBe('standard');
    expect(lights.keyIntensity).toBeCloseTo(1.65);
    expect(lights.keyPosition[0]).toBeLessThan(0);
    expect(lights.keyPosition[2]).toBeGreaterThan(0);
    expect(lights.fillIntensity).toBeCloseTo(0.26);
    expect(lights.fillPosition[0]).toBeGreaterThan(0);
    expect(lights.fillPosition[2]).toBeGreaterThan(0);
    expect(lights.rimIntensity).toBeCloseTo(2.35);
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

    expect(lights.keyIntensity).toBeCloseTo(3.3);
    expect(lights.fillIntensity).toBe(0);
  });

  it('overrides rim strength, color, and direction', () => {
    const lights = resolveLookLights({
      ...createDefaultLookSettings(),
      rimStrength: 'strong',
      rimColor: 'green',
      rimDirection: 'left-back',
    });

    expect(lights.rimIntensity).toBeCloseTo(3.8);
    expect(lights.rimColor).toBe(0x6dff9a);
    expect(lights.rimPosition).toEqual([-2.35, 3.85, -2.75]);
  });

  it('normalizes partial or invalid settings', () => {
    const settings = normalizeLookSettings(
      {
        preset: 'not-a-preset',
        keyIntensityScale: Number.NaN,
        fillIntensityScale: 1.5,
        rimStrength: 'medium',
        rimColor: 'nope',
        rimDirection: 'top-back',
      } as unknown as Parameters<typeof normalizeLookSettings>[0],
    );

    expect(settings).toEqual({
      preset: 'standard',
      keyIntensityScale: 1,
      fillIntensityScale: 1.5,
      rimStrength: 'medium',
      rimColor: 'blue',
      rimDirection: 'top-back',
    });
  });
});
