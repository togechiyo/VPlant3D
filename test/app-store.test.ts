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
      micStatus: 'idle',
      micError: null,
      micLevel: 0,
      mouthOpen: 0,
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

  it('tracks microphone reactive mouth state', () => {
    const store = createAppStore({
      obsMode: false,
      transparent: false,
    });

    store.getState().setMicRequesting();

    expect(store.getState()).toMatchObject({
      micStatus: 'requesting',
      micError: null,
    });

    store.getState().setMicActive();
    store.getState().setMicFrame(0.25, 0.75);

    expect(store.getState()).toMatchObject({
      micStatus: 'active',
      micLevel: 0.25,
      mouthOpen: 0.75,
    });

    store.getState().setMicError('Permission denied');

    expect(store.getState()).toMatchObject({
      micStatus: 'error',
      micError: 'Permission denied',
      micLevel: 0,
      mouthOpen: 0,
    });

    store.getState().setMicStopped();

    expect(store.getState()).toMatchObject({
      micStatus: 'idle',
      micError: null,
      micLevel: 0,
      mouthOpen: 0,
    });
  });
});
