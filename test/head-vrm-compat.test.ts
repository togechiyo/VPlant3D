import { describe, expect, it } from 'vitest';

import {
  adaptHeadRetargetPoseForVrm,
  getDefaultPoseMirrorInputForVrm,
} from '../src/mocap/head-vrm-compat';
import type { HeadRetargetPose } from '../src/mocap/head-retarget';

describe('head VRM compatibility', () => {
  it('defaults mirror input off for VRM 1.0', () => {
    expect(getDefaultPoseMirrorInputForVrm('1')).toBe(false);
  });

  it('keeps mirror input on for VRM 0.x or unknown metadata', () => {
    expect(getDefaultPoseMirrorInputForVrm('0')).toBe(true);
    expect(getDefaultPoseMirrorInputForVrm(undefined)).toBe(true);
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
