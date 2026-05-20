export interface MouthNormalizeOptions {
  threshold: number;
  sensitivity: number;
}

export interface MouthSmoothingOptions {
  attack: number;
  release: number;
}

export function calculateRms(samples: ArrayLike<number>): number {
  if (samples.length === 0) {
    return 0;
  }

  let sumSquares = 0;
  let validSamples = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index] ?? 0;

    if (!Number.isFinite(sample)) {
      continue;
    }

    sumSquares += sample * sample;
    validSamples += 1;
  }

  if (validSamples === 0) {
    return 0;
  }

  return Math.sqrt(sumSquares / validSamples);
}

export function normalizeMouthOpen(
  rms: number,
  options: MouthNormalizeOptions,
): number {
  if (!Number.isFinite(rms)) {
    return 0;
  }

  const threshold = Math.max(0, options.threshold);
  const sensitivity = Math.max(0.0001, options.sensitivity);
  const normalized = (rms - threshold) * sensitivity;

  return clamp01(normalized);
}

export function smoothMouthOpen(
  previous: number,
  next: number,
  options: MouthSmoothingOptions,
): number {
  const safePrevious = clamp01(Number.isFinite(previous) ? previous : 0);
  const safeNext = clamp01(Number.isFinite(next) ? next : 0);
  const factor = safeNext > safePrevious ? options.attack : options.release;
  const safeFactor = clamp01(Number.isFinite(factor) ? factor : 0);

  return safePrevious + (safeNext - safePrevious) * safeFactor;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}
