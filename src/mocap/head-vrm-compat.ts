import type { HeadRetargetPose } from './head-retarget';
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
    pitch: pose.pitch * profile.headPitchSign,
  };
}
