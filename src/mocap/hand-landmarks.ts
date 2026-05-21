import type { Category, NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface HandTrackingSummary {
  handCount: number;
  labels: string[];
  averageVisibility: number;
}

export interface HandFingerCurl {
  thumb: number;
  index: number;
  middle: number;
  ring: number;
  little: number;
}

export interface HandRetargetPose {
  left: HandFingerCurl | null;
  right: HandFingerCurl | null;
}

export interface HandRetargetOptions {
  mirrorInput: boolean;
}

const neutralFingerCurl: HandFingerCurl = {
  thumb: 0,
  index: 0,
  middle: 0,
  ring: 0,
  little: 0,
};

export function summarizeHandTracking(
  landmarks: NormalizedLandmark[][] | null | undefined,
  handedness: Category[][] | null | undefined,
): HandTrackingSummary {
  const hands = landmarks ?? [];
  const labels = hands.map((_, index) => handedness?.[index]?.[0]?.categoryName ?? `Hand ${index + 1}`);
  const visibilityValues = hands.flatMap((hand) =>
    hand.map((landmark) => landmark.visibility ?? 1),
  );
  const averageVisibility =
    visibilityValues.length === 0
      ? 0
      : visibilityValues.reduce((total, value) => total + value, 0) / visibilityValues.length;

  return {
    handCount: hands.length,
    labels,
    averageVisibility,
  };
}

export function createNeutralHandRetargetPose(): HandRetargetPose {
  return {
    left: null,
    right: null,
  };
}

export function createHandRetargetPose(
  landmarks: NormalizedLandmark[][] | null | undefined,
  handedness: Category[][] | null | undefined,
  options: HandRetargetOptions,
): HandRetargetPose {
  const pose = createNeutralHandRetargetPose();

  for (const [index, hand] of (landmarks ?? []).entries()) {
    if (hand.length < 21) {
      continue;
    }

    const sourceSide = parseHandSide(handedness?.[index]?.[0]?.categoryName);
    if (!sourceSide) {
      continue;
    }

    const targetSide = options.mirrorInput ? getOppositeHandSide(sourceSide) : sourceSide;
    pose[targetSide] = createFingerCurl(hand);
  }

  return pose;
}

export function smoothHandRetargetPose(
  previous: HandRetargetPose,
  next: HandRetargetPose,
  smoothing = 0.38,
): HandRetargetPose {
  return {
    left: smoothFingerCurl(previous.left, next.left, smoothing),
    right: smoothFingerCurl(previous.right, next.right, smoothing),
  };
}

export function getHandPoseGripAmount(pose: HandRetargetPose): number {
  const curls = [pose.left, pose.right].filter((curl): curl is HandFingerCurl => curl !== null);
  const values = curls.flatMap((curl) => [
    curl.thumb,
    curl.index,
    curl.middle,
    curl.ring,
    curl.little,
  ]);

  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function createFingerCurl(hand: NormalizedLandmark[]): HandFingerCurl {
  return {
    thumb: calculateFingerCurl(hand, 1, 2, 3, 4, 1.25),
    index: calculateFingerCurl(hand, 5, 6, 7, 8, 1.45),
    middle: calculateFingerCurl(hand, 9, 10, 11, 12, 1.45),
    ring: calculateFingerCurl(hand, 13, 14, 15, 16, 1.45),
    little: calculateFingerCurl(hand, 17, 18, 19, 20, 1.45),
  };
}

function calculateFingerCurl(
  hand: NormalizedLandmark[],
  mcpIndex: number,
  pipIndex: number,
  dipIndex: number,
  tipIndex: number,
  bendRange: number,
): number {
  const mcp = hand[mcpIndex];
  const pip = hand[pipIndex];
  const dip = hand[dipIndex];
  const tip = hand[tipIndex];

  if (!mcp || !pip || !dip || !tip) {
    return 0;
  }

  const pipAngle = calculateJointAngle(mcp, pip, dip);
  const dipAngle = calculateJointAngle(pip, dip, tip);
  const averageBend = Math.PI - (pipAngle * 0.68 + dipAngle * 0.32);

  return clamp01(averageBend / bendRange);
}

function calculateJointAngle(
  previous: NormalizedLandmark,
  joint: NormalizedLandmark,
  next: NormalizedLandmark,
): number {
  const ax = previous.x - joint.x;
  const ay = previous.y - joint.y;
  const az = (previous.z ?? 0) - (joint.z ?? 0);
  const bx = next.x - joint.x;
  const by = next.y - joint.y;
  const bz = (next.z ?? 0) - (joint.z ?? 0);
  const aLength = Math.hypot(ax, ay, az);
  const bLength = Math.hypot(bx, by, bz);

  if (aLength === 0 || bLength === 0) {
    return Math.PI;
  }

  const dot = ax * bx + ay * by + az * bz;
  return Math.acos(clamp(dot / (aLength * bLength), -1, 1));
}

function smoothFingerCurl(
  previous: HandFingerCurl | null,
  next: HandFingerCurl | null,
  smoothing: number,
): HandFingerCurl | null {
  const from = previous ?? neutralFingerCurl;
  const to = next ?? neutralFingerCurl;
  const result = {
    thumb: lerp(from.thumb, to.thumb, smoothing),
    index: lerp(from.index, to.index, smoothing),
    middle: lerp(from.middle, to.middle, smoothing),
    ring: lerp(from.ring, to.ring, smoothing),
    little: lerp(from.little, to.little, smoothing),
  };

  if (!next && getFingerCurlAverage(result) < 0.015) {
    return null;
  }

  return result;
}

function parseHandSide(categoryName: string | undefined): 'left' | 'right' | null {
  if (categoryName === 'Left') {
    return 'left';
  }

  if (categoryName === 'Right') {
    return 'right';
  }

  return null;
}

function getOppositeHandSide(side: 'left' | 'right'): 'left' | 'right' {
  return side === 'left' ? 'right' : 'left';
}

function getFingerCurlAverage(curl: HandFingerCurl): number {
  return (curl.thumb + curl.index + curl.middle + curl.ring + curl.little) / 5;
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * clamp01(alpha);
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
