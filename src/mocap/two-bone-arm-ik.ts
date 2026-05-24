import type { Vector3Like } from './arm-ik-target';

export interface TwoBoneArmIkInput {
  targetWrist: Vector3Like;
  pole: Vector3Like;
  upperLength: number;
  lowerLength: number;
}

export interface TwoBoneArmIkResult {
  elbow: Vector3Like;
  wrist: Vector3Like;
  clamped: boolean;
}

const fallbackPole: Vector3Like = {
  x: 0,
  y: -1,
  z: 0,
};

export function solveTwoBoneArmIk(input: TwoBoneArmIkInput): TwoBoneArmIkResult {
  const upperLength = Math.max(input.upperLength, 0.0001);
  const lowerLength = Math.max(input.lowerLength, 0.0001);
  const maxReach = Math.max(upperLength + lowerLength - 0.0001, 0.0001);
  const minReach = Math.max(Math.abs(upperLength - lowerLength) + 0.0001, 0.0001);
  const targetDistance = length(input.targetWrist);
  const solvedDistance = clamp(targetDistance, minReach, maxReach);
  const targetDirection =
    targetDistance > 0.0001
      ? normalize(input.targetWrist)
      : { x: 1, y: 0, z: 0 };
  const wrist = scale(targetDirection, solvedDistance);
  const poleDirection = normalize(projectOnPlane(input.pole, targetDirection));
  const safePole = length(poleDirection) > 0.0001
    ? poleDirection
    : normalize(projectOnPlane(fallbackPole, targetDirection));
  const elbowForward = clamp(
    (upperLength * upperLength - lowerLength * lowerLength + solvedDistance * solvedDistance) /
      (2 * solvedDistance),
    -upperLength,
    upperLength,
  );
  const elbowSide = Math.sqrt(Math.max(upperLength * upperLength - elbowForward * elbowForward, 0));
  const elbow = add(scale(targetDirection, elbowForward), scale(safePole, elbowSide));

  return {
    elbow,
    wrist,
    clamped: Math.abs(solvedDistance - targetDistance) > 0.0001,
  };
}

export function subtract(first: Vector3Like, second: Vector3Like): Vector3Like {
  return {
    x: first.x - second.x,
    y: first.y - second.y,
    z: first.z - second.z,
  };
}

export function length(vector: Vector3Like): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

export function normalize(vector: Vector3Like): Vector3Like {
  const vectorLength = length(vector);

  if (vectorLength <= 0.0001) {
    return { x: 0, y: 0, z: 0 };
  }

  return scale(vector, 1 / vectorLength);
}

function projectOnPlane(vector: Vector3Like, normal: Vector3Like): Vector3Like {
  const normalLength = length(normal);

  if (normalLength <= 0.0001) {
    return vector;
  }

  const unitNormal = normalize(normal);
  return subtract(vector, scale(unitNormal, dot(vector, unitNormal)));
}

function add(first: Vector3Like, second: Vector3Like): Vector3Like {
  return {
    x: first.x + second.x,
    y: first.y + second.y,
    z: first.z + second.z,
  };
}

function scale(vector: Vector3Like, amount: number): Vector3Like {
  return {
    x: vector.x * amount,
    y: vector.y * amount,
    z: vector.z * amount,
  };
}

function dot(first: Vector3Like, second: Vector3Like): number {
  return first.x * second.x + first.y * second.y + first.z * second.z;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
