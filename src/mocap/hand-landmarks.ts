import type { Category, NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface HandTrackingSummary {
  handCount: number;
  labels: string[];
  averageVisibility: number;
}

export function summarizeHandTracking(
  landmarks: NormalizedLandmark[][] | null | undefined,
  handedness: Category[][] | null | undefined,
): HandTrackingSummary {
  const hands = landmarks ?? [];
  const labels = hands.map((_, index) => handedness?.[index]?.[0]?.categoryName ?? `Hand ${index + 1}`);
  const visibilityValues = hands.flatMap((hand) =>
    hand.map((landmark) => landmark.visibility ?? 1),
  );
  const averageVisibility =
    visibilityValues.length === 0
      ? 0
      : visibilityValues.reduce((total, value) => total + value, 0) / visibilityValues.length;

  return {
    handCount: hands.length,
    labels,
    averageVisibility,
  };
}
