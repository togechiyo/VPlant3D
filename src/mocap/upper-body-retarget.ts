import type { UpperBodyPoseSummary } from './pose-landmarks';

export interface UpperBodyRetargetPose {
  enabled: boolean;
  chestYaw: number;
  chestRoll: number;
  neckYaw: number;
  neckRoll: number;
}

export interface UpperBodyRetargetOptions {
  minVisibility: number;
  maxChestYaw: number;
  maxChestRoll: number;
  maxNeckYaw: number;
  maxNeckRoll: number;
}

export const defaultUpperBodyRetargetOptions: UpperBodyRetargetOptions = {
  minVisibility: 0.45,
  maxChestYaw: 0.18,
  maxChestRoll: 0.22,
  maxNeckYaw: 0.08,
  maxNeckRoll: 0.1,
};

export function createUpperBodyRetargetPose(
  summary: UpperBodyPoseSummary,
  options = defaultUpperBodyRetargetOptions,
): UpperBodyRetargetPose {
  if (!summary.poseDetected || summary.averageUpperBodyVisibility < options.minVisibility) {
    return createNeutralRetargetPose(false);
  }

  const torsoLean = summary.torsoLean ?? 0;
  const shoulderTilt = summary.shoulderTilt ?? 0;
  const chestYaw = clamp(-torsoLean * 1.6, -options.maxChestYaw, options.maxChestYaw);
  const chestRoll = clamp(-shoulderTilt * 1.7, -options.maxChestRoll, options.maxChestRoll);

  return {
    enabled: true,
    chestYaw,
    chestRoll,
    neckYaw: clamp(chestYaw * 0.45, -options.maxNeckYaw, options.maxNeckYaw),
    neckRoll: clamp(chestRoll * 0.45, -options.maxNeckRoll, options.maxNeckRoll),
  };
}

export function smoothUpperBodyRetargetPose(
  previous: UpperBodyRetargetPose,
  next: UpperBodyRetargetPose,
  smoothing = 0.22,
): UpperBodyRetargetPose {
  const amount = clamp(smoothing, 0, 1);

  return {
    enabled: next.enabled,
    chestYaw: lerp(previous.chestYaw, next.chestYaw, amount),
    chestRoll: lerp(previous.chestRoll, next.chestRoll, amount),
    neckYaw: lerp(previous.neckYaw, next.neckYaw, amount),
    neckRoll: lerp(previous.neckRoll, next.neckRoll, amount),
  };
}

export function createNeutralRetargetPose(enabled = false): UpperBodyRetargetPose {
  return {
    enabled,
    chestYaw: 0,
    chestRoll: 0,
    neckYaw: 0,
    neckRoll: 0,
  };
}

function lerp(previous: number, next: number, amount: number): number {
  return previous + (next - previous) * amount;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
