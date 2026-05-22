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
  trackArms: boolean;
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
  trackArms: true,
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
  const leftLowerArmBend = options.mirrorInput
    ? (summary.rightLowerArmBend ?? 0)
    : (summary.leftLowerArmBend ?? 0);
  const rightLowerArmBend = options.mirrorInput
    ? (summary.leftLowerArmBend ?? 0)
    : (summary.rightLowerArmBend ?? 0);
  const leftLowerArmMotion = Math.max(leftLowerArmBend, leftLowerArmLift * 0.45);
  const rightLowerArmMotion = Math.max(rightLowerArmBend, rightLowerArmLift * 0.45);
  const leftUpperArmRoll = options.trackArms
    ? clamp(-leftArmLift * options.maxArmRoll, -options.maxArmRoll, 0)
    : 0;
  const rightUpperArmRoll = options.trackArms
    ? clamp(rightArmLift * options.maxArmRoll, 0, options.maxArmRoll)
    : 0;
  const leftLowerArmRoll = options.trackArms
    ? clamp(-leftLowerArmMotion * options.maxLowerArmRoll, -options.maxLowerArmRoll, 0)
    : 0;
  const rightLowerArmRoll = options.trackArms
    ? clamp(rightLowerArmMotion * options.maxLowerArmRoll, 0, options.maxLowerArmRoll)
    : 0;

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

  if (!next.enabled) {
    return {
      enabled: hasVisibleMotion(previous, 0.006),
      chestYaw: previous.chestYaw,
      chestRoll: previous.chestRoll,
      neckYaw: previous.neckYaw,
      neckRoll: previous.neckRoll,
      leftUpperArmRoll: previous.leftUpperArmRoll,
      rightUpperArmRoll: previous.rightUpperArmRoll,
      leftLowerArmRoll: previous.leftLowerArmRoll,
      rightLowerArmRoll: previous.rightLowerArmRoll,
    };
  }

  const nextEnabled = next.enabled || hasVisibleMotion(previous, 0.006);

  return {
    enabled: nextEnabled,
    chestYaw: lerpWithDeadband(previous.chestYaw, next.chestYaw, amount, 0.005),
    chestRoll: lerpWithDeadband(previous.chestRoll, next.chestRoll, amount, 0.005),
    neckYaw: lerpWithDeadband(previous.neckYaw, next.neckYaw, amount, 0.004),
    neckRoll: lerpWithDeadband(previous.neckRoll, next.neckRoll, amount, 0.004),
    leftUpperArmRoll: lerpWithDeadband(previous.leftUpperArmRoll, next.leftUpperArmRoll, amount, 0.01),
    rightUpperArmRoll: lerpWithDeadband(previous.rightUpperArmRoll, next.rightUpperArmRoll, amount, 0.01),
    leftLowerArmRoll: lerpWithDeadband(previous.leftLowerArmRoll, next.leftLowerArmRoll, amount, 0.012),
    rightLowerArmRoll: lerpWithDeadband(previous.rightLowerArmRoll, next.rightLowerArmRoll, amount, 0.012),
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
