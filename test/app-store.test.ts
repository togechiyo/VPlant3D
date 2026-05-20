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
});
