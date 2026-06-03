import type { HeadRetargetPose } from './head-retarget';

export type HeadVrmMetaVersion = '0' | '1' | string | undefined;

export function getDefaultPoseMirrorInputForVrm(metaVersion: HeadVrmMetaVersion): boolean {
  return metaVersion !== '1';
}

export function adaptHeadRetargetPoseForVrm(
  pose: HeadRetargetPose,
  metaVersion: HeadVrmMetaVersion,
): HeadRetargetPose {
  if (metaVersion !== '1') {
    return pose;
  }

  return {
    ...pose,
    pitch: -pose.pitch,
  };
}
