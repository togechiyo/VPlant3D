import type { RelayExpressionState } from './messages';

export interface RelayExpressionStabilizer {
  previous: RelayExpressionState;
  previousRaw: RelayExpressionState;
  holdUntil: Partial<Record<RelayExpressionChannel, number>>;
}

export interface RelayExpressionStabilizerOptions {
  blinkHoldMs?: number;
  mouthHoldMs?: number;
  sharpDropRatio?: number;
  activationThreshold?: number;
  zeroThreshold?: number;
}

type RelayExpressionChannel = keyof Pick<
  RelayExpressionState,
  'blinkLeft' | 'blinkRight' | 'aa' | 'ih' | 'ou' | 'ee' | 'oh'
>;

const blinkChannels = ['blinkLeft', 'blinkRight'] as const;
const mouthChannels = ['aa', 'ih', 'ou', 'ee', 'oh'] as const;

export function createRelayExpressionStabilizer(): RelayExpressionStabilizer {
  return {
    previous: {},
    previousRaw: {},
    holdUntil: {},
  };
}

export function stabilizeRelayExpressionState(
  candidate: RelayExpressionState,
  stabilizer: RelayExpressionStabilizer,
  now: number,
  options: RelayExpressionStabilizerOptions = {},
): RelayExpressionState {
  const next: RelayExpressionState = { ...candidate };
  const nextHoldUntil = { ...stabilizer.holdUntil };
  const sharpDropRatio = options.sharpDropRatio ?? 0.35;
  const activationThreshold = options.activationThreshold ?? 0.16;
  const zeroThreshold = options.zeroThreshold ?? 0.03;

  for (const channel of blinkChannels) {
    next[channel] = stabilizeChannel(
      channel,
      candidate[channel],
      stabilizer.previous[channel],
      stabilizer.previousRaw[channel],
      nextHoldUntil[channel],
      now,
      options.blinkHoldMs ?? 0,
      sharpDropRatio,
      activationThreshold,
      zeroThreshold,
    );
  }

  for (const channel of mouthChannels) {
    next[channel] = stabilizeChannel(
      channel,
      candidate[channel],
      stabilizer.previous[channel],
      stabilizer.previousRaw[channel],
      nextHoldUntil[channel],
      now,
      options.mouthHoldMs ?? 0,
      sharpDropRatio,
      activationThreshold,
      zeroThreshold,
    );
  }

  stabilizer.previous = next;
  stabilizer.previousRaw = candidate;
  stabilizer.holdUntil = nextHoldUntil;
  return next;

  function stabilizeChannel(
    channel: RelayExpressionChannel,
    candidateValue: number | undefined,
    previousValue: number | undefined,
    previousRawValue: number | undefined,
    holdUntil: number | undefined,
    currentTime: number,
    holdMs: number,
    dropRatio: number,
    activeThreshold: number,
    nearZeroThreshold: number,
  ): number | undefined {
    if (typeof candidateValue !== 'number' || typeof previousValue !== 'number' || holdMs <= 0) {
      nextHoldUntil[channel] = 0;
      return candidateValue;
    }

    if (candidateValue >= previousValue) {
      nextHoldUntil[channel] = 0;
      return candidateValue;
    }

    const isSharpDrop =
      (previousRawValue ?? previousValue) >= activeThreshold &&
      candidateValue <= Math.max(nearZeroThreshold, previousValue * dropRatio);

    if (isSharpDrop && (holdUntil ?? 0) <= currentTime) {
      nextHoldUntil[channel] = currentTime + holdMs;
    }

    if ((nextHoldUntil[channel] ?? 0) > currentTime) {
      return previousValue;
    }

    return candidateValue;
  }
}
