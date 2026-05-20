import { describe, expect, it } from 'vitest';

import {
  createInitialVrmaPlaybackState,
  setVrmaLoop,
  startVrmaPlayback,
  stopVrmaPlayback,
} from '../src/vrma/playback-state';

describe('VRMA playback state', () => {
  it('starts stopped with loop enabled', () => {
    expect(createInitialVrmaPlaybackState()).toEqual({
      status: 'stopped',
      loop: true,
    });
  });

  it('starts and stops playback without changing loop mode', () => {
    const initial = createInitialVrmaPlaybackState();
    const playing = startVrmaPlayback(initial);
    const stopped = stopVrmaPlayback(playing);

    expect(playing).toEqual({
      status: 'playing',
      loop: true,
    });
    expect(stopped).toEqual({
      status: 'stopped',
      loop: true,
    });
  });

  it('toggles loop mode without changing playback status', () => {
    const playing = startVrmaPlayback(createInitialVrmaPlaybackState());

    expect(setVrmaLoop(playing, false)).toEqual({
      status: 'playing',
      loop: false,
    });
  });
});
