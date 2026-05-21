import type { UpperBodyPoseSummary } from './pose-landmarks';

export interface UpperBodyRetargetPose {
  enabled: boolean;
  chestYaw: number;
  chestRoll: number;
  neckYaw: number;
  neckRoll: number;
  leftUpperArmRoll: number;
  rightUpperArmRoll: number;
  leftLowerArmRoll: number;
  rightLowerArmRoll: number;
}

export interface UpperBodyRetargetOptions {
  minVisibility: number;
  mirrorInput: boolean;
  maxChestYaw: number;
  maxChestRoll: number;
  maxNeckYaw: number;
  maxNeckRoll: number;
  maxArmRoll: number;
  maxLowerArmRoll: number;
}

export const defaultUpperBodyRetargetOptions: UpperBodyRetargetOptions = {
  minVisibility: 0.32,
  mirrorInput: true,
  maxChestYaw: 0.26,
  maxChestRoll: 0.34,
  maxNeckYaw: 0.12,
  maxNeckRoll: 0.15,
  maxArmRoll: 0.58,
  maxLowerArmRoll: 1.08,
};

export function createUpperBodyRetargetPose(
  summary: UpperBodyPoseSummary,
  options = defaultUpperBodyRetargetOptions,
): UpperBodyRetargetPose {
  if (!summary.poseDetected || summary.averageUpperBodyVisibility < options.minVisibility) {
    return createNeutralRetargetPose(false);
  }

  const inputDirection = options.mirrorInput ? -1 : 1;
  const torsoTurnDirection = options.mirrorInput ? 1 : -1;
  const torsoLean = (summary.torsoLean ?? 0) * inputDirection;
  const shoulderTilt = (summary.shoulderTilt ?? 0) * inputDirection;
  const torsoTurn = (summary.torsoTurn ?? 0) * torsoTurnDirection;
  const chestYaw = clamp(
    -torsoLean * 2.4 + torsoTurn * 0.34,
    -options.maxChestYaw,
    options.maxChestYaw,
  );
  const chestRoll = clamp(-shoulderTilt * 1.9, -options.maxChestRoll, options.maxChestRoll);
  const leftArmLift = options.mirrorInput
    ? (summary.rightArmLift ?? 0)
    : (summary.leftArmLift ?? 0);
  const rightArmLift = options.mirrorInput
    ? (summary.leftArmLift ?? 0)
    : (summary.rightArmLift ?? 0);
  const leftLowerArmLift = options.mirrorInput
    ? (summary.rightLowerArmLift ?? 0)
    : (summary.leftLowerArmLift ?? 0);
  const rightLowerArmLift = options.mirrorInput
    ? (summary.leftLowerArmLift ?? 0)
    : (summary.rightLowerArmLift ?? 0);
  const leftUpperArmRoll = clamp(
    -leftArmLift * options.maxArmRoll,
    -options.maxArmRoll,
    0,
  );
  const rightUpperArmRoll = clamp(
    rightArmLift * options.maxArmRoll,
    0,
    options.maxArmRoll,
  );
  const leftLowerArmRoll = clamp(
    -leftLowerArmLift * options.maxLowerArmRoll,
    -options.maxLowerArmRoll,
    0,
  );
  const rightLowerArmRoll = clamp(
    rightLowerArmLift * options.maxLowerArmRoll,
    0,
    options.maxLowerArmRoll,
  );

  return {
    enabled: true,
    chestYaw,
    chestRoll,
    neckYaw: clamp(chestYaw * 0.45, -options.maxNeckYaw, options.maxNeckYaw),
    neckRoll: clamp(chestRoll * 0.32, -options.maxNeckRoll, options.maxNeckRoll),
    leftUpperArmRoll,
    rightUpperArmRoll,
    leftLowerArmRoll,
    rightLowerArmRoll,
  };
}

export function smoothUpperBodyRetargetPose(
  previous: UpperBodyRetargetPose,
  next: UpperBodyRetargetPose,
  smoothing = 0.34,
): UpperBodyRetargetPose {
  const amount = clamp(smoothing, 0, 1);
  const nextEnabled = next.enabled || hasVisibleMotion(previous, 0.006);

  return {
    enabled: nextEnabled,
    chestYaw: lerp(previous.chestYaw, next.chestYaw, amount),
    chestRoll: lerp(previous.chestRoll, next.chestRoll, amount),
    neckYaw: lerp(previous.neckYaw, next.neckYaw, amount),
    neckRoll: lerp(previous.neckRoll, next.neckRoll, amount),
    leftUpperArmRoll: lerp(previous.leftUpperArmRoll, next.leftUpperArmRoll, amount),
    rightUpperArmRoll: lerp(previous.rightUpperArmRoll, next.rightUpperArmRoll, amount),
    leftLowerArmRoll: lerp(previous.leftLowerArmRoll, next.leftLowerArmRoll, amount),
    rightLowerArmRoll: lerp(previous.rightLowerArmRoll, next.rightLowerArmRoll, amount),
  };
}

export function createNeutralRetargetPose(enabled = false): UpperBodyRetargetPose {
  return {
    enabled,
    chestYaw: 0,
    chestRoll: 0,
    neckYaw: 0,
    neckRoll: 0,
    leftUpperArmRoll: 0,
    rightUpperArmRoll: 0,
    leftLowerArmRoll: 0,
    rightLowerArmRoll: 0,
  };
}

function lerp(previous: number, next: number, amount: number): number {
  return previous + (next - previous) * amount;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function hasVisibleMotion(pose: UpperBodyRetargetPose, threshold: number): boolean {
  return (
    Math.abs(pose.chestYaw) > threshold ||
    Math.abs(pose.chestRoll) > threshold ||
    Math.abs(pose.neckYaw) > threshold ||
    Math.abs(pose.neckRoll) > threshold ||
    Math.abs(pose.leftUpperArmRoll) > threshold ||
    Math.abs(pose.rightUpperArmRoll) > threshold ||
    Math.abs(pose.leftLowerArmRoll) > threshold ||
    Math.abs(pose.rightLowerArmRoll) > threshold
  );
}
