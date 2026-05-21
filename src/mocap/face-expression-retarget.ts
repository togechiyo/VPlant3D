import type { Category } from '@mediapipe/tasks-vision';

export interface VrmFaceExpressionWeights {
  blinkLeft: number;
  blinkRight: number;
  aa: number;
  ih: number;
  ou: number;
  ee: number;
  oh: number;
  happy: number;
  surprised: number;
}

export function createNeutralFaceExpressionWeights(): VrmFaceExpressionWeights {
  return {
    blinkLeft: 0,
    blinkRight: 0,
    aa: 0,
    ih: 0,
    ou: 0,
    ee: 0,
    oh: 0,
    happy: 0,
    surprised: 0,
  };
}

export function createVrmFaceExpressionWeights(
  categories: Category[] | null | undefined,
): VrmFaceExpressionWeights {
  if (!categories || categories.length === 0) {
    return createNeutralFaceExpressionWeights();
  }

  const jawOpen = getScore(categories, 'jawOpen');
  const mouthFunnel = getScore(categories, 'mouthFunnel');
  const mouthPucker = getScore(categories, 'mouthPucker');
  const mouthSmile =
    (getScore(categories, 'mouthSmileLeft') + getScore(categories, 'mouthSmileRight')) / 2;
  const mouthStretch =
    (getScore(categories, 'mouthStretchLeft') + getScore(categories, 'mouthStretchRight')) / 2;
  const browInnerUp = getScore(categories, 'browInnerUp');
  const browOuterUp =
    (getScore(categories, 'browOuterUpLeft') + getScore(categories, 'browOuterUpRight')) / 2;
  const roundMouth = Math.max(mouthFunnel, mouthPucker);
  const openMouth = Math.max(0, jawOpen - roundMouth * 0.25);

  return {
    blinkLeft: clamp01(getScore(categories, 'eyeBlinkLeft') * 1.25),
    blinkRight: clamp01(getScore(categories, 'eyeBlinkRight') * 1.25),
    aa: clamp01(openMouth * 1.35),
    ih: clamp01(mouthStretch * 0.7),
    ou: clamp01(roundMouth * 1.05),
    ee: clamp01(mouthSmile * 0.35),
    oh: clamp01(Math.max(roundMouth * 0.45, jawOpen * 0.3)),
    happy: clamp01(mouthSmile * 0.75),
    surprised: clamp01(Math.max(browInnerUp, browOuterUp) * 0.55),
  };
}

export function smoothFaceExpressionWeights(
  previous: VrmFaceExpressionWeights,
  next: VrmFaceExpressionWeights,
  smoothing = 0.45,
): VrmFaceExpressionWeights {
  const amount = clamp01(smoothing);

  return {
    blinkLeft: lerp(previous.blinkLeft, next.blinkLeft, amount),
    blinkRight: lerp(previous.blinkRight, next.blinkRight, amount),
    aa: lerp(previous.aa, next.aa, amount),
    ih: lerp(previous.ih, next.ih, amount),
    ou: lerp(previous.ou, next.ou, amount),
    ee: lerp(previous.ee, next.ee, amount),
    oh: lerp(previous.oh, next.oh, amount),
    happy: lerp(previous.happy, next.happy, amount),
    surprised: lerp(previous.surprised, next.surprised, amount),
  };
}

function getScore(categories: Category[], categoryName: string): number {
  return categories.find((category) => category.categoryName === categoryName)?.score ?? 0;
}

function lerp(previous: number, next: number, amount: number): number {
  return previous + (next - previous) * amount;
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
