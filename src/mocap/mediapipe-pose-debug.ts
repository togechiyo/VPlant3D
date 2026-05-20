import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';

export const MEDIAPIPE_TASKS_VISION_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';

export const POSE_LANDMARKER_LITE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export interface MediaPipePoseDebugOptions {
  wasmBaseUrl?: string;
  modelAssetPath?: string;
  delegate?: 'CPU' | 'GPU';
}

export class MediaPipePoseDebug {
  private constructor(private readonly poseLandmarker: PoseLandmarker) {}

  static async create(options: MediaPipePoseDebugOptions = {}): Promise<MediaPipePoseDebug> {
    const vision = await FilesetResolver.forVisionTasks(
      options.wasmBaseUrl ?? MEDIAPIPE_TASKS_VISION_WASM_URL,
    );
    const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: options.modelAssetPath ?? POSE_LANDMARKER_LITE_MODEL_URL,
        delegate: options.delegate ?? 'CPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    });

    return new MediaPipePoseDebug(poseLandmarker);
  }

  detect(videoFrame: HTMLVideoElement, timestampMs: number): PoseLandmarkerResult {
    return this.poseLandmarker.detectForVideo(videoFrame, timestampMs);
  }

  close(): void {
    this.poseLandmarker.close();
  }
}
