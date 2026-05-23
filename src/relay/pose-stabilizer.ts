import type { RelayPoseState } from './messages';

export interface RelayPoseStabilizer {
  previous: RelayPoseState;
  holdUntil: {
    head: number;
    upperBody: number;
  };
}

export interface RelayPoseStabilizerOptions {
  headHoldMs?: number;
  upperBodyHoldMs?: number;
  activationThreshold?: number;
  zeroThreshold?: number;
  sharpDropRatio?: number;
}

export function createRelayPoseStabilizer(): RelayPoseStabilizer {
  return {
    previous: {},
    holdUntil: {
      head: 0,
      upperBody: 0,
    },
  };
}

export function stabilizeRelayPoseState(
  candidate: RelayPoseState,
  stabilizer: RelayPoseStabilizer,
  now: number,
  options: RelayPoseStabilizerOptions = {},
): RelayPoseState {
  const next: RelayPoseState = { ...candidate };
  const activationThreshold = options.activationThreshold ?? 0.025;
  const zeroThreshold = options.zeroThreshold ?? 0.006;
  const sharpDropRatio = options.sharpDropRatio ?? 0.32;

  next.head = stabilizePart(
    candidate.head,
    stabilizer.previous.head,
    stabilizer.holdUntil.head,
    now,
    options.headHoldMs ?? 0,
    activationThreshold,
    zeroThreshold,
    sharpDropRatio,
    getHeadMagnitude,
    (holdUntil) => {
      stabilizer.holdUntil.head = holdUntil;
    },
  );

  next.upperBody = stabilizePart(
    candidate.upperBody,
    stabilizer.previous.upperBody,
    stabilizer.holdUntil.upperBody,
    now,
    options.upperBodyHoldMs ?? 0,
    activationThreshold,
    zeroThreshold,
    sharpDropRatio,
    getUpperBodyMagnitude,
    (holdUntil) => {
      stabilizer.holdUntil.upperBody = holdUntil;
    },
  );

  stabilizer.previous = next;
  return next;
}

function stabilizePart<T>(
  candidate: T | undefined,
  previous: T | undefined,
  holdUntil: number,
  now: number,
  holdMs: number,
  activationThreshold: number,
  zeroThreshold: number,
  sharpDropRatio: number,
  getMagnitude: (pose: T) => number,
  setHoldUntil: (holdUntil: number) => void,
): T | undefined {
  if (!candidate || !previous || holdMs <= 0) {
    setHoldUntil(0);
    return candidate;
  }

  const previousMagnitude = getMagnitude(previous);
  const candidateMagnitude = getMagnitude(candidate);

  if (candidateMagnitude >= previousMagnitude) {
    setHoldUntil(0);
    return candidate;
  }

  const isSharpDrop =
    previousMagnitude >= activationThreshold &&
    candidateMagnitude <= Math.max(zeroThreshold, previousMagnitude * sharpDropRatio);

  const nextHoldUntil = isSharpDrop ? Math.max(holdUntil, now + holdMs) : holdUntil;
  setHoldUntil(nextHoldUntil);

  return nextHoldUntil > now ? previous : candidate;
}

function getHeadMagnitude(head: NonNullable<RelayPoseState['head']>): number {
  if (!head.enabled) {
    return 0;
  }

  return Math.max(Math.abs(head.pitch), Math.abs(head.yaw), Math.abs(head.roll));
}

function getUpperBodyMagnitude(upperBody: NonNullable<RelayPoseState['upperBody']>): number {
  if (!upperBody.enabled) {
    return 0;
  }

  return Math.max(
    Math.abs(upperBody.chestYaw),
    Math.abs(upperBody.chestRoll),
    Math.abs(upperBody.neckYaw),
    Math.abs(upperBody.neckRoll),
    Math.abs(upperBody.leftUpperArmRoll),
    Math.abs(upperBody.rightUpperArmRoll),
    Math.abs(upperBody.leftLowerArmRoll),
    Math.abs(upperBody.rightLowerArmRoll),
  );
}
