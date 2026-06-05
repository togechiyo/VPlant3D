import {
  createDefaultLookSettings,
  normalizeLookSettings,
  type LookSettings,
} from '../look/look-presets';

export type PersistedControlMode = 'mic-manual' | 'camera';
export type PersistedBlinkMode = 'mocap' | 'auto' | 'off';
export type PersistedLipSyncMode = 'mocap' | 'mic' | 'off';

export interface PersistedAvatarTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotationY: number;
}

export interface AppConfigV1 {
  version: 1;
  selectedAudioDeviceId: string;
  selectedVideoDeviceId: string;
  selectedControlMode: PersistedControlMode;
  blinkMode: PersistedBlinkMode;
  lipSyncMode: PersistedLipSyncMode;
  manualControlEnabled: boolean;
  manualMouseEnabled: boolean;
  idleSwayEnabled: boolean;
  poseMirrorInput: boolean;
  avatarTransform: PersistedAvatarTransform;
  lookSettings: LookSettings;
  vrmaLoop: boolean;
}

export type AppConfigInput = Partial<
  Omit<AppConfigV1, 'version' | 'avatarTransform' | 'lookSettings'>
> & {
  version?: unknown;
  avatarTransform?: Partial<PersistedAvatarTransform>;
  lookSettings?: Partial<LookSettings>;
};

export function createDefaultAppConfig(): AppConfigV1 {
  return {
    version: 1,
    selectedAudioDeviceId: '',
    selectedVideoDeviceId: '',
    selectedControlMode: 'mic-manual',
    blinkMode: 'auto',
    lipSyncMode: 'mic',
    manualControlEnabled: true,
    manualMouseEnabled: true,
    idleSwayEnabled: true,
    poseMirrorInput: true,
    avatarTransform: {
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      rotationY: 0,
    },
    lookSettings: createDefaultLookSettings(),
    vrmaLoop: true,
  };
}

export function normalizeAppConfig(input: unknown): AppConfigV1 {
  const defaults = createDefaultAppConfig();
  if (!isRecord(input)) {
    return defaults;
  }

  const value = input as AppConfigInput;
  return {
    version: 1,
    selectedAudioDeviceId: normalizeString(value.selectedAudioDeviceId),
    selectedVideoDeviceId: normalizeString(value.selectedVideoDeviceId),
    selectedControlMode: isControlMode(value.selectedControlMode)
      ? value.selectedControlMode
      : defaults.selectedControlMode,
    blinkMode: isBlinkMode(value.blinkMode) ? value.blinkMode : defaults.blinkMode,
    lipSyncMode: isLipSyncMode(value.lipSyncMode) ? value.lipSyncMode : defaults.lipSyncMode,
    manualControlEnabled: normalizeBoolean(
      value.manualControlEnabled,
      defaults.manualControlEnabled,
    ),
    manualMouseEnabled: normalizeBoolean(value.manualMouseEnabled, defaults.manualMouseEnabled),
    idleSwayEnabled: normalizeBoolean(value.idleSwayEnabled, defaults.idleSwayEnabled),
    poseMirrorInput: normalizeBoolean(value.poseMirrorInput, defaults.poseMirrorInput),
    avatarTransform: normalizeAvatarTransform(value.avatarTransform, defaults.avatarTransform),
    lookSettings: normalizeLookSettings(value.lookSettings ?? defaults.lookSettings),
    vrmaLoop: normalizeBoolean(value.vrmaLoop, defaults.vrmaLoop),
  };
}

export function serializeAppConfig(config: AppConfigV1): string {
  return JSON.stringify(normalizeAppConfig(config));
}

function normalizeAvatarTransform(
  value: Partial<PersistedAvatarTransform> | undefined,
  fallback: PersistedAvatarTransform,
): PersistedAvatarTransform {
  return {
    offsetX: clampNumber(value?.offsetX, -2, 2, fallback.offsetX),
    offsetY: clampNumber(value?.offsetY, -1.6, 1.6, fallback.offsetY),
    scale: clampNumber(value?.scale, 0.7, 1.7, fallback.scale),
    rotationY: clampNumber(value?.rotationY, -180, 180, fallback.rotationY),
  };
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isControlMode(value: unknown): value is PersistedControlMode {
  return value === 'mic-manual' || value === 'camera';
}

function isBlinkMode(value: unknown): value is PersistedBlinkMode {
  return value === 'mocap' || value === 'auto' || value === 'off';
}

function isLipSyncMode(value: unknown): value is PersistedLipSyncMode {
  return value === 'mocap' || value === 'mic' || value === 'off';
}
