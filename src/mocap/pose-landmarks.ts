import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface PosePoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface UpperBodyPoseSummary {
  poseDetected: boolean;
  landmarkCount: number;
  upperBodyVisibleCount: number;
  averageUpperBodyVisibility: number;
  shoulderCenter: PosePoint | null;
  hipCenter: PosePoint | null;
  torsoCenter: PosePoint | null;
  shoulderSpan: number | null;
  shoulderTilt: number | null;
  torsoLean: number | null;
  torsoTurn: number | null;
  leftArmLift: number | null;
  rightArmLift: number | null;
}

const upperBodyIndexes = [0, 11, 12, 13, 14, 15, 16, 23, 24] as const;

const leftShoulder = 11;
const rightShoulder = 12;
const leftElbow = 13;
const rightElbow = 14;
const leftHip = 23;
const rightHip = 24;

export function summarizeUpperBodyPose(
  landmarks: NormalizedLandmark[] | null | undefined,
  visibilityThreshold = 0.5,
): UpperBodyPoseSummary {
  if (!landmarks || landmarks.length === 0) {
    return createEmptySummary();
  }

  const visibleUpperBody = upperBodyIndexes.filter(
    (index) => getVisibility(landmarks[index]) >= visibilityThreshold,
  );
  const upperBodyVisibilityTotal = upperBodyIndexes.reduce<number>(
    (total, index) => total + getVisibility(landmarks[index]),
    0,
  );
  const shoulderCenter = averagePoints(landmarks[leftShoulder], landmarks[rightShoulder]);
  const hipCenter = averagePoints(landmarks[leftHip], landmarks[rightHip]);
  const torsoCenter =
    shoulderCenter && hipCenter ? averagePosePoints(shoulderCenter, hipCenter) : null;
  const shoulderSpan =
    landmarks[leftShoulder] && landmarks[rightShoulder]
      ? distance2d(landmarks[leftShoulder], landmarks[rightShoulder])
      : null;
  const shoulderTilt =
    landmarks[leftShoulder] && landmarks[rightShoulder]
      ? landmarks[rightShoulder].y - landmarks[leftShoulder].y
      : null;
  const torsoLean = shoulderCenter && hipCenter ? shoulderCenter.x - hipCenter.x : null;
  const torsoTurn =
    landmarks[leftShoulder] && landmarks[rightShoulder]
      ? landmarks[rightShoulder].z - landmarks[leftShoulder].z
      : null;
  const leftArmLift = calculateArmLift(landmarks[leftShoulder], landmarks[leftElbow]);
  const rightArmLift = calculateArmLift(landmarks[rightShoulder], landmarks[rightElbow]);

  return {
    poseDetected: landmarks.length > 0,
    landmarkCount: landmarks.length,
    upperBodyVisibleCount: visibleUpperBody.length,
    averageUpperBodyVisibility: upperBodyVisibilityTotal / upperBodyIndexes.length,
    shoulderCenter,
    hipCenter,
    torsoCenter,
    shoulderSpan,
    shoulderTilt,
    torsoLean,
    torsoTurn,
    leftArmLift,
    rightArmLift,
  };
}

function createEmptySummary(): UpperBodyPoseSummary {
  return {
    poseDetected: false,
    landmarkCount: 0,
    upperBodyVisibleCount: 0,
    averageUpperBodyVisibility: 0,
    shoulderCenter: null,
    hipCenter: null,
    torsoCenter: null,
    shoulderSpan: null,
    shoulderTilt: null,
    torsoLean: null,
    torsoTurn: null,
    leftArmLift: null,
    rightArmLift: null,
  };
}

function getVisibility(landmark: NormalizedLandmark | undefined): number {
  return landmark?.visibility ?? 0;
}

function averagePoints(
  first: NormalizedLandmark | undefined,
  second: NormalizedLandmark | undefined,
): PosePoint | null {
  if (!first || !second) {
    return null;
  }

  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
    z: ((first.z ?? 0) + (second.z ?? 0)) / 2,
    visibility: (getVisibility(first) + getVisibility(second)) / 2,
  };
}

function averagePosePoints(first: PosePoint, second: PosePoint): PosePoint {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
    z: (first.z + second.z) / 2,
    visibility: (first.visibility + second.visibility) / 2,
  };
}

function distance2d(first: NormalizedLandmark, second: NormalizedLandmark): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function calculateArmLift(
  shoulder: NormalizedLandmark | undefined,
  elbow: NormalizedLandmark | undefined,
): number | null {
  if (!shoulder || !elbow) {
    return null;
  }

  const verticalDrop = elbow.y - shoulder.y;
  return clamp01((0.34 - verticalDrop) / 0.34);
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
