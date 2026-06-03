import {
  resolveVrmCompatProfile,
  type IdleArmPoseProfile,
  type VrmMetaVersion,
} from './vrm-version-compat';

export type { VrmMetaVersion } from './vrm-version-compat';

export interface IdleArmPoseAdjustment {
  bone: 'leftUpperArm' | 'rightUpperArm' | 'leftHand' | 'rightHand';
  rotation: [number, number, number];
}

const vrm0IdleArmPoseAdjustments: IdleArmPoseAdjustment[] = [
  { bone: 'leftUpperArm', rotation: [0, 0, 1.12] },
  { bone: 'rightUpperArm', rotation: [0, 0, -1.12] },
  { bone: 'leftHand', rotation: [0, 0.03, 0] },
  { bone: 'rightHand', rotation: [0, -0.03, 0] },
];

const vrm1IdleArmPoseAdjustments: IdleArmPoseAdjustment[] = [
  { bone: 'leftUpperArm', rotation: [0, 0, -1.12] },
  { bone: 'rightUpperArm', rotation: [0, 0, 1.12] },
  { bone: 'leftHand', rotation: [0, 0.03, 0] },
  { bone: 'rightHand', rotation: [0, -0.03, 0] },
];

const idleArmPoseAdjustmentsByProfile: Record<IdleArmPoseProfile, IdleArmPoseAdjustment[]> = {
  vrm0: vrm0IdleArmPoseAdjustments,
  vrm1: vrm1IdleArmPoseAdjustments,
};

export function createIdleArmPoseAdjustments(
  metaVersion: VrmMetaVersion,
): IdleArmPoseAdjustment[] {
  const profile = resolveVrmCompatProfile(metaVersion);
  return idleArmPoseAdjustmentsByProfile[profile.idleArmPoseProfile];
}
