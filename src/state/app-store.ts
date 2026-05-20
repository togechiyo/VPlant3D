import { createStore } from 'zustand/vanilla';

import type { ObsQueryOptions } from '../obs/query';

export type VrmLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface AppState {
  obsMode: boolean;
  transparent: boolean;
  rendererName: string;
  vrmStatus: VrmLoadStatus;
  vrmFileName: string | null;
  vrmError: string | null;
  setVrmLoading: (fileName: string) => void;
  setVrmReady: (fileName: string) => void;
  setVrmError: (message: string) => void;
}

export type AppStore = ReturnType<typeof createAppStore>;

export function createAppStore(initialOptions: ObsQueryOptions) {
  return createStore<AppState>()((set) => ({
    obsMode: initialOptions.obsMode,
    transparent: initialOptions.transparent,
    rendererName: 'Three.js WebGL',
    vrmStatus: 'idle',
    vrmFileName: null,
    vrmError: null,
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
  }));
}
