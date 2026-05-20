import { describe, expect, it } from 'vitest';

import {
  calculateRms,
  clamp01,
  normalizeMouthOpen,
  smoothMouthOpen,
} from '../src/audio/mic-mouth';

describe('calculateRms', () => {
  it('returns 0 for empty or invalid input', () => {
    expect(calculateRms([])).toBe(0);
    expect(calculateRms([Number.NaN, Number.POSITIVE_INFINITY])).toBe(0);
  });

  it('calculates root mean square for signed samples', () => {
    expect(calculateRms([1, -1, 1, -1])).toBe(1);
    expect(calculateRms([0.5, -0.5])).toBe(0.5);
  });
});

describe('normalizeMouthOpen', () => {
  const options = {
    threshold: 0.05,
    sensitivity: 4,
  };

  it('returns 0 below threshold and scales above threshold', () => {
    expect(normalizeMouthOpen(0.04, options)).toBe(0);
    expect(normalizeMouthOpen(0.1, options)).toBeCloseTo(0.2);
  });

  it('clamps output to 0..1 and handles invalid values', () => {
    expect(normalizeMouthOpen(1, options)).toBe(1);
    expect(normalizeMouthOpen(Number.NaN, options)).toBe(0);
  });
});

describe('smoothMouthOpen', () => {
  it('uses attack when rising and release when falling', () => {
    expect(smoothMouthOpen(0.2, 1, { attack: 0.5, release: 0.1 })).toBeCloseTo(0.6);
    expect(smoothMouthOpen(1, 0, { attack: 0.5, release: 0.1 })).toBeCloseTo(0.9);
  });

  it('clamps inputs and smoothing factors', () => {
    expect(smoothMouthOpen(2, -1, { attack: 2, release: 2 })).toBe(0);
    expect(smoothMouthOpen(Number.NaN, 1, { attack: 1, release: 1 })).toBe(1);
  });
});

describe('clamp01', () => {
  it('keeps values inside 0..1', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(2)).toBe(1);
  });
});
