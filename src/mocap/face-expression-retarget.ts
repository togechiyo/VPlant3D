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

export interface VrmFaceExpressionOptions {
  mirrorInput?: boolean;
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
  options: VrmFaceExpressionOptions = {},
): VrmFaceExpressionWeights {
  if (!categories || categories.length === 0) {
    return createNeutralFaceExpressionWeights();
  }

  const jawOpen = getScore(categories, 'jawOpen');
  const mouthFunnel = getScore(categories, 'mouthFunnel');
  const mouthPucker = getScore(categories, 'mouthPucker');
  const eyeBlinkLeft = getMirroredScore(categories, 'eyeBlinkLeft', options.mirrorInput);
  const eyeBlinkRight = getMirroredScore(categories, 'eyeBlinkRight', options.mirrorInput);
  const mouthSmile =
    (getMirroredScore(categories, 'mouthSmileLeft', options.mirrorInput) +
      getMirroredScore(categories, 'mouthSmileRight', options.mirrorInput)) /
    2;
  const mouthStretch =
    (getMirroredScore(categories, 'mouthStretchLeft', options.mirrorInput) +
      getMirroredScore(categories, 'mouthStretchRight', options.mirrorInput)) /
    2;
  const browInnerUp = getScore(categories, 'browInnerUp');
  const browOuterUp =
    (getMirroredScore(categories, 'browOuterUpLeft', options.mirrorInput) +
      getMirroredScore(categories, 'browOuterUpRight', options.mirrorInput)) /
    2;
  const roundMouth = Math.max(mouthFunnel, mouthPucker);

  return {
    blinkLeft: shapeBlinkWeight(eyeBlinkLeft),
    blinkRight: shapeBlinkWeight(eyeBlinkRight),
    aa: shapeMouthWeight(jawOpen),
    ih: shapeMouthWeight(mouthStretch),
    ou: shapeMouthWeight(roundMouth),
    ee: shapeMouthWeight(mouthSmile),
    oh: shapeMouthWeight(Math.max(roundMouth * 0.75, jawOpen * 0.45)),
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
    blinkLeft: smoothMocapExpressionWeight(previous.blinkLeft, next.blinkLeft, amount, 0.008),
    blinkRight: smoothMocapExpressionWeight(previous.blinkRight, next.blinkRight, amount, 0.008),
    aa: smoothMocapExpressionWeight(previous.aa, next.aa, amount, 0.006),
    ih: smoothMocapExpressionWeight(previous.ih, next.ih, amount, 0.006),
    ou: smoothMocapExpressionWeight(previous.ou, next.ou, amount, 0.006),
    ee: smoothMocapExpressionWeight(previous.ee, next.ee, amount, 0.006),
    oh: smoothMocapExpressionWeight(previous.oh, next.oh, amount, 0.006),
    happy: smoothExpressionWeight(previous.happy, next.happy, amount, 0.018, 0.02),
    surprised: smoothExpressionWeight(previous.surprised, next.surprised, amount, 0.018, 0.02),
  };
}

function getScore(categories: Category[], categoryName: string): number {
  return categories.find((category) => category.categoryName === categoryName)?.score ?? 0;
}

function getMirroredScore(categories: Category[], categoryName: string, mirrorInput = false): number {
  return getScore(categories, mirrorInput ? getOppositeSideCategory(categoryName) : categoryName);
}

function getOppositeSideCategory(categoryName: string): string {
  if (categoryName.endsWith('Left')) {
    return `${categoryName.slice(0, -4)}Right`;
  }

  if (categoryName.endsWith('Right')) {
    return `${categoryName.slice(0, -5)}Left`;
  }

  return categoryName;
}

function shapeBlinkWeight(score: number): number {
  const value = clamp01(score);

  if (value < 0.08) {
    return 0;
  }

  if (value < 0.2) {
    return (value - 0.08) * 0.45;
  }

  if (value > 0.58) {
    return 1 - (1 - value) * (1 - value) * 0.35;
  }

  return 0.07 + (value - 0.2) * 1.05;
}

function shapeMouthWeight(score: number): number {
  const value = clamp01(score);

  if (value < 0.015) {
    return 0;
  }

  return value;
}

function smoothExpressionWeight(
  previous: number,
  next: number,
  amount: number,
  deadband: number,
  zeroSnapThreshold: number,
): number {
  if (previous < zeroSnapThreshold && next < zeroSnapThreshold) {
    return 0;
  }

  if (Math.abs(next - previous) < deadband) {
    return previous;
  }

  return lerp(previous, next, amount);
}

function smoothMocapExpressionWeight(
  previous: number,
  next: number,
  amount: number,
  deadband: number,
): number {
  if (Math.abs(next - previous) < deadband) {
    return previous;
  }

  return lerp(previous, next, amount);
}

function lerp(previous: number, next: number, amount: number): number {
  return previous + (next - previous) * amount;
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
