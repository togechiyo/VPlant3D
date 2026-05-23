import { describe, expect, it } from 'vitest';

import {
  createRelayExpressionStabilizer,
  stabilizeRelayExpressionState,
} from '../src/relay/expression-stabilizer';

describe('relay expression stabilizer', () => {
  it('holds a one-frame mocap mouth zero dropout before relay send', () => {
    const stabilizer = createRelayExpressionStabilizer();

    const open = stabilizeRelayExpressionState(
      { aa: 0.82, blinkLeft: 0 },
      stabilizer,
      1000,
      { mouthHoldMs: 220, blinkHoldMs: 120 },
    );
    const dropout = stabilizeRelayExpressionState(
      { aa: 0, blinkLeft: 0 },
      stabilizer,
      1033,
      { mouthHoldMs: 220, blinkHoldMs: 120 },
    );

    expect(open.aa).toBeCloseTo(0.82);
    expect(dropout.aa).toBeCloseTo(0.82);
  });

  it('holds blink dropout briefly but allows increasing blink values immediately', () => {
    const stabilizer = createRelayExpressionStabilizer();

    stabilizeRelayExpressionState(
      { blinkLeft: 0.9 },
      stabilizer,
      1000,
      { blinkHoldMs: 120 },
    );
    const dropout = stabilizeRelayExpressionState(
      { blinkLeft: 0 },
      stabilizer,
      1033,
      { blinkHoldMs: 120 },
    );
    const closedAgain = stabilizeRelayExpressionState(
      { blinkLeft: 1 },
      stabilizer,
      1066,
      { blinkHoldMs: 120 },
    );

    expect(dropout.blinkLeft).toBeCloseTo(0.9);
    expect(closedAgain.blinkLeft).toBe(1);
  });

  it('does not hold zeros when the channel hold duration is disabled', () => {
    const stabilizer = createRelayExpressionStabilizer();

    stabilizeRelayExpressionState({ aa: 0.8 }, stabilizer, 1000, { mouthHoldMs: 220 });
    const off = stabilizeRelayExpressionState({ aa: 0 }, stabilizer, 1033, { mouthHoldMs: 0 });

    expect(off.aa).toBe(0);
  });

  it('does not extend a hold forever when zeros keep arriving', () => {
    const stabilizer = createRelayExpressionStabilizer();

    stabilizeRelayExpressionState({ aa: 0.8 }, stabilizer, 1000, { mouthHoldMs: 120 });
    const firstDropout = stabilizeRelayExpressionState(
      { aa: 0 },
      stabilizer,
      1033,
      { mouthHoldMs: 120 },
    );
    const expiredDropout = stabilizeRelayExpressionState(
      { aa: 0 },
      stabilizer,
      1180,
      { mouthHoldMs: 120 },
    );

    expect(firstDropout.aa).toBeCloseTo(0.8);
    expect(expiredDropout.aa).toBe(0);
  });
});
