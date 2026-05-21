import { createStore } from 'zustand/vanilla';

import type { ObsQueryOptions } from '../obs/query';
import type { VrmaPlaybackStatus } from '../vrma/playback-state';
import { createInitialVrmaPlaybackState } from '../vrma/playback-state';

export type VrmLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type VrmaLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type MicStatus = 'idle' | 'requesting' | 'active' | 'error';
export type PoseStatus = 'idle' | 'requesting' | 'loading' | 'active' | 'error';

export interface AppState {
  obsMode: boolean;
  transparent: boolean;
  rendererName: string;
  vrmStatus: VrmLoadStatus;
  vrmFileName: string | null;
  vrmError: string | null;
  vrmaStatus: VrmaLoadStatus;
  vrmaFileName: string | null;
  vrmaError: string | null;
  vrmaDuration: number | null;
  vrmaPlaybackStatus: VrmaPlaybackStatus;
  vrmaLoop: boolean;
  micStatus: MicStatus;
  micError: string | null;
  micLevel: number;
  mouthOpen: number;
  poseStatus: PoseStatus;
  poseError: string | null;
  poseLandmarkCount: number;
  poseUpperBodyVisibleCount: number;
  poseAverageVisibility: number;
  poseSummaryText: string;
  poseMirrorInput: boolean;
  setVrmLoading: (fileName: string) => void;
  setVrmReady: (fileName: string) => void;
  setVrmError: (message: string) => void;
  setVrmaLoading: (fileName: string) => void;
  setVrmaReady: (fileName: string, duration: number) => void;
  setVrmaError: (message: string) => void;
  setVrmaPlaybackStatus: (status: VrmaPlaybackStatus) => void;
  setVrmaLoop: (loop: boolean) => void;
  setMicRequesting: () => void;
  setMicActive: () => void;
  setMicError: (message: string) => void;
  setMicStopped: () => void;
  setMicFrame: (level: number, mouthOpen: number) => void;
  setPoseRequesting: () => void;
  setPoseLoading: () => void;
  setPoseActive: () => void;
  setPoseError: (message: string) => void;
  setPoseStopped: () => void;
  setPoseFrame: (
    landmarkCount: number,
    upperBodyVisibleCount: number,
    averageVisibility: number,
    summaryText: string,
  ) => void;
  setPoseMirrorInput: (mirrorInput: boolean) => void;
}

export type AppStore = ReturnType<typeof createAppStore>;

export function createAppStore(initialOptions: ObsQueryOptions) {
  const initialVrmaPlayback = createInitialVrmaPlaybackState();

  return createStore<AppState>()((set) => ({
    obsMode: initialOptions.obsMode,
    transparent: initialOptions.transparent,
    rendererName: 'Three.js WebGL',
    vrmStatus: 'idle',
    vrmFileName: null,
    vrmError: null,
    vrmaStatus: 'idle',
    vrmaFileName: null,
    vrmaError: null,
    vrmaDuration: null,
    vrmaPlaybackStatus: initialVrmaPlayback.status,
    vrmaLoop: initialVrmaPlayback.loop,
    micStatus: 'idle',
    micError: null,
    micLevel: 0,
    mouthOpen: 0,
    poseStatus: 'idle',
    poseError: null,
    poseLandmarkCount: 0,
    poseUpperBodyVisibleCount: 0,
    poseAverageVisibility: 0,
    poseSummaryText: 'Camera idle.',
    poseMirrorInput: true,
    setVrmLoading: (fileName) =>
      set({
        vrmStatus: 'loading',
        vrmFileName: fileName,
        vrmError: null,
      }),
    setVrmReady: (fileName) =>
      set({
        vrmStatus: 'ready',
        vrmFileName: fileName,
        vrmError: null,
      }),
    setVrmError: (message) =>
      set({
        vrmStatus: 'error',
        vrmError: message,
      }),
    setVrmaLoading: (fileName) =>
      set({
        vrmaStatus: 'loading',
        vrmaFileName: fileName,
        vrmaError: null,
        vrmaDuration: null,
        vrmaPlaybackStatus: 'stopped',
      }),
    setVrmaReady: (fileName, duration) =>
      set({
        vrmaStatus: 'ready',
        vrmaFileName: fileName,
        vrmaError: null,
        vrmaDuration: duration,
        vrmaPlaybackStatus: 'stopped',
      }),
    setVrmaError: (message) =>
      set({
        vrmaStatus: 'error',
        vrmaError: message,
        vrmaPlaybackStatus: 'stopped',
      }),
    setVrmaPlaybackStatus: (status) =>
      set({
        vrmaPlaybackStatus: status,
      }),
    setVrmaLoop: (loop) =>
      set({
        vrmaLoop: loop,
      }),
    setMicRequesting: () =>
      set({
        micStatus: 'requesting',
        micError: null,
      }),
    setMicActive: () =>
      set({
        micStatus: 'active',
        micError: null,
      }),
    setMicError: (message) =>
      set({
        micStatus: 'error',
        micError: message,
        micLevel: 0,
        mouthOpen: 0,
      }),
    setMicStopped: () =>
      set({
        micStatus: 'idle',
        micError: null,
        micLevel: 0,
        mouthOpen: 0,
      }),
    setMicFrame: (level, mouthOpen) =>
      set({
        micLevel: level,
        mouthOpen,
      }),
    setPoseRequesting: () =>
      set({
        poseStatus: 'requesting',
        poseError: null,
      }),
    setPoseLoading: () =>
      set({
        poseStatus: 'loading',
        poseError: null,
      }),
    setPoseActive: () =>
      set({
        poseStatus: 'active',
        poseError: null,
      }),
    setPoseError: (message) =>
      set({
        poseStatus: 'error',
        poseError: message,
        poseLandmarkCount: 0,
        poseUpperBodyVisibleCount: 0,
        poseAverageVisibility: 0,
        poseSummaryText: 'Pose debug stopped.',
      }),
    setPoseStopped: () =>
      set({
        poseStatus: 'idle',
        poseError: null,
        poseLandmarkCount: 0,
        poseUpperBodyVisibleCount: 0,
        poseAverageVisibility: 0,
        poseSummaryText: 'Camera idle.',
      }),
    setPoseFrame: (
      landmarkCount,
      upperBodyVisibleCount,
      averageVisibility,
      summaryText,
    ) =>
      set({
        poseLandmarkCount: landmarkCount,
        poseUpperBodyVisibleCount: upperBodyVisibleCount,
        poseAverageVisibility: averageVisibility,
        poseSummaryText: summaryText,
      }),
    setPoseMirrorInput: (mirrorInput) =>
      set({
        poseMirrorInput: mirrorInput,
      }),
  }));
}
