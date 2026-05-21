import { describe, expect, it } from 'vitest';

import {
  createAutoBlinkState,
  sampleAutoBlink,
  type AutoBlinkConfig,
} from '../src/idle/auto-blink';

const config: AutoBlinkConfig = {
  intervalSeconds: 1,
  closeSeconds: 0.1,
  holdSeconds: 0.05,
  openSeconds: 0.2,
  closedWeight: 1,
};

describe('auto blink', () => {
  it('stays open before the next blink time', () => {
    const state = createAutoBlinkState(0, config);

    expect(sampleAutoBlink(state, 0.5, config).weight).toBe(0);
  });

  it('closes, holds, opens, and schedules the next blink', () => {
    const state = createAutoBlinkState(0, config);

    const closing = sampleAutoBlink(state, 1.05, config);
    expect(closing.weight).toBeGreaterThan(0);
    expect(closing.weight).toBeLessThan(1);

    const held = sampleAutoBlink(closing.state, 1.12, config);
    expect(held.weight).toBe(1);

    const opening = sampleAutoBlink(held.state, 1.25, config);
    expect(opening.weight).toBeGreaterThan(0);
    expect(opening.weight).toBeLessThan(1);

    const finished = sampleAutoBlink(opening.state, 1.36, config);
    expect(finished.weight).toBe(0);
    expect(finished.state.blinkStartedAt).toBeNull();
    expect(finished.state.nextBlinkAt).toBeCloseTo(2.36);
  });
});
