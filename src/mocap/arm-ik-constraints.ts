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
}

export const defaultFrontBiasedArmIkTargetOptions: FrontBiasedArmIkTargetOptions = {
  wristForwardRatio: 0.18,
  poleForwardRatio: 0.34,
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

  return {
    targetWrist: {
      ...input.targetWrist,
      z: Math.max(input.targetWrist.z, minWristZ),
    },
    pole: {
      ...input.pole,
      z: Math.max(input.pole.z, minPoleZ),
    },
  };
}
