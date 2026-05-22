import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { Matrix } from '@mediapipe/tasks-vision';

import {
  createHeadRetargetPose,
  createNeutralHeadRetargetPose,
  smoothHeadRetargetPose,
} from '../src/mocap/head-retarget';

describe('createHeadRetargetPose', () => {
  it('returns disabled neutral pose when matrix data is missing', () => {
    expect(createHeadRetargetPose(null)).toEqual(createNeutralHeadRetargetPose(false));
  });

  it('maps a face transform matrix to stronger mirrored head rotation by default', () => {
    const pose = createHeadRetargetPose(matrixFromEuler(0.2, 0.3, -0.1));

    expect(pose.enabled).toBe(true);
    expect(pose.pitch).toBeCloseTo(0.178);
    expect(pose.yaw).toBeCloseTo(0.309);
    expect(pose.roll).toBeCloseTo(0.0588);
  });

  it('inverts yaw while keeping roll natural when mocap input is not mirrored', () => {
    const pose = createHeadRetargetPose(matrixFromEuler(0.2, 0.3, -0.1), {
      mirrorInput: false,
    });

    expect(pose.enabled).toBe(true);
    expect(pose.pitch).toBeCloseTo(0.178);
    expect(pose.yaw).toBeCloseTo(-0.309);
    expect(pose.roll).toBeCloseTo(-0.0588);
  });

  it('clamps large rotations', () => {
    const pose = createHeadRetargetPose(matrixFromEuler(1, 1, 1), {
      mirrorInput: false,
    });

    expect(pose.pitch).toBeCloseTo(0.411);
    expect(pose.yaw).toBeCloseTo(-0.929);
    expect(pose.roll).toBeCloseTo(0.237);
  });

  it('allows near side-facing yaw for large face turns', () => {
    const pose = createHeadRetargetPose(matrixFromEuler(0, Math.PI / 2, 0));

    expect(pose.yaw).toBeCloseTo(1.256, 3);
  });

  it('holds the previous pose when tracking is lost', () => {
    const previous = {
      enabled: true,
      pitch: 0.2,
      yaw: 0.4,
      roll: -0.1,
    };
    const pose = smoothHeadRetargetPose(
      previous,
      createNeutralHeadRetargetPose(false),
      0.5,
    );

    expect(pose).toEqual(previous);
  });
});

describe('smoothHeadRetargetPose', () => {
  it('eases toward the next head pose', () => {
    const pose = smoothHeadRetargetPose(
      createNeutralHeadRetargetPose(false),
      {
        enabled: true,
        pitch: 0.1,
        yaw: 0.2,
        roll: -0.1,
      },
      0.5,
    );

    expect(pose.enabled).toBe(true);
    expect(pose.pitch).toBeCloseTo(0.05);
    expect(pose.yaw).toBeCloseTo(0.1);
    expect(pose.roll).toBeCloseTo(-0.05);
  });

  it('holds the last visible pose when tracking is lost', () => {
    const previous = {
      enabled: true,
      pitch: 0.08,
      yaw: -0.14,
      roll: 0.05,
    };
    const pose = smoothHeadRetargetPose(previous, createNeutralHeadRetargetPose(false), 0.5);

    expect(pose).toEqual(previous);
  });

  it('ignores tiny head jitter', () => {
    const previous = {
      enabled: true,
      pitch: 0.08,
      yaw: -0.14,
      roll: 0.05,
    };
    const pose = smoothHeadRetargetPose(
      previous,
      {
        enabled: true,
        pitch: 0.082,
        yaw: -0.136,
        roll: 0.053,
      },
      0.5,
    );

    expect(pose).toEqual(previous);
  });
});

function matrixFromEuler(x: number, y: number, z: number): Matrix {
  const matrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(x, y, z, 'YXZ'));
  const elements = matrix.elements;

  return {
    rows: 4,
    columns: 4,
    data: [
      elements[0],
      elements[4],
      elements[8],
      elements[12],
      elements[1],
      elements[5],
      elements[9],
      elements[13],
      elements[2],
      elements[6],
      elements[10],
      elements[14],
      elements[3],
      elements[7],
      elements[11],
      elements[15],
    ],
  };
}
