import type { Vector3Like } from './arm-ik-target';

export interface FrontBiasedArmIkTargetInput {
  targetWrist: Vector3Like;
  pole: Vector3Like;
  restWrist: Vector3Like;
  restElbow: Vector3Like;
  armReach: number;
}

export interface FrontBiasedArmIkTargetOptions {
  wristForwardRatio: number;
  poleForwardRatio: number;
  poleDownRatio: number;
  poleOutwardRatio: number;
  poleWristFollow: number;
}

export const defaultFrontBiasedArmIkTargetOptions: FrontBiasedArmIkTargetOptions = {
  wristForwardRatio: 0.24,
  poleForwardRatio: 0.46,
  poleDownRatio: 0.08,
  poleOutwardRatio: 0.08,
  poleWristFollow: 0.18,
};

export function biasArmIkTargetToFront(
  input: FrontBiasedArmIkTargetInput,
  options: Partial<FrontBiasedArmIkTargetOptions> = {},
): { targetWrist: Vector3Like; pole: Vector3Like } {
  const nextOptions = {
    ...defaultFrontBiasedArmIkTargetOptions,
    ...options,
  };
  const armReach = Math.max(input.armReach, 0);
  const minWristZ = input.restWrist.z + armReach * nextOptions.wristForwardRatio;
  const minPoleZ = input.restElbow.z + armReach * nextOptions.poleForwardRatio;
  const outwardSign = getOutwardSign(input.restElbow, input.restWrist);
  const followedPoleX =
    input.restElbow.x + (input.targetWrist.x - input.restWrist.x) * nextOptions.poleWristFollow;
  const minOutwardX = Math.abs(input.restElbow.x) + armReach * nextOptions.poleOutwardRatio;
  const stablePoleX = outwardSign * Math.max(Math.abs(followedPoleX), minOutwardX);
  const maxPoleY = input.restElbow.y - armReach * nextOptions.poleDownRatio;

  return {
    targetWrist: {
      ...input.targetWrist,
      z: Math.max(input.targetWrist.z, minWristZ),
    },
    pole: {
      ...input.pole,
      x: stablePoleX,
      y: Math.min(input.pole.y, maxPoleY),
      z: Math.max(input.pole.z, minPoleZ),
    },
  };
}

function getOutwardSign(restElbow: Vector3Like, restWrist: Vector3Like): 1 | -1 {
  const source = Math.abs(restElbow.x) > 0.0001 ? restElbow.x : restWrist.x;
  return source < 0 ? -1 : 1;
}
