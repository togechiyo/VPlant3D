export type VrmaPlaybackStatus = 'stopped' | 'playing';

export interface VrmaPlaybackState {
  status: VrmaPlaybackStatus;
  loop: boolean;
}

export function createInitialVrmaPlaybackState(): VrmaPlaybackState {
  return {
    status: 'stopped',
    loop: true,
  };
}

export function startVrmaPlayback(state: VrmaPlaybackState): VrmaPlaybackState {
  return {
    ...state,
    status: 'playing',
  };
}

export function stopVrmaPlayback(state: VrmaPlaybackState): VrmaPlaybackState {
  return {
    ...state,
    status: 'stopped',
  };
}

export function setVrmaLoop(state: VrmaPlaybackState, loop: boolean): VrmaPlaybackState {
  return {
    ...state,
    loop,
  };
}
