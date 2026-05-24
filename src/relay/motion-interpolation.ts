import { createNeutralHandRetargetPose } from '../mocap/hand-landmarks';
import { createNeutralHeadRetargetPose } from '../mocap/head-retarget';
import { createNeutralRetargetPose } from '../mocap/upper-body-retarget';
import { createNeutralArmIkRetargetPose } from '../mocap/arm-ik-target';
import type { HandRetargetPose, HandRetargetTarget } from '../mocap/hand-landmarks';
import type { HeadRetargetPose } from '../mocap/head-retarget';
import type { UpperBodyRetargetPose } from '../mocap/upper-body-retarget';
import type { ArmIkRetargetPose, ArmIkSideTarget, Vector3Like } from '../mocap/arm-ik-target';
import type { RelayMotionState } from './messages';

export const defaultRelayMotionInterpolationDelayMs = 35;

export interface RelayMotionFrame {
  receivedAt: number;
  state: RelayMotionState;
}

export function sampleRelayMotionFrames(
  previous: RelayMotionFrame | null,
  current: RelayMotionFrame | null,
  now: number,
  delayMs = defaultRelayMotionInterpolationDelayMs,
): RelayMotionState | null {
  if (!current) {
    return null;
  }

  if (!previous) {
    return current.state;
  }

  const targetTime = now - delayMs;

  if (targetTime <= previous.receivedAt) {
    return previous.state;
  }

  if (targetTime >= current.receivedAt) {
    return current.state;
  }

  const amount = clamp01(
    (targetTime - previous.receivedAt) /
      Math.max(current.receivedAt - previous.receivedAt, 1),
  );
  return interpolateRelayMotionState(previous.state, current.state, amount);
}

export function interpolateRelayMotionState(
  previous: RelayMotionState,
  current: RelayMotionState,
  amount: number,
): RelayMotionState {
  const nextAmount = clamp01(amount);
  const arms =
    previous.pose.arms || current.pose.arms
      ? interpolateArmIkPose(
          previous.pose.arms ?? createNeutralArmIkRetargetPose(),
          current.pose.arms ?? createNeutralArmIkRetargetPose(),
          nextAmount,
        )
      : undefined;

  return {
    sequence: current.sequence,
    sentAt: current.sentAt,
    expressions: current.expressions,
    pose: {
      head: interpolateHeadPose(
        previous.pose.head ?? createNeutralHeadRetargetPose(false),
        current.pose.head ?? createNeutralHeadRetargetPose(false),
        nextAmount,
      ),
      upperBody: interpolateUpperBodyPose(
        previous.pose.upperBody ?? createNeutralRetargetPose(false),
        current.pose.upperBody ?? createNeutralRetargetPose(false),
        nextAmount,
      ),
      hands: interpolateHandPose(
        previous.pose.hands ?? createNeutralHandRetargetPose(),
        current.pose.hands ?? createNeutralHandRetargetPose(),
        nextAmount,
      ),
      arms,
    },
  };
}

function interpolateHeadPose(
  previous: HeadRetargetPose,
  current: HeadRetargetPose,
  amount: number,
): HeadRetargetPose {
  if (!current.enabled) {
    return previous.enabled ? previous : current;
  }

  if (!previous.enabled) {
    return current;
  }

  return {
    enabled: true,
    pitch: lerp(previous.pitch, current.pitch, amount),
    yaw: lerp(previous.yaw, current.yaw, amount),
    roll: lerp(previous.roll, current.roll, amount),
  };
}

function interpolateUpperBodyPose(
  previous: UpperBodyRetargetPose,
  current: UpperBodyRetargetPose,
  amount: number,
): UpperBodyRetargetPose {
  if (!current.enabled) {
    return previous.enabled ? previous : current;
  }

  if (!previous.enabled) {
    return current;
  }

  return {
    enabled: true,
    chestYaw: lerp(previous.chestYaw, current.chestYaw, amount),
    chestRoll: lerp(previous.chestRoll, current.chestRoll, amount),
    neckYaw: lerp(previous.neckYaw, current.neckYaw, amount),
    neckRoll: lerp(previous.neckRoll, current.neckRoll, amount),
    leftUpperArmRoll: lerp(previous.leftUpperArmRoll, current.leftUpperArmRoll, amount),
    rightUpperArmRoll: lerp(previous.rightUpperArmRoll, current.rightUpperArmRoll, amount),
    leftLowerArmRoll: lerp(previous.leftLowerArmRoll, current.leftLowerArmRoll, amount),
    rightLowerArmRoll: lerp(previous.rightLowerArmRoll, current.rightLowerArmRoll, amount),
  };
}

function interpolateHandPose(
  previous: HandRetargetPose,
  current: HandRetargetPose,
  amount: number,
): HandRetargetPose {
  return {
    left: interpolateHandTarget(previous.left, current.left, amount),
    right: interpolateHandTarget(previous.right, current.right, amount),
  };
}

function interpolateHandTarget(
  previous: HandRetargetTarget | null,
  current: HandRetargetTarget | null,
  amount: number,
): HandRetargetTarget | null {
  if (!previous || !current) {
    return current ?? previous;
  }

  return {
    fingers: {
      thumb: lerp(previous.fingers.thumb, current.fingers.thumb, amount),
      index: lerp(previous.fingers.index, current.fingers.index, amount),
      middle: lerp(previous.fingers.middle, current.fingers.middle, amount),
      ring: lerp(previous.fingers.ring, current.fingers.ring, amount),
      little: lerp(previous.fingers.little, current.fingers.little, amount),
    },
    wristPitch: lerp(previous.wristPitch, current.wristPitch, amount),
    wristYaw: lerp(previous.wristYaw, current.wristYaw, amount),
    wristRoll: lerp(previous.wristRoll, current.wristRoll, amount),
  };
}

function interpolateArmIkPose(
  previous: ArmIkRetargetPose,
  current: ArmIkRetargetPose,
  amount: number,
): ArmIkRetargetPose {
  return {
    left: interpolateArmIkTarget(previous.left, current.left, amount),
    right: interpolateArmIkTarget(previous.right, current.right, amount),
  };
}

function interpolateArmIkTarget(
  previous: ArmIkSideTarget | null,
  current: ArmIkSideTarget | null,
  amount: number,
): ArmIkSideTarget | null {
  if (!previous || !current) {
    return current ?? previous;
  }

  return {
    enabled: current.enabled,
    side: current.side,
    shoulder: interpolateVector3(previous.shoulder, current.shoulder, amount),
    elbow: interpolateVector3(previous.elbow, current.elbow, amount),
    wrist: interpolateVector3(previous.wrist, current.wrist, amount),
    pole: interpolateVector3(previous.pole, current.pole, amount),
    confidence: lerp(previous.confidence, current.confidence, amount),
  };
}

function interpolateVector3(
  previous: Vector3Like,
  current: Vector3Like,
  amount: number,
): Vector3Like {
  return {
    x: lerp(previous.x, current.x, amount),
    y: lerp(previous.y, current.y, amount),
    z: lerp(previous.z, current.z, amount),
  };
}

function lerp(previous: number, current: number, amount: number): number {
  return previous + (current - previous) * amount;
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
