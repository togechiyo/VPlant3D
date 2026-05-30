export type VrmExpressionPresetId = 'neutral' | 'happy' | 'angry' | 'sad' | 'relaxed' | 'surprised';

export type VrmExpressionPresetWeights = Partial<Record<string, number>>;

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
