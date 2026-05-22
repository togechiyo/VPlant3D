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

export interface HandRetargetTarget {
  fingers: HandFingerCurl;
  wristPitch: number;
  wristYaw: number;
  wristRoll: number;
}

export interface HandRetargetPose {
  left: HandRetargetTarget | null;
  right: HandRetargetTarget | null;
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
    pose[targetSide] = createHandTarget(hand, options);
  }

  return pose;
}

export function smoothHandRetargetPose(
  previous: HandRetargetPose,
  next: HandRetargetPose,
  smoothing = 0.38,
): HandRetargetPose {
  return {
    left: smoothHandTarget(previous.left, next.left, smoothing),
    right: smoothHandTarget(previous.right, next.right, smoothing),
  };
}

export function getHandPoseGripAmount(pose: HandRetargetPose): number {
  const targets = [pose.left, pose.right].filter(
    (target): target is HandRetargetTarget => target !== null,
  );
  const values = targets.flatMap((target) => [
    target.fingers.thumb,
    target.fingers.index,
    target.fingers.middle,
    target.fingers.ring,
    target.fingers.little,
  ]);

  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function createHandTarget(
  hand: NormalizedLandmark[],
  options: HandRetargetOptions,
): HandRetargetTarget {
  const motionHand = options.mirrorInput ? mirrorHandX(hand) : hand;
  return {
    fingers: createFingerCurl(hand),
    ...createWristRotation(motionHand),
  };
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

function createWristRotation(hand: NormalizedLandmark[]): Pick<
  HandRetargetTarget,
  'wristPitch' | 'wristYaw' | 'wristRoll'
> {
  const wrist = hand[0];
  const middleMcp = hand[9];
  const middleTip = hand[12];
  const indexMcp = hand[5];
  const littleMcp = hand[17];

  if (!wrist || !middleMcp || !middleTip || !indexMcp || !littleMcp) {
    return {
      wristPitch: 0,
      wristYaw: 0,
      wristRoll: 0,
    };
  }

  const fingerDirectionX = middleMcp.x - wrist.x;
  const fingerDirectionY = middleMcp.y - wrist.y;
  const fingerAngle = Math.atan2(fingerDirectionY, fingerDirectionX);
  const wristRoll = clamp(normalizeAngle(fingerAngle + Math.PI / 2), -0.95, 0.95);
  const palmCenterX = (indexMcp.x + middleMcp.x + littleMcp.x) / 3;
  const palmCenterZ = ((indexMcp.z ?? 0) + (middleMcp.z ?? 0) + (littleMcp.z ?? 0)) / 3;
  const wristYaw = clamp((palmCenterX - wrist.x) * 3.2 + palmCenterZ * 0.8, -0.55, 0.55);
  const fingerLength = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
  const wristPitch = clamp((0.42 - fingerLength) * 1.6, -0.42, 0.42);

  return {
    wristPitch,
    wristYaw,
    wristRoll,
  };
}

function smoothHandTarget(
  previous: HandRetargetTarget | null,
  next: HandRetargetTarget | null,
  smoothing: number,
): HandRetargetTarget | null {
  if (!next) {
    return previous;
  }

  const fromFingers = previous?.fingers ?? neutralFingerCurl;
  const toFingers = next.fingers;
  const result: HandRetargetTarget = {
    fingers: {
      thumb: lerpWithDeadband(fromFingers.thumb, toFingers.thumb, smoothing, 0.015),
      index: lerpWithDeadband(fromFingers.index, toFingers.index, smoothing, 0.015),
      middle: lerpWithDeadband(fromFingers.middle, toFingers.middle, smoothing, 0.015),
      ring: lerpWithDeadband(fromFingers.ring, toFingers.ring, smoothing, 0.015),
      little: lerpWithDeadband(fromFingers.little, toFingers.little, smoothing, 0.015),
    },
    wristPitch: lerpWithDeadband(previous?.wristPitch ?? 0, next.wristPitch, smoothing, 0.008),
    wristYaw: lerpWithDeadband(previous?.wristYaw ?? 0, next.wristYaw, smoothing, 0.008),
    wristRoll: lerpWithDeadband(previous?.wristRoll ?? 0, next.wristRoll, smoothing, 0.008),
  };

  return result;
}

function mirrorHandX(hand: NormalizedLandmark[]): NormalizedLandmark[] {
  return hand.map((landmark) => ({
    ...landmark,
    x: 1 - landmark.x,
  }));
}

function normalizeAngle(value: number): number {
  let nextValue = value;

  while (nextValue > Math.PI) {
    nextValue -= Math.PI * 2;
  }

  while (nextValue < -Math.PI) {
    nextValue += Math.PI * 2;
  }

  return nextValue;
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

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * clamp01(alpha);
}

function lerpWithDeadband(from: number, to: number, alpha: number, deadband: number): number {
  return Math.abs(to - from) < deadband ? from : lerp(from, to, alpha);
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
