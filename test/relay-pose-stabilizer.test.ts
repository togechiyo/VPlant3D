import { describe, expect, it } from 'vitest';

import {
  createRelayPoseStabilizer,
  stabilizeRelayPoseState,
} from '../src/relay/pose-stabilizer';

describe('relay pose stabilizer', () => {
  it('holds a one-frame head zero dropout before relay send', () => {
    const stabilizer = createRelayPoseStabilizer();

    const turning = stabilizeRelayPoseState(
      { head: { enabled: true, pitch: 0.08, yaw: 0.44, roll: 0.04 } },
      stabilizer,
      1000,
      { headHoldMs: 260 },
    );
    const dropout = stabilizeRelayPoseState(
      { head: { enabled: false, pitch: 0, yaw: 0, roll: 0 } },
      stabilizer,
      1033,
      { headHoldMs: 260 },
    );

    expect(turning.head?.yaw).toBeCloseTo(0.44);
    expect(dropout.head?.enabled).toBe(true);
    expect(dropout.head?.yaw).toBeCloseTo(0.44);
  });

  it('holds a sharp upper body near-zero dropout while tracking is active', () => {
    const stabilizer = createRelayPoseStabilizer();

    stabilizeRelayPoseState(
      {
        upperBody: {
          enabled: true,
          chestYaw: 0.11,
          chestRoll: -0.22,
          neckYaw: 0.05,
          neckRoll: -0.06,
          leftUpperArmRoll: -0.2,
          rightUpperArmRoll: 0.18,
          leftLowerArmRoll: -0.35,
          rightLowerArmRoll: 0.28,
        },
      },
      stabilizer,
      1000,
      { upperBodyHoldMs: 260 },
    );
    const dropout = stabilizeRelayPoseState(
      {
        upperBody: {
          enabled: true,
          chestYaw: 0,
          chestRoll: 0,
          neckYaw: 0,
          neckRoll: 0,
          leftUpperArmRoll: 0,
          rightUpperArmRoll: 0,
          leftLowerArmRoll: 0,
          rightLowerArmRoll: 0,
        },
      },
      stabilizer,
      1033,
      { upperBodyHoldMs: 260 },
    );

    expect(dropout.upperBody?.chestRoll).toBeCloseTo(-0.22);
    expect(dropout.upperBody?.leftLowerArmRoll).toBeCloseTo(-0.35);
  });

  it('allows stronger incoming motion immediately', () => {
    const stabilizer = createRelayPoseStabilizer();

    stabilizeRelayPoseState(
      { head: { enabled: true, pitch: 0.02, yaw: 0.18, roll: 0.01 } },
      stabilizer,
      1000,
      { headHoldMs: 260 },
    );
    const stronger = stabilizeRelayPoseState(
      { head: { enabled: true, pitch: 0.04, yaw: 0.4, roll: 0.02 } },
      stabilizer,
      1033,
      { headHoldMs: 260 },
    );

    expect(stronger.head?.yaw).toBeCloseTo(0.4);
  });

  it('does not hold pose when the hold duration is disabled', () => {
    const stabilizer = createRelayPoseStabilizer();

    stabilizeRelayPoseState(
      { head: { enabled: true, pitch: 0.08, yaw: 0.44, roll: 0.04 } },
      stabilizer,
      1000,
      { headHoldMs: 260 },
    );
    const stopped = stabilizeRelayPoseState(
      { head: { enabled: false, pitch: 0, yaw: 0, roll: 0 } },
      stabilizer,
      1033,
      { headHoldMs: 0 },
    );

    expect(stopped.head?.enabled).toBe(false);
    expect(stopped.head?.yaw).toBe(0);
  });

  it('does not extend a pose hold forever when zero frames keep arriving', () => {
    const stabilizer = createRelayPoseStabilizer();

    stabilizeRelayPoseState(
      { head: { enabled: true, pitch: 0.08, yaw: 0.44, roll: 0.04 } },
      stabilizer,
      1000,
      { headHoldMs: 120 },
    );
    const firstDropout = stabilizeRelayPoseState(
      { head: { enabled: false, pitch: 0, yaw: 0, roll: 0 } },
      stabilizer,
      1033,
      { headHoldMs: 120 },
    );
    const expiredDropout = stabilizeRelayPoseState(
      { head: { enabled: false, pitch: 0, yaw: 0, roll: 0 } },
      stabilizer,
      1180,
      { headHoldMs: 120 },
    );

    expect(firstDropout.head?.yaw).toBeCloseTo(0.44);
    expect(expiredDropout.head?.enabled).toBe(false);
    expect(expiredDropout.head?.yaw).toBe(0);
  });
});
