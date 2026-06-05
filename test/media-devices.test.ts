import { describe, expect, it } from 'vitest';

import {
  createAudioInputConstraints,
  createVideoInputConstraints,
  normalizeMediaInputDevices,
  resolveSelectedDeviceId,
} from '../src/media/media-devices';

describe('media device helpers', () => {
  it('normalizes audio and video inputs with fallback labels', () => {
    const devices = normalizeMediaInputDevices([
      { kind: 'audioinput', deviceId: 'mic-1', groupId: 'g1', label: '' },
      { kind: 'videoinput', deviceId: 'cam-1', groupId: 'g2', label: 'USB Camera' },
      { kind: 'audiooutput', deviceId: 'out-1', groupId: 'g3', label: 'Speaker' },
    ]);

    expect(devices.audioInputs).toEqual([
      {
        kind: 'audioinput',
        deviceId: 'mic-1',
        groupId: 'g1',
        label: '',
        displayName: 'マイク 1',
      },
    ]);
    expect(devices.videoInputs[0]?.displayName).toBe('USB Camera');
    expect(devices.hasHiddenLabels).toBe(true);
  });

  it('falls back to default when a saved device is missing', () => {
    const devices = normalizeMediaInputDevices([
      { kind: 'audioinput', deviceId: 'mic-1', groupId: '', label: 'Mic' },
    ]);

    expect(resolveSelectedDeviceId(devices.audioInputs, 'mic-1')).toBe('mic-1');
    expect(resolveSelectedDeviceId(devices.audioInputs, 'missing')).toBe('');
  });

  it('creates exact constraints only when a device is selected', () => {
    expect(createAudioInputConstraints('')).toMatchObject({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    expect(createAudioInputConstraints('mic-1')).toMatchObject({
      audio: {
        deviceId: { exact: 'mic-1' },
      },
    });
    expect(createVideoInputConstraints('cam-1')).toMatchObject({
      video: {
        deviceId: { exact: 'cam-1' },
        width: { ideal: 640 },
        height: { ideal: 360 },
      },
      audio: false,
    });
  });
});
