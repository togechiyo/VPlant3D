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
    });
  });
});
