export interface IdleSwayConfig {
  breathAmplitude: number;
  rollAmplitude: number;
  yawAmplitude: number;
  pitchAmplitude: number;
}

export interface IdleSwayPose {
  chestYaw: number;
  chestRoll: number;
  neckPitch: number;
  neckRoll: number;
}

export const defaultIdleSwayConfig: IdleSwayConfig = {
  breathAmplitude: 0.018,
  rollAmplitude: 0.028,
  yawAmplitude: 0.02,
  pitchAmplitude: 0.012,
};

export function sampleIdleSway(
  currentTimeSeconds: number,
  config: IdleSwayConfig = defaultIdleSwayConfig,
): IdleSwayPose {
  const breath = Math.sin(currentTimeSeconds * 1.7);
  const slow = Math.sin(currentTimeSeconds * 0.63);
  const counter = Math.sin(currentTimeSeconds * 0.91 + 1.4);

  return {
    chestYaw: slow * config.yawAmplitude,
    chestRoll: counter * config.rollAmplitude,
    neckPitch: breath * config.pitchAmplitude,
    neckRoll: -counter * config.rollAmplitude * 0.36,
  };
}
