import { describe, expect, it } from 'vitest';

import {
  createNeutralManualPoseState,
  updateManualAvatarScaleFromWheel,
  updateManualAvatarTransformFromDrag,
  updateManualPoseFromDrag,
  type ManualAvatarTransform,
} from '../src/input/manual-control';

describe('manual control', () => {
  it('maps primary drag to held head yaw and pitch', () => {
    const pose = updateManualPoseFromDrag(createNeutralManualPoseState(), {
      button: 'primary',
      deltaX: 100,
      deltaY: -50,
      viewportWidth: 400,
      viewportHeight: 200,
    });

    expect(pose.enabled).toBe(true);
    expect(pose.headYaw).toBeCloseTo(Math.PI / 6);
    expect(pose.headPitch).toBeCloseTo(0.305);
    expect(pose.chestYaw).toBeCloseTo(pose.headYaw * 0.2);
  });

  it('clamps manual head motion to configured limits', () => {
    const pose = updateManualPoseFromDrag(createNeutralManualPoseState(), {
      button: 'primary',
      deltaX: 10000,
      deltaY: 10000,
      viewportWidth: 400,
      viewportHeight: 200,
    });

    expect(pose.headYaw).toBeCloseTo(Math.PI / 3);
    expect(pose.headPitch).toBeCloseTo(-0.61);
  });

  it('maps alt primary drag to head roll', () => {
    const pose = updateManualPoseFromDrag(createNeutralManualPoseState(), {
      button: 'primary',
      deltaX: 200,
      deltaY: 0,
      viewportWidth: 400,
      viewportHeight: 200,
      altKey: true,
    });

    expect(pose.headRoll).toBeCloseTo(0.26);
  });

  it('maps auxiliary drag to avatar position', () => {
    const transform = updateManualAvatarTransformFromDrag(baseTransform(), {
      button: 'auxiliary',
      deltaX: 100,
      deltaY: 50,
      viewportWidth: 400,
      viewportHeight: 200,
    });

    expect(transform.offsetX).toBeCloseTo(0.5);
    expect(transform.offsetY).toBeCloseTo(-0.4);
    expect(transform.scale).toBe(1);
    expect(transform.rotationY).toBe(0);
  });

  it('maps secondary drag to wrapped avatar rotation', () => {
    const transform = updateManualAvatarTransformFromDrag(
      {
        ...baseTransform(),
        rotationY: 170,
      },
      {
        button: 'secondary',
        deltaX: 100,
        deltaY: 0,
        viewportWidth: 400,
        viewportHeight: 200,
      },
    );

    expect(transform.rotationY).toBeCloseTo(-145);
  });

  it('maps wheel motion to clamped avatar scale', () => {
    const zoomedIn = updateManualAvatarScaleFromWheel(baseTransform(), -200);
    const zoomedOut = updateManualAvatarScaleFromWheel(baseTransform(), 10000);

    expect(zoomedIn.scale).toBeCloseTo(1.24);
    expect(zoomedOut.scale).toBeCloseTo(0.7);
  });
});

function baseTransform(): ManualAvatarTransform {
  return {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    rotationY: 0,
  };
}
