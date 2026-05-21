export interface AutoBlinkConfig {
  intervalSeconds: number;
  closeSeconds: number;
  holdSeconds: number;
  openSeconds: number;
  closedWeight: number;
}

export interface AutoBlinkState {
  nextBlinkAt: number;
  blinkStartedAt: number | null;
}

export const defaultAutoBlinkConfig: AutoBlinkConfig = {
  intervalSeconds: 4.2,
  closeSeconds: 0.055,
  holdSeconds: 0.035,
  openSeconds: 0.12,
  closedWeight: 1,
};

export function createAutoBlinkState(
  currentTimeSeconds = 0,
  config: AutoBlinkConfig = defaultAutoBlinkConfig,
): AutoBlinkState {
  return {
    nextBlinkAt: currentTimeSeconds + config.intervalSeconds,
    blinkStartedAt: null,
  };
}

export function sampleAutoBlink(
  state: AutoBlinkState,
  currentTimeSeconds: number,
  config: AutoBlinkConfig = defaultAutoBlinkConfig,
): { state: AutoBlinkState; weight: number } {
  if (state.blinkStartedAt === null && currentTimeSeconds < state.nextBlinkAt) {
    return { state, weight: 0 };
  }

  const blinkStartedAt = state.blinkStartedAt ?? state.nextBlinkAt;
  const closeEnd = config.closeSeconds;
  const holdEnd = closeEnd + config.holdSeconds;
  const openEnd = holdEnd + config.openSeconds;
  const elapsed = currentTimeSeconds - blinkStartedAt;

  if (elapsed >= openEnd) {
    return {
      state: createAutoBlinkState(currentTimeSeconds, config),
      weight: 0,
    };
  }

  if (elapsed <= closeEnd) {
    return {
      state: { ...state, blinkStartedAt },
      weight: smoothStep(elapsed / closeEnd) * config.closedWeight,
    };
  }

  if (elapsed <= holdEnd) {
    return {
      state: { ...state, blinkStartedAt },
      weight: config.closedWeight,
    };
  }

  return {
    state: { ...state, blinkStartedAt },
    weight: (1 - smoothStep((elapsed - holdEnd) / config.openSeconds)) * config.closedWeight,
  };
}

function smoothStep(value: number): number {
  const clamped = Math.min(Math.max(value, 0), 1);
  return clamped * clamped * (3 - 2 * clamped);
}
