export type ManualPointerButton = 'primary' | 'auxiliary' | 'secondary';

export interface ManualPointerDrag {
  button: ManualPointerButton;
  deltaX: number;
  deltaY: number;
  viewportWidth: number;
  viewportHeight: number;
  shiftKey?: boolean;
  altKey?: boolean;
}

export interface ManualControlOptions {
  maxHeadYaw: number;
  maxHeadPitch: number;
  maxHeadRoll: number;
  chestYawShare: number;
  chestRollShare: number;
  minOffsetX: number;
  maxOffsetX: number;
  minOffsetY: number;
  maxOffsetY: number;
  minScale: number;
  maxScale: number;
}

export interface ManualPoseState {
  enabled: boolean;
  headYaw: number;
  headPitch: number;
  headRoll: number;
  chestYaw: number;
  chestRoll: number;
}

export interface ManualAvatarTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotationY: number;
}

export const defaultManualControlOptions: ManualControlOptions = {
  maxHeadYaw: Math.PI / 3,
  maxHeadPitch: 0.61,
  maxHeadRoll: 0.26,
  chestYawShare: 0.2,
  chestRollShare: 0,
  minOffsetX: -2,
  maxOffsetX: 2,
  minOffsetY: -1.6,
  maxOffsetY: 1.6,
  minScale: 0.7,
  maxScale: 1.7,
};

export function createNeutralManualPoseState(enabled = false): ManualPoseState {
  return {
    enabled,
    headYaw: 0,
    headPitch: 0,
    headRoll: 0,
    chestYaw: 0,
    chestRoll: 0,
  };
}

export function updateManualPoseFromDrag(
  previous: ManualPoseState,
  drag: ManualPointerDrag,
  options: Partial<ManualControlOptions> = {},
): ManualPoseState {
  const nextOptions = { ...defaultManualControlOptions, ...options };

  if (drag.button !== 'primary') {
    return previous;
  }

  if (drag.altKey) {
    const roll = clamp(
      previous.headRoll + normalizeDelta(drag.deltaX, drag.viewportWidth) * nextOptions.maxHeadRoll,
      -nextOptions.maxHeadRoll,
      nextOptions.maxHeadRoll,
    );

    return {
      enabled: true,
      headYaw: previous.headYaw,
      headPitch: previous.headPitch,
      headRoll: roll,
      chestYaw: previous.headYaw * nextOptions.chestYawShare,
      chestRoll: roll * nextOptions.chestRollShare,
    };
  }

  const yaw = clamp(
    previous.headYaw + normalizeDelta(drag.deltaX, drag.viewportWidth) * nextOptions.maxHeadYaw,
    -nextOptions.maxHeadYaw,
    nextOptions.maxHeadYaw,
  );
  const pitch = clamp(
    previous.headPitch - normalizeDelta(drag.deltaY, drag.viewportHeight) * nextOptions.maxHeadPitch,
    -nextOptions.maxHeadPitch,
    nextOptions.maxHeadPitch,
  );

  return {
    enabled: true,
    headYaw: yaw,
    headPitch: pitch,
    headRoll: previous.headRoll,
    chestYaw: yaw * nextOptions.chestYawShare,
    chestRoll: previous.headRoll * nextOptions.chestRollShare,
  };
}

export function updateManualAvatarTransformFromDrag(
  previous: ManualAvatarTransform,
  drag: ManualPointerDrag,
  options: Partial<ManualControlOptions> = {},
): ManualAvatarTransform {
  const nextOptions = { ...defaultManualControlOptions, ...options };

  if (drag.button === 'auxiliary') {
    return {
      ...previous,
      offsetX: clamp(
        previous.offsetX + (drag.deltaX / safeDimension(drag.viewportWidth)) * 2,
        nextOptions.minOffsetX,
        nextOptions.maxOffsetX,
      ),
      offsetY: clamp(
        previous.offsetY - (drag.deltaY / safeDimension(drag.viewportHeight)) * 1.6,
        nextOptions.minOffsetY,
        nextOptions.maxOffsetY,
      ),
    };
  }

  if (drag.button === 'secondary') {
    return {
      ...previous,
      rotationY: normalizeDegrees(previous.rotationY + (drag.deltaX / safeDimension(drag.viewportWidth)) * 180),
    };
  }

  return previous;
}

export function updateManualAvatarScaleFromWheel(
  previous: ManualAvatarTransform,
  wheelDeltaY: number,
  options: Partial<ManualControlOptions> = {},
): ManualAvatarTransform {
  const nextOptions = { ...defaultManualControlOptions, ...options };
  const scaleDelta = -wheelDeltaY * 0.0012;

  return {
    ...previous,
    scale: clamp(previous.scale + scaleDelta, nextOptions.minScale, nextOptions.maxScale),
  };
}

function normalizeDelta(delta: number, dimension: number): number {
  return delta / (safeDimension(dimension) / 2);
}

function safeDimension(dimension: number): number {
  return Math.max(1, dimension);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeDegrees(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return ((((value + 180) % 360) + 360) % 360) - 180;
}
