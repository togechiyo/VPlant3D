import { describe, expect, it } from 'vitest';

import { biasArmIkTargetToFront } from '../src/mocap/arm-ik-constraints';

describe('biasArmIkTargetToFront', () => {
  it('keeps the wrist and pole in front of the rest arm plane', () => {
    const result = biasArmIkTargetToFront({
      targetWrist: { x: 0.8, y: -0.2, z: -0.3 },
      pole: { x: 0.3, y: -0.5, z: -0.1 },
      restWrist: { x: 0.7, y: -0.7, z: 0 },
      restElbow: { x: 0.35, y: -0.35, z: 0 },
      armReach: 1,
    });

    expect(result.targetWrist.z).toBeCloseTo(0.24);
    expect(result.pole.z).toBeCloseTo(0.46);
    expect(result.pole.y).toBeLessThanOrEqual(-0.43);
    expect(result.pole.x).toBeGreaterThan(0.35);
  });

  it('does not pull already-forward targets backward', () => {
    const result = biasArmIkTargetToFront({
      targetWrist: { x: 0.8, y: -0.2, z: 0.6 },
      pole: { x: 0.3, y: -0.5, z: 0.5 },
      restWrist: { x: 0.7, y: -0.7, z: 0 },
      restElbow: { x: 0.35, y: -0.35, z: 0 },
      armReach: 1,
    });

    expect(result.targetWrist.z).toBeCloseTo(0.6);
    expect(result.pole.z).toBeCloseTo(0.5);
  });

  it('keeps the pole on the outward side for a mirrored arm', () => {
    const result = biasArmIkTargetToFront({
      targetWrist: { x: -0.8, y: -0.2, z: -0.3 },
      pole: { x: -0.1, y: -0.5, z: -0.1 },
      restWrist: { x: -0.7, y: -0.7, z: 0 },
      restElbow: { x: -0.35, y: -0.35, z: 0 },
      armReach: 1,
    });

    expect(result.pole.x).toBeLessThan(-0.35);
    expect(result.pole.z).toBeGreaterThan(0.4);
  });
});
