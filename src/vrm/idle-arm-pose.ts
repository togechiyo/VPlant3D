export type VrmMetaVersion = '0' | '1' | string | undefined;

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

export function createIdleArmPoseAdjustments(
  metaVersion: VrmMetaVersion,
): IdleArmPoseAdjustment[] {
  if (metaVersion === '1') {
    return [];
  }

  return vrm0IdleArmPoseAdjustments;
}
