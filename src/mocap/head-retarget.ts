import * as THREE from 'three';
import type { Matrix } from '@mediapipe/tasks-vision';

export interface HeadRetargetPose {
  enabled: boolean;
  pitch: number;
  yaw: number;
  roll: number;
}

export interface HeadRetargetOptions {
  mirrorInput: boolean;
  pitchGain: number;
  yawGain: number;
  rollGain: number;
  maxPitch: number;
  maxYaw: number;
  maxRoll: number;
}

export const defaultHeadRetargetOptions: HeadRetargetOptions = {
  mirrorInput: true,
  pitchGain: 0.95,
  yawGain: 1.05,
  rollGain: 0.6,
  maxPitch: 0.42,
  maxYaw: 1.25,
  maxRoll: 0.24,
};

export function createNeutralHeadRetargetPose(enabled = false): HeadRetargetPose {
  return {
    enabled,
    pitch: 0,
    yaw: 0,
    roll: 0,
  };
}

export function createHeadRetargetPose(
  matrix: Matrix | null | undefined,
  options: Partial<HeadRetargetOptions> = {},
): HeadRetargetPose {
  const nextOptions = { ...defaultHeadRetargetOptions, ...options };

  if (!matrix || matrix.rows !== 4 || matrix.columns !== 4 || matrix.data.length < 16) {
    return createNeutralHeadRetargetPose(false);
  }

  const data = matrix.data as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const transform = new THREE.Matrix4().set(
    data[0],
    data[1],
    data[2],
    data[3],
    data[4],
    data[5],
    data[6],
    data[7],
    data[8],
    data[9],
    data[10],
    data[11],
    data[12],
    data[13],
    data[14],
    data[15],
  );
  const euler = new THREE.Euler().setFromRotationMatrix(transform, 'YXZ');
  const yawDirection = nextOptions.mirrorInput ? 1 : -1;
  const rollDirection = nextOptions.mirrorInput ? -1 : 1;

  return {
    enabled: true,
    pitch: clamp(euler.x * nextOptions.pitchGain, -nextOptions.maxPitch, nextOptions.maxPitch),
    yaw: clamp(
      euler.y * nextOptions.yawGain * yawDirection,
      -nextOptions.maxYaw,
      nextOptions.maxYaw,
    ),
    roll: clamp(
      euler.z * nextOptions.rollGain * rollDirection,
      -nextOptions.maxRoll,
      nextOptions.maxRoll,
    ),
  };
}

export function smoothHeadRetargetPose(
  previous: HeadRetargetPose,
  next: HeadRetargetPose,
  smoothing = 0.42,
): HeadRetargetPose {
  const amount = clamp(smoothing, 0, 1);

  if (!next.enabled) {
    return {
      enabled: false,
      pitch: lerp(previous.pitch, 0, amount),
      yaw: lerp(previous.yaw, 0, amount),
      roll: lerp(previous.roll, 0, amount),
    };
  }

  return {
    enabled: true,
    pitch: lerp(previous.pitch, next.pitch, amount),
    yaw: lerp(previous.yaw, next.yaw, amount),
    roll: lerp(previous.roll, next.roll, amount),
  };
}

function lerp(previous: number, next: number, amount: number): number {
  return previous + (next - previous) * amount;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
