import { describe, expect, it } from 'vitest';

import {
  length,
  solveTwoBoneArmIk,
  subtract,
} from '../src/mocap/two-bone-arm-ik';

describe('solveTwoBoneArmIk', () => {
  it('solves a reachable wrist target', () => {
    const result = solveTwoBoneArmIk({
      targetWrist: { x: 1.2, y: -0.4, z: 0 },
      pole: { x: 0, y: -1, z: 0 },
      upperLength: 0.8,
      lowerLength: 0.7,
    });

    expect(result.clamped).toBe(false);
    expect(result.wrist.x).toBeCloseTo(1.2);
    expect(result.wrist.y).toBeCloseTo(-0.4);
    expect(length(result.elbow)).toBeCloseTo(0.8);
    expect(length(subtract(result.wrist, result.elbow))).toBeCloseTo(0.7);
  });

  it('clamps an unreachable wrist target', () => {
    const result = solveTwoBoneArmIk({
      targetWrist: { x: 4, y: 0, z: 0 },
      pole: { x: 0, y: -1, z: 0 },
      upperLength: 1,
      lowerLength: 1,
    });

    expect(result.clamped).toBe(true);
    expect(length(result.wrist)).toBeLessThanOrEqual(2);
    expect(length(result.wrist)).toBeGreaterThan(1.99);
  });

  it('places the elbow on the pole side', () => {
    const result = solveTwoBoneArmIk({
      targetWrist: { x: 1.2, y: 0, z: 0 },
      pole: { x: 0, y: 1, z: 0 },
      upperLength: 0.8,
      lowerLength: 0.8,
    });

    expect(result.elbow.y).toBeGreaterThan(0);
  });

  it('handles a too-close wrist target without NaN', () => {
    const result = solveTwoBoneArmIk({
      targetWrist: { x: 0.001, y: 0, z: 0 },
      pole: { x: 0, y: -1, z: 0 },
      upperLength: 1,
      lowerLength: 0.4,
    });

    expect(Number.isFinite(result.elbow.x)).toBe(true);
    expect(Number.isFinite(result.elbow.y)).toBe(true);
    expect(Number.isFinite(result.wrist.x)).toBe(true);
    expect(result.clamped).toBe(true);
  });

  it('handles defensive zero lengths', () => {
    const result = solveTwoBoneArmIk({
      targetWrist: { x: 1, y: 0, z: 0 },
      pole: { x: 0, y: -1, z: 0 },
      upperLength: 0,
      lowerLength: 0,
    });

    expect(Number.isFinite(result.elbow.x)).toBe(true);
    expect(Number.isFinite(result.wrist.x)).toBe(true);
  });
});
