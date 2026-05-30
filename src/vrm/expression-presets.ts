export type VrmExpressionPresetId = 'neutral' | 'happy' | 'angry' | 'sad' | 'relaxed';

export type VrmExpressionPresetWeights = Partial<Record<string, number>>;

export const vrmExpressionPresets: Record<VrmExpressionPresetId, VrmExpressionPresetWeights> = {
  neutral: {
    happy: 0,
    surprised: 0,
    relaxed: 0,
    angry: 0,
    sad: 0,
  },
  happy: {
    happy: 0.82,
    surprised: 0,
    relaxed: 0.1,
    angry: 0,
    sad: 0,
  },
  angry: {
    happy: 0,
    surprised: 0,
    relaxed: 0,
    angry: 0.82,
    sad: 0,
  },
  sad: {
    happy: 0,
    surprised: 0,
    relaxed: 0,
    angry: 0,
    sad: 0.82,
  },
  relaxed: {
    happy: 0.16,
    surprised: 0,
    relaxed: 0.72,
    angry: 0,
    sad: 0,
  },
};
