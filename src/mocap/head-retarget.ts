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
  maxYaw: 1.65,
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
    pitch: softClamp(euler.x * nextOptions.pitchGain, nextOptions.maxPitch),
    yaw: softClamp(
      euler.y * nextOptions.yawGain * yawDirection,
      nextOptions.maxYaw,
    ),
    roll: softClamp(
      euler.z * nextOptions.rollGain * rollDirection,
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
      enabled: hasVisibleMotion(previous, 0.01),
      pitch: previous.pitch,
      yaw: previous.yaw,
      roll: previous.roll,
    };
  }

  return {
    enabled: true,
    pitch: lerpWithDeadband(previous.pitch, next.pitch, amount, 0.004),
    yaw: lerpWithDeadband(previous.yaw, next.yaw, amount, 0.005),
    roll: lerpWithDeadband(previous.roll, next.roll, amount, 0.004),
  };
}

function lerp(previous: number, next: number, amount: number): number {
  return previous + (next - previous) * amount;
}

function lerpWithDeadband(
  previous: number,
  next: number,
  amount: number,
  deadband: number,
): number {
  return Math.abs(next - previous) < deadband ? previous : lerp(previous, next, amount);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function softClamp(value: number, limit: number): number {
  if (limit <= 0) {
    return 0;
  }

  return Math.tanh(value / limit) * limit;
}

function hasVisibleMotion(pose: HeadRetargetPose, threshold: number): boolean {
  return (
    Math.abs(pose.pitch) > threshold ||
    Math.abs(pose.yaw) > threshold ||
    Math.abs(pose.roll) > threshold
  );
}
