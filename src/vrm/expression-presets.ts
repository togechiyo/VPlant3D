export type VrmExpressionPresetId = 'neutral' | 'happy' | 'surprised' | 'relaxed';

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
  surprised: {
    happy: 0,
    surprised: 0.82,
    relaxed: 0,
    angry: 0,
    sad: 0,
  },
  relaxed: {
    happy: 0.16,
    surprised: 0,
    relaxed: 0.72,
    angry: 0,
    sad: 0,
  },
};
