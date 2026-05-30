export type VrmExpressionPresetId = 'neutral' | 'happy' | 'angry' | 'sad' | 'relaxed' | 'surprised';

export type VrmExpressionPresetWeights = Partial<Record<string, number>>;
export type VrmEmotionExpressionName = (typeof vrmEmotionExpressionNames)[number];
export type VrmEmotionExpressionWeights = Record<VrmEmotionExpressionName, number>;

export const vrmEmotionExpressionNames = ['neutral', 'happy', 'surprised', 'relaxed', 'angry', 'sad'] as const;

export const vrmExpressionPresets: Record<VrmExpressionPresetId, VrmExpressionPresetWeights> = {
  neutral: {
    neutral: 1,
    happy: 0,
    surprised: 0,
    relaxed: 0,
    angry: 0,
    sad: 0,
  },
  happy: {
    neutral: 0,
    happy: 0.82,
    surprised: 0,
    relaxed: 0.1,
    angry: 0,
    sad: 0,
  },
  angry: {
    neutral: 0,
    happy: 0,
    surprised: 0,
    relaxed: 0,
    angry: 0.82,
    sad: 0,
  },
  sad: {
    neutral: 0,
    happy: 0,
    surprised: 0,
    relaxed: 0,
    angry: 0,
    sad: 0.82,
  },
  relaxed: {
    neutral: 0,
    happy: 0.16,
    surprised: 0,
    relaxed: 0.72,
    angry: 0,
    sad: 0,
  },
  surprised: {
    neutral: 0,
    happy: 0,
    surprised: 0.86,
    relaxed: 0,
    angry: 0,
    sad: 0,
  },
};

export function createNeutralVrmEmotionExpressionWeights(): VrmEmotionExpressionWeights {
  return {
    neutral: 0,
    happy: 0,
    surprised: 0,
    relaxed: 0,
    angry: 0,
    sad: 0,
  };
}

export function createVrmExpressionPresetTarget(
  preset: VrmExpressionPresetId | null,
): VrmEmotionExpressionWeights {
  const target = createNeutralVrmEmotionExpressionWeights();
  const weights = preset ? vrmExpressionPresets[preset] : {};

  for (const name of vrmEmotionExpressionNames) {
    target[name] = weights[name] ?? 0;
  }

  return target;
}

export function smoothVrmEmotionExpressionWeights(
  previous: VrmEmotionExpressionWeights,
  target: VrmEmotionExpressionWeights,
  amount: number,
): VrmEmotionExpressionWeights {
  const smoothing = clamp01(amount);

  return {
    neutral: smoothWeight(previous.neutral, target.neutral, smoothing),
    happy: smoothWeight(previous.happy, target.happy, smoothing),
    surprised: smoothWeight(previous.surprised, target.surprised, smoothing),
    relaxed: smoothWeight(previous.relaxed, target.relaxed, smoothing),
    angry: smoothWeight(previous.angry, target.angry, smoothing),
    sad: smoothWeight(previous.sad, target.sad, smoothing),
  };
}

function smoothWeight(previous: number, target: number, amount: number): number {
  if (Math.abs(target - previous) < 0.004) {
    return target;
  }

  return previous + (target - previous) * amount;
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
