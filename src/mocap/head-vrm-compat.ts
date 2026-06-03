import type { HeadRetargetPose } from './head-retarget';
import type { UpperBodyRetargetPose } from './upper-body-retarget';
import {
  getDefaultPoseMirrorInputForVrm as getDefaultPoseMirrorInputForVrmProfile,
  resolveVrmCompatProfile,
  type VrmMetaVersion,
} from '../vrm/vrm-version-compat';

export type HeadVrmMetaVersion = VrmMetaVersion;

export function getDefaultPoseMirrorInputForVrm(metaVersion: HeadVrmMetaVersion): boolean {
  return getDefaultPoseMirrorInputForVrmProfile(metaVersion);
}

export function getUpperBodyMirrorInputForVrm(
  mirrorInput: boolean,
  metaVersion: HeadVrmMetaVersion,
): boolean {
  return resolveVrmCompatProfile(metaVersion, mirrorInput).bodyMirrorInput;
}

export function adaptHeadRetargetPoseForVrm(
  pose: HeadRetargetPose,
  metaVersion: HeadVrmMetaVersion,
): HeadRetargetPose {
  const profile = resolveVrmCompatProfile(metaVersion);

  return {
    ...pose,
    pitch: pose.pitch * profile.cameraHeadSigns.pitch,
    yaw: pose.yaw * profile.cameraHeadSigns.yaw,
    roll: pose.roll * profile.cameraHeadSigns.roll,
  };
}

export function adaptUpperBodyRetargetPoseForVrm(
  pose: UpperBodyRetargetPose,
  metaVersion: HeadVrmMetaVersion,
): UpperBodyRetargetPose {
  const profile = resolveVrmCompatProfile(metaVersion);

  return {
    ...pose,
    chestYaw: pose.chestYaw * profile.cameraUpperBodySigns.chestYaw,
    chestRoll: pose.chestRoll * profile.cameraUpperBodySigns.chestRoll,
    neckYaw: pose.neckYaw * profile.cameraUpperBodySigns.neckYaw,
    neckRoll: pose.neckRoll * profile.cameraUpperBodySigns.neckRoll,
  };
}
