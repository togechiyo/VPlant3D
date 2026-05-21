import { describe, expect, it } from 'vitest';

import { createAppStore } from '../src/state/app-store';

describe('createAppStore', () => {
  it('initializes OBS display options from parsed query values', () => {
    const store = createAppStore({
      obsMode: true,
      controlMode: false,
      transparent: true,
    });

    expect(store.getState()).toMatchObject({
      obsMode: true,
      controlMode: false,
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
      poseStatus: 'idle',
      poseError: null,
      poseLandmarkCount: 0,
      poseUpperBodyVisibleCount: 0,
      poseAverageVisibility: 0,
      poseSummaryText: '待機',
      poseMirrorInput: true,
      faceTrackingEnabled: true,
      faceTrackingStatus: 'idle',
      faceTrackingSummary: '顔: 待機',
      faceTrackingError: null,
      handTrackingEnabled: false,
      handTrackingStatus: 'idle',
      handTrackingSummary: '手: 待機',
      handTrackingError: null,
      avatarOffsetX: 0,
      avatarOffsetY: 0,
      avatarScale: 1,
      avatarRotationY: 0,
    });
  });

  it('tracks VRM loading, ready, and error states', () => {
    const store = createAppStore({
      obsMode: false,
      controlMode: false,
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
      controlMode: false,
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
      controlMode: false,
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

  it('tracks MediaPipe pose debug state', () => {
    const store = createAppStore({
      obsMode: false,
      controlMode: false,
      transparent: false,
    });

    store.getState().setPoseRequesting();

    expect(store.getState()).toMatchObject({
      poseStatus: 'requesting',
      poseError: null,
    });

    store.getState().setPoseLoading();

    expect(store.getState()).toMatchObject({
      poseStatus: 'loading',
      poseError: null,
    });

    store.getState().setPoseActive();
    store.getState().setPoseFrame(33, 9, 0.82, '33 landmarks, upper body 9/9.');

    expect(store.getState()).toMatchObject({
      poseStatus: 'active',
      poseLandmarkCount: 33,
      poseUpperBodyVisibleCount: 9,
      poseAverageVisibility: 0.82,
      poseSummaryText: '33 landmarks, upper body 9/9.',
    });

    store.getState().setPoseError('Permission denied');

    expect(store.getState()).toMatchObject({
      poseStatus: 'error',
      poseError: 'Permission denied',
      poseLandmarkCount: 0,
      poseUpperBodyVisibleCount: 0,
      poseAverageVisibility: 0,
    });

    store.getState().setPoseStopped();
    store.getState().setPoseMirrorInput(false);

    expect(store.getState()).toMatchObject({
      poseStatus: 'idle',
      poseError: null,
      poseSummaryText: '待機',
      poseMirrorInput: false,
    });
  });

  it('tracks face and hand tracking options and status', () => {
    const store = createAppStore({
      obsMode: false,
      controlMode: false,
      transparent: false,
    });

    store.getState().setFaceTrackingEnabled(false);
    store.getState().setHandTrackingEnabled(false);
    store.getState().setFaceTrackingLoading();
    store.getState().setHandTrackingLoading();

    expect(store.getState()).toMatchObject({
      faceTrackingEnabled: false,
      faceTrackingStatus: 'loading',
      handTrackingEnabled: false,
      handTrackingStatus: 'loading',
    });

    store.getState().setFaceTrackingActive();
    store.getState().setHandTrackingActive();
    store.getState().setFaceTrackingFrame('Face expressions active.');
    store.getState().setHandTrackingFrame('Hands: Left, Right.');

    expect(store.getState()).toMatchObject({
      faceTrackingStatus: 'active',
      faceTrackingSummary: 'Face expressions active.',
      handTrackingStatus: 'active',
      handTrackingSummary: 'Hands: Left, Right.',
    });

    store.getState().setFaceTrackingError('Face model failed');
    store.getState().setHandTrackingError('Hand model failed');

    expect(store.getState()).toMatchObject({
      faceTrackingStatus: 'error',
      faceTrackingError: 'Face model failed',
      handTrackingStatus: 'error',
      handTrackingError: 'Hand model failed',
    });

    store.getState().setFaceTrackingStopped();
    store.getState().setHandTrackingStopped();

    expect(store.getState()).toMatchObject({
      faceTrackingStatus: 'idle',
      faceTrackingSummary: '顔: 待機',
      handTrackingStatus: 'idle',
      handTrackingSummary: '手: 待機',
    });
  });

  it('tracks avatar transform controls', () => {
    const store = createAppStore({
      obsMode: false,
      controlMode: false,
      transparent: false,
    });

    store.getState().setAvatarOffsetX(0.25);
    store.getState().setAvatarOffsetY(-0.1);
    store.getState().setAvatarScale(1.2);
    store.getState().setAvatarRotationY(30);

    expect(store.getState()).toMatchObject({
      avatarOffsetX: 0.25,
      avatarOffsetY: -0.1,
      avatarScale: 1.2,
      avatarRotationY: 30,
    });

    store.getState().resetAvatarTransform();

    expect(store.getState()).toMatchObject({
      avatarOffsetX: 0,
      avatarOffsetY: 0,
      avatarScale: 1,
      avatarRotationY: 0,
    });
  });
});
