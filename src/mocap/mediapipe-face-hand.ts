import {
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker,
  type FaceLandmarkerResult,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision';

import { MEDIAPIPE_TASKS_VISION_WASM_URL } from './mediapipe-pose-debug';

export const FACE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export const HAND_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export class MediaPipeFaceTracker {
  private constructor(private readonly faceLandmarker: FaceLandmarker) {}

  static async create(): Promise<MediaPipeFaceTracker> {
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_TASKS_VISION_WASM_URL);
    const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: FACE_LANDMARKER_MODEL_URL,
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });

    return new MediaPipeFaceTracker(faceLandmarker);
  }

  detect(videoFrame: HTMLVideoElement, timestampMs: number): FaceLandmarkerResult {
    return this.faceLandmarker.detectForVideo(videoFrame, timestampMs);
  }

  close(): void {
    this.faceLandmarker.close();
  }
}

export class MediaPipeHandTracker {
  private constructor(private readonly handLandmarker: HandLandmarker) {}

  static async create(): Promise<MediaPipeHandTracker> {
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_TASKS_VISION_WASM_URL);
    const handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: HAND_LANDMARKER_MODEL_URL,
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.45,
      minHandPresenceConfidence: 0.45,
      minTrackingConfidence: 0.45,
    });

    return new MediaPipeHandTracker(handLandmarker);
  }

  detect(videoFrame: HTMLVideoElement, timestampMs: number): HandLandmarkerResult {
    return this.handLandmarker.detectForVideo(videoFrame, timestampMs);
  }

  close(): void {
    this.handLandmarker.close();
  }
}
