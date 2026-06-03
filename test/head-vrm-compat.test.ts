import { describe, expect, it } from 'vitest';

import {
  adaptHeadRetargetPoseForVrm,
  getDefaultPoseMirrorInputForVrm,
  getUpperBodyMirrorInputForVrm,
} from '../src/mocap/head-vrm-compat';
import type { HeadRetargetPose } from '../src/mocap/head-retarget';

describe('head VRM compatibility', () => {
  it('keeps mirror input on for VRM 1.0', () => {
    expect(getDefaultPoseMirrorInputForVrm('1')).toBe(true);
  });

  it('keeps mirror input on for VRM 0.x or unknown metadata', () => {
    expect(getDefaultPoseMirrorInputForVrm('0')).toBe(true);
    expect(getDefaultPoseMirrorInputForVrm(undefined)).toBe(true);
  });

  it('inverts upper-body mirror interpretation for VRM 1.0', () => {
    expect(getUpperBodyMirrorInputForVrm(true, '1')).toBe(false);
    expect(getUpperBodyMirrorInputForVrm(false, '1')).toBe(true);
  });

  it('keeps upper-body mirror interpretation for VRM 0.x or unknown metadata', () => {
    expect(getUpperBodyMirrorInputForVrm(true, '0')).toBe(true);
    expect(getUpperBodyMirrorInputForVrm(false, '0')).toBe(false);
    expect(getUpperBodyMirrorInputForVrm(true, undefined)).toBe(true);
  });

  it('flips only pitch for VRM 1.0 head mocap', () => {
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
      roll: -0.3,
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
});
