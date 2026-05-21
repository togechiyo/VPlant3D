import { describe, expect, it } from 'vitest';

import { sampleIdleSway } from '../src/idle/idle-sway';

describe('idle sway', () => {
  it('keeps generated motion inside subtle avatar-safe ranges', () => {
    for (const time of [0, 0.5, 1, 2, 4, 8, 16]) {
      const pose = sampleIdleSway(time);

      expect(Math.abs(pose.chestYaw)).toBeLessThanOrEqual(0.02);
      expect(Math.abs(pose.chestRoll)).toBeLessThanOrEqual(0.028);
      expect(Math.abs(pose.neckPitch)).toBeLessThanOrEqual(0.012);
      expect(Math.abs(pose.neckRoll)).toBeLessThanOrEqual(0.011);
    }
  });
});
