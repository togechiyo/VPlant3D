import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export type ArmIkSide = 'left' | 'right';

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface ArmIkSideTarget {
  enabled: boolean;
  side: ArmIkSide;
  shoulder: Vector3Like;
  elbow: Vector3Like;
  wrist: Vector3Like;
  pole: Vector3Like;
  confidence: number;
}

export interface ArmIkRetargetPose {
  left: ArmIkSideTarget | null;
  right: ArmIkSideTarget | null;
}

export interface ArmIkTargetOptions {
  mirrorInput: boolean;
  minVisibility: number;
  minShoulderSpan: number;
  zGain: number;
  zClamp: number;
}

export const defaultArmIkTargetOptions: ArmIkTargetOptions = {
  mirrorInput: true,
  minVisibility: 0.35,
  minShoulderSpan: 0.08,
  zGain: 0.35,
  zClamp: 0.25,
};

const leftShoulder = 11;
const rightShoulder = 12;
const leftElbow = 13;
const rightElbow = 14;
const leftWrist = 15;
const rightWrist = 16;

export function createNeutralArmIkRetargetPose(): ArmIkRetargetPose {
  return {
    left: null,
    right: null,
  };
}

export function createArmIkRetargetPose(
  landmarks: NormalizedLandmark[] | null | undefined,
  options: Partial<ArmIkTargetOptions> = {},
): ArmIkRetargetPose {
  const nextOptions = {
    ...defaultArmIkTargetOptions,
    ...options,
  };

  if (!landmarks || landmarks.length === 0) {
    return createNeutralArmIkRetargetPose();
  }

  const leftShoulderPoint = landmarks[leftShoulder];
  const rightShoulderPoint = landmarks[rightShoulder];

  if (!leftShoulderPoint || !rightShoulderPoint) {
    return createNeutralArmIkRetargetPose();
  }

  const shoulderSpan = Math.max(
    distance2d(leftShoulderPoint, rightShoulderPoint),
    nextOptions.minShoulderSpan,
  );
  const origin = {
    x: (leftShoulderPoint.x + rightShoulderPoint.x) / 2,
    y: (leftShoulderPoint.y + rightShoulderPoint.y) / 2,
    z: ((leftShoulderPoint.z ?? 0) + (rightShoulderPoint.z ?? 0)) / 2,
  };

  return {
    left: createSideTarget('left', landmarks, origin, shoulderSpan, nextOptions),
    right: createSideTarget('right', landmarks, origin, shoulderSpan, nextOptions),
  };
}

export function smoothArmIkRetargetPose(
  previous: ArmIkRetargetPose,
  next: ArmIkRetargetPose,
  smoothing = 0.38,
): ArmIkRetargetPose {
  return {
    left: smoothArmIkSideTarget(previous.left, next.left, smoothing),
    right: smoothArmIkSideTarget(previous.right, next.right, smoothing),
  };
}

export function hasArmIkTarget(pose: ArmIkRetargetPose): boolean {
  return Boolean(pose.left || pose.right);
}

function createSideTarget(
  targetSide: ArmIkSide,
  landmarks: NormalizedLandmark[],
  origin: Vector3Like,
  shoulderSpan: number,
  options: ArmIkTargetOptions,
): ArmIkSideTarget | null {
  const sourceSide = options.mirrorInput ? oppositeSide(targetSide) : targetSide;
  const indexes = getIndexes(sourceSide);
  const shoulder = landmarks[indexes.shoulder];
  const elbow = landmarks[indexes.elbow];
  const wrist = landmarks[indexes.wrist];

  if (!shoulder || !elbow || !wrist) {
    return null;
  }

  const confidence = Math.min(
    getVisibility(shoulder),
    getVisibility(elbow),
    getVisibility(wrist),
  );

  if (confidence < options.minVisibility) {
    return null;
  }

  const mappedShoulder = mapLandmark(shoulder, origin, shoulderSpan, options);
  const mappedElbow = mapLandmark(elbow, origin, shoulderSpan, options);
  const mappedWrist = mapLandmark(wrist, origin, shoulderSpan, options);

  return {
    enabled: true,
    side: targetSide,
    shoulder: mappedShoulder,
    elbow: mappedElbow,
    wrist: mappedWrist,
    pole: subtract(mappedElbow, mappedShoulder),
    confidence,
  };
}

function getIndexes(side: ArmIkSide): { shoulder: number; elbow: number; wrist: number } {
  return side === 'left'
    ? { shoulder: leftShoulder, elbow: leftElbow, wrist: leftWrist }
    : { shoulder: rightShoulder, elbow: rightElbow, wrist: rightWrist };
}

function mapLandmark(
  landmark: NormalizedLandmark,
  origin: Vector3Like,
  shoulderSpan: number,
  options: ArmIkTargetOptions,
): Vector3Like {
  const mirrorSign = options.mirrorInput ? -1 : 1;

  return {
    x: ((landmark.x - origin.x) / shoulderSpan) * mirrorSign,
    y: -((landmark.y - origin.y) / shoulderSpan),
    z: clamp(((landmark.z ?? 0) - origin.z) * options.zGain, -options.zClamp, options.zClamp),
  };
}

function smoothArmIkSideTarget(
  previous: ArmIkSideTarget | null,
  next: ArmIkSideTarget | null,
  smoothing: number,
): ArmIkSideTarget | null {
  if (!next) {
    return previous;
  }

  if (!previous) {
    return next;
  }

  const amount = clamp(smoothing, 0, 1);

  return {
    enabled: next.enabled,
    side: next.side,
    shoulder: lerpPoint(previous.shoulder, next.shoulder, amount),
    elbow: lerpPoint(previous.elbow, next.elbow, amount),
    wrist: lerpPoint(previous.wrist, next.wrist, amount),
    pole: lerpPoint(previous.pole, next.pole, amount),
    confidence: lerp(previous.confidence, next.confidence, amount),
  };
}

function lerpPoint(previous: Vector3Like, next: Vector3Like, amount: number): Vector3Like {
  return {
    x: lerp(previous.x, next.x, amount),
    y: lerp(previous.y, next.y, amount),
    z: lerp(previous.z, next.z, amount),
  };
}

function subtract(first: Vector3Like, second: Vector3Like): Vector3Like {
  return {
    x: first.x - second.x,
    y: first.y - second.y,
    z: first.z - second.z,
  };
}

function oppositeSide(side: ArmIkSide): ArmIkSide {
  return side === 'left' ? 'right' : 'left';
}

function distance2d(first: NormalizedLandmark, second: NormalizedLandmark): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getVisibility(landmark: NormalizedLandmark): number {
  return landmark.visibility ?? 1;
}

function lerp(previous: number, next: number, amount: number): number {
  return previous + (next - previous) * amount;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
