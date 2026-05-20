import { describe, expect, it } from 'vitest';

import { createAppStore } from '../src/state/app-store';

describe('createAppStore', () => {
  it('initializes OBS display options from parsed query values', () => {
    const store = createAppStore({
      obsMode: true,
      transparent: true,
    });

    expect(store.getState()).toMatchObject({
      obsMode: true,
      transparent: true,
      rendererName: 'Three.js WebGL',
      vrmStatus: 'idle',
      vrmFileName: null,
      vrmError: null,
      vrmaStatus: 'idle',
      vrmaFileName: null,
      vrmaError: null,
      vrmaDuration: null,
      vrmaPlaybackStatus: 'stopped',
      vrmaLoop: true,
    });
  });

  it('tracks VRM loading, ready, and error states', () => {
    const store = createAppStore({
      obsMode: false,
      transparent: false,
    });

    store.getState().setVrmLoading('AliciaSolid.vrm');

    expect(store.getState()).toMatchObject({
      vrmStatus: 'loading',
      vrmFileName: 'AliciaSolid.vrm',
      vrmError: null,
    });

    store.getState().setVrmReady('AliciaSolid.vrm');

    expect(store.getState()).toMatchObject({
      vrmStatus: 'ready',
      vrmFileName: 'AliciaSolid.vrm',
      vrmError: null,
    });

    store.getState().setVrmError('Failed to load');

    expect(store.getState()).toMatchObject({
      vrmStatus: 'error',
      vrmFileName: 'AliciaSolid.vrm',
      vrmError: 'Failed to load',
    });
  });

  it('tracks VRMA loading, ready, playback, loop, and error states', () => {
    const store = createAppStore({
      obsMode: false,
      transparent: false,
    });

    store.getState().setVrmaLoading('VRMA_02.vrma');

    expect(store.getState()).toMatchObject({
      vrmaStatus: 'loading',
      vrmaFileName: 'VRMA_02.vrma',
      vrmaError: null,
      vrmaDuration: null,
      vrmaPlaybackStatus: 'stopped',
    });

    store.getState().setVrmaReady('VRMA_02.vrma', 2.5);
    store.getState().setVrmaPlaybackStatus('playing');
    store.getState().setVrmaLoop(false);

    expect(store.getState()).toMatchObject({
      vrmaStatus: 'ready',
      vrmaFileName: 'VRMA_02.vrma',
      vrmaError: null,
      vrmaDuration: 2.5,
      vrmaPlaybackStatus: 'playing',
      vrmaLoop: false,
    });

    store.getState().setVrmaError('Failed to load motion');

    expect(store.getState()).toMatchObject({
      vrmaStatus: 'error',
      vrmaFileName: 'VRMA_02.vrma',
      vrmaError: 'Failed to load motion',
      vrmaPlaybackStatus: 'stopped',
    });
  });
});
