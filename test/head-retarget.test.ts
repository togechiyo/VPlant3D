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

  it('maps a face transform matrix to conservative head rotation', () => {
    const pose = createHeadRetargetPose(matrixFromEuler(0.2, 0.3, -0.1), {
      mirrorInput: false,
    });

    expect(pose.enabled).toBe(true);
    expect(pose.pitch).toBeCloseTo(0.07);
    expect(pose.yaw).toBeCloseTo(0.12);
    expect(pose.roll).toBeCloseTo(-0.045);
  });

  it('mirrors yaw and roll when mocap input is mirrored', () => {
    const pose = createHeadRetargetPose(matrixFromEuler(0.2, 0.3, -0.1), {
      mirrorInput: true,
    });

    expect(pose.pitch).toBeCloseTo(0.07);
    expect(pose.yaw).toBeCloseTo(-0.12);
    expect(pose.roll).toBeCloseTo(0.045);
  });

  it('clamps large rotations', () => {
    const pose = createHeadRetargetPose(matrixFromEuler(1, 1, 1), {
      mirrorInput: false,
    });

    expect(pose.pitch).toBeCloseTo(0.18);
    expect(pose.yaw).toBeCloseTo(0.22);
    expect(pose.roll).toBeCloseTo(0.2);
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
