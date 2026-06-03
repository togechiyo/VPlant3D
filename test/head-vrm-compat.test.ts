import { describe, expect, it } from 'vitest';

import {
  adaptHeadRetargetPoseForVrm,
  adaptUpperBodyRetargetPoseForVrm,
  getDefaultPoseMirrorInputForVrm,
  getUpperBodyMirrorInputForVrm,
} from '../src/mocap/head-vrm-compat';
import type { HeadRetargetPose } from '../src/mocap/head-retarget';
import type { UpperBodyRetargetPose } from '../src/mocap/upper-body-retarget';

describe('head VRM compatibility', () => {
  it('keeps mirror input on for VRM 1.0', () => {
    expect(getDefaultPoseMirrorInputForVrm('1')).toBe(true);
  });

  it('keeps mirror input on for VRM 0.x or unknown metadata', () => {
    expect(getDefaultPoseMirrorInputForVrm('0')).toBe(true);
    expect(getDefaultPoseMirrorInputForVrm(undefined)).toBe(true);
  });

  it('keeps upper-body mirror interpretation for VRM 1.0', () => {
    expect(getUpperBodyMirrorInputForVrm(true, '1')).toBe(true);
    expect(getUpperBodyMirrorInputForVrm(false, '1')).toBe(false);
  });

  it('keeps upper-body mirror interpretation for VRM 0.x or unknown metadata', () => {
    expect(getUpperBodyMirrorInputForVrm(true, '0')).toBe(true);
    expect(getUpperBodyMirrorInputForVrm(false, '0')).toBe(false);
    expect(getUpperBodyMirrorInputForVrm(true, undefined)).toBe(true);
  });

  it('uses camera-specific head signs for VRM 1.0 mocap', () => {
    const pose: HeadRetargetPose = {
      enabled: true,
      pitch: 0.1,
      yaw: 0.2,
      roll: -0.3,
    };

    expect(adaptHeadRetargetPoseForVrm(pose, '1')).toEqual({
      enabled: true,
      pitch: -0.1,
      yaw: 0.2,
      roll: 0.3,
    });
  });

  it('leaves VRM 0.x head mocap unchanged', () => {
    const pose: HeadRetargetPose = {
      enabled: true,
      pitch: 0.1,
      yaw: 0.2,
      roll: -0.3,
    };

    expect(adaptHeadRetargetPoseForVrm(pose, '0')).toEqual(pose);
  });

  it('uses camera-specific upper body signs for VRM 1.0 mocap', () => {
    const pose: UpperBodyRetargetPose = {
      enabled: true,
      chestYaw: 0.12,
      chestRoll: -0.18,
      neckYaw: 0.05,
      neckRoll: -0.07,
      leftUpperArmRoll: -0.2,
      rightUpperArmRoll: 0.2,
      leftLowerArmRoll: -0.4,
      rightLowerArmRoll: 0.4,
    };

    expect(adaptUpperBodyRetargetPoseForVrm(pose, '1')).toEqual({
      ...pose,
      chestYaw: 0.12,
      chestRoll: 0.18,
      neckYaw: 0.05,
      neckRoll: 0.07,
    });
  });

  it('leaves VRM 0.x upper body mocap unchanged', () => {
    const pose: UpperBodyRetargetPose = {
      enabled: true,
      chestYaw: 0.12,
      chestRoll: -0.18,
      neckYaw: 0.05,
      neckRoll: -0.07,
      leftUpperArmRoll: -0.2,
      rightUpperArmRoll: 0.2,
      leftLowerArmRoll: -0.4,
      rightLowerArmRoll: 0.4,
    };

    expect(adaptUpperBodyRetargetPoseForVrm(pose, '0')).toEqual(pose);
  });
});
