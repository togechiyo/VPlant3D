import { createStore } from 'zustand/vanilla';

import type { ObsQueryOptions } from '../obs/query';

export interface AppState {
  obsMode: boolean;
  transparent: boolean;
  rendererName: string;
}

export type AppStore = ReturnType<typeof createAppStore>;

export function createAppStore(initialOptions: ObsQueryOptions) {
  return createStore<AppState>()(() => ({
    obsMode: initialOptions.obsMode,
    transparent: initialOptions.transparent,
    rendererName: 'Three.js WebGL',
  }));
}
