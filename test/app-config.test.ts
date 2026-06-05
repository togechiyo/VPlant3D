import { describe, expect, it } from 'vitest';

import { createDefaultAppConfig, normalizeAppConfig } from '../src/config/app-config';
import {
  appConfigStorageKey,
  readAppConfigFromStorage,
  writeAppConfigToStorage,
} from '../src/config/local-storage';

describe('app config persistence', () => {
  it('normalizes saved settings and clamps avatar transform', () => {
    const config = normalizeAppConfig({
      selectedAudioDeviceId: 'mic-1',
      selectedVideoDeviceId: 'cam-1',
      selectedControlMode: 'camera',
      blinkMode: 'mocap',
      lipSyncMode: 'off',
      manualControlEnabled: false,
      poseMirrorInput: false,
      avatarTransform: {
        offsetX: 99,
        offsetY: -99,
        scale: 9,
        rotationY: 360,
      },
      lookSettings: {
        keyColorHex: '#AABBCC',
      },
      vrmaLoop: false,
    });

    expect(config.selectedAudioDeviceId).toBe('mic-1');
    expect(config.selectedVideoDeviceId).toBe('cam-1');
    expect(config.selectedControlMode).toBe('camera');
    expect(config.blinkMode).toBe('mocap');
    expect(config.lipSyncMode).toBe('off');
    expect(config.manualControlEnabled).toBe(false);
    expect(config.poseMirrorInput).toBe(false);
    expect(config.avatarTransform).toEqual({
      offsetX: 2,
      offsetY: -1.6,
      scale: 1.7,
      rotationY: 180,
    });
    expect(config.lookSettings.keyColorHex).toBe('#aabbcc');
    expect(config.vrmaLoop).toBe(false);
  });

  it('reads, writes, and clears broken localStorage values', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
    const config = {
      ...createDefaultAppConfig(),
      selectedAudioDeviceId: 'mic-2',
    };

    writeAppConfigToStorage(storage, config);
    expect(readAppConfigFromStorage(storage)?.selectedAudioDeviceId).toBe('mic-2');

    values.set(appConfigStorageKey, '{broken');
    expect(readAppConfigFromStorage(storage)).toBeNull();
    expect(values.has(appConfigStorageKey)).toBe(false);
  });
});
