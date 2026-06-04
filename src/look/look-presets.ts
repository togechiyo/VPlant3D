export type LookPresetId = 'standard' | 'bright' | 'front-top' | 'neon' | 'edge';
export type KeyLightColor = 'neutral' | 'warm' | 'cool' | 'neon-blue' | 'neon-green';
export type KeyLightDirection = 'front-top' | 'left-top' | 'right-top' | 'high-front';
export type RimLightStrength = 'off' | 'soft' | 'medium' | 'strong';
export type RimLightColor = 'white' | 'blue' | 'green';
export type RimLightDirection = 'left-back' | 'right-back' | 'top-back';

export interface LookSettings {
  preset: LookPresetId;
  keyIntensityScale: number;
  keyColorHex: string;
  keyPosition: [number, number, number];
  keyShadowEnabled: boolean;
  fillIntensityScale: number;
  rimStrength: RimLightStrength;
  rimColor: RimLightColor;
  rimDirection: RimLightDirection;
}

export interface LookLightPreset {
  id: LookPresetId;
  label: string;
  keyColor: number;
  keyIntensity: number;
  keyPosition: [number, number, number];
  keyTarget: [number, number, number];
  keyShadowEnabled: boolean;
  fillColor: number;
  fillIntensity: number;
  fillPosition: [number, number, number];
  fillTarget: [number, number, number];
  rimColor: number;
  rimIntensity: number;
  rimPosition: [number, number, number];
  rimTarget: [number, number, number];
  exposure: number;
}

export interface ResolvedLookLights extends LookLightPreset {
  keyIntensity: number;
  keyPosition: [number, number, number];
  fillIntensity: number;
  rimColor: number;
  rimIntensity: number;
  rimPosition: [number, number, number];
}

type LegacyLookSettingsInput = {
  keyColor?: KeyLightColor;
  keyDirection?: KeyLightDirection;
};

export const lookLightPresets: Record<LookPresetId, LookLightPreset> = {
  standard: {
    id: 'standard',
    label: '標準',
    keyColor: 0xf4fbff,
    keyIntensity: 2.15,
    keyPosition: [0.25, 3.9, 3.55],
    keyTarget: [0, 1.42, 0],
    keyShadowEnabled: false,
    fillColor: 0xb8d7ff,
    fillIntensity: 0.26,
    fillPosition: [2.6, 1.9, 2.25],
    fillTarget: [0, 1.12, 0],
    rimColor: 0x38d5ff,
    rimIntensity: 1.55,
    rimPosition: [0.9, 4.55, -2.65],
    rimTarget: [0, 1.52, 0],
    exposure: 0.94,
  },
  bright: {
    id: 'bright',
    label: '明るめ',
    keyColor: 0xffffff,
    keyIntensity: 2.4,
    keyPosition: [0.15, 4.05, 3.65],
    keyTarget: [0, 1.42, 0],
    keyShadowEnabled: false,
    fillColor: 0xcfe8ff,
    fillIntensity: 0.42,
    fillPosition: [2.5, 1.95, 2.45],
    fillTarget: [0, 1.12, 0],
    rimColor: 0xf4fbff,
    rimIntensity: 1.6,
    rimPosition: [0.85, 4.6, -2.65],
    rimTarget: [0, 1.52, 0],
    exposure: 0.96,
  },
  'front-top': {
    id: 'front-top',
    label: '正面上',
    keyColor: 0xf4fbff,
    keyIntensity: 2.25,
    keyPosition: [0, 4.35, 3.35],
    keyTarget: [0, 1.44, 0],
    keyShadowEnabled: false,
    fillColor: 0xcfe8ff,
    fillIntensity: 0.28,
    fillPosition: [2.35, 1.85, 2.25],
    fillTarget: [0, 1.1, 0],
    rimColor: 0x38d5ff,
    rimIntensity: 1.55,
    rimPosition: [0.8, 4.75, -2.55],
    rimTarget: [0, 1.54, 0],
    exposure: 0.94,
  },
  neon: {
    id: 'neon',
    label: 'ネオン',
    keyColor: 0xf4fbff,
    keyIntensity: 2.05,
    keyPosition: [0.4, 3.9, 3.35],
    keyTarget: [0, 1.42, 0],
    keyShadowEnabled: false,
    fillColor: 0x38d5ff,
    fillIntensity: 0.34,
    fillPosition: [2.85, 1.9, 2.1],
    fillTarget: [0, 1.08, 0],
    rimColor: 0x6dff9a,
    rimIntensity: 3.1,
    rimPosition: [1.15, 4.7, -2.7],
    rimTarget: [0, 1.54, 0],
    exposure: 0.92,
  },
  edge: {
    id: 'edge',
    label: '輪郭強調',
    keyColor: 0xf4fbff,
    keyIntensity: 1.95,
    keyPosition: [0.35, 3.85, 3.3],
    keyTarget: [0, 1.42, 0],
    keyShadowEnabled: false,
    fillColor: 0xaecfff,
    fillIntensity: 0.12,
    fillPosition: [2.7, 1.85, 2.05],
    fillTarget: [0, 1.08, 0],
    rimColor: 0x38d5ff,
    rimIntensity: 4.1,
    rimPosition: [1.25, 4.9, -2.9],
    rimTarget: [0, 1.56, 0],
    exposure: 0.9,
  },
};

export function createDefaultLookSettings(): LookSettings {
  return {
    preset: 'bright',
    keyIntensityScale: 1,
    keyColorHex: '#ffffff',
    keyPosition: [0.15, 4.05, 3.65],
    keyShadowEnabled: false,
    fillIntensityScale: 1,
    rimStrength: 'medium',
    rimColor: 'white',
    rimDirection: 'top-back',
  };
}

export function resolveLookLights(settings: LookSettings): ResolvedLookLights {
  const preset = lookLightPresets[settings.preset] ?? lookLightPresets.standard;

  return {
    ...preset,
    keyColor: hexToNumber(settings.keyColorHex, preset.keyColor),
    keyIntensity: preset.keyIntensity * clampScale(settings.keyIntensityScale),
    keyPosition: normalizeKeyPosition(settings.keyPosition, preset.keyPosition),
    keyShadowEnabled: settings.keyShadowEnabled,
    fillIntensity: 0,
    rimColor: getRimColor(settings.rimColor, preset.rimColor),
    rimIntensity: 0,
    rimPosition: getRimPosition(settings.rimDirection, preset.rimPosition),
  };
}

export function normalizeLookSettings(
  settings: Partial<LookSettings> & LegacyLookSettingsInput,
): LookSettings {
  const defaults = createDefaultLookSettings();

  return {
    preset: isLookPresetId(settings.preset) ? settings.preset : defaults.preset,
    keyIntensityScale: clampScale(settings.keyIntensityScale ?? defaults.keyIntensityScale),
    keyColorHex: normalizeKeyColorHex(settings.keyColorHex, settings.keyColor),
    keyPosition: normalizeKeyPosition(
      settings.keyPosition,
      isKeyLightDirection(settings.keyDirection)
        ? getKeyPosition(settings.keyDirection, defaults.keyPosition)
        : defaults.keyPosition,
    ),
    keyShadowEnabled:
      typeof settings.keyShadowEnabled === 'boolean'
        ? settings.keyShadowEnabled
        : defaults.keyShadowEnabled,
    fillIntensityScale: clampScale(settings.fillIntensityScale ?? defaults.fillIntensityScale),
    rimStrength: isRimLightStrength(settings.rimStrength)
      ? settings.rimStrength
      : defaults.rimStrength,
    rimColor: isRimLightColor(settings.rimColor) ? settings.rimColor : defaults.rimColor,
    rimDirection: isRimLightDirection(settings.rimDirection)
      ? settings.rimDirection
      : defaults.rimDirection,
  };
}

function normalizeKeyColorHex(value: unknown, legacyColor: unknown): string {
  if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) {
    return value.toLowerCase();
  }

  if (isKeyLightColor(legacyColor)) {
    return numberToHex(getKeyColor(legacyColor, 0xffffff));
  }

  return '#ffffff';
}

function normalizeKeyPosition(
  value: unknown,
  fallback: [number, number, number],
): [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) {
    return fallback;
  }

  const x = Number(value[0]);
  const y = Number(value[1]);
  const z = Number(value[2]);
  if (![x, y, z].every(Number.isFinite)) {
    return fallback;
  }

  return [clampRange(x, -4, 4), clampRange(y, 0.5, 6), clampRange(z, -1, 6)];
}

function hexToNumber(value: string, fallback: number): number {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    return fallback;
  }

  return Number.parseInt(value.slice(1), 16);
}

function numberToHex(value: number): string {
  return `#${Math.max(0, Math.min(0xffffff, value)).toString(16).padStart(6, '0')}`;
}

function getKeyColor(color: KeyLightColor, fallback: number): number {
  switch (color) {
    case 'neutral':
      return 0xf4fbff;
    case 'warm':
      return 0xfff0d2;
    case 'cool':
      return 0xd9f2ff;
    case 'neon-blue':
      return 0x9ee8ff;
    case 'neon-green':
      return 0xd8ffdf;
    default:
      return fallback;
  }
}

function getKeyPosition(
  direction: KeyLightDirection,
  fallback: [number, number, number],
): [number, number, number] {
  switch (direction) {
    case 'front-top':
      return [0.25, 3.9, 3.55];
    case 'left-top':
      return [-2.25, 3.75, 3.25];
    case 'right-top':
      return [2.25, 3.75, 3.25];
    case 'high-front':
      return [0, 5.0, 2.55];
    default:
      return fallback;
  }
}

function getRimColor(color: RimLightColor, fallback: number): number {
  switch (color) {
    case 'white':
      return 0xf4fbff;
    case 'blue':
      return 0x38d5ff;
    case 'green':
      return 0x6dff9a;
    default:
      return fallback;
  }
}

function getRimPosition(
  direction: RimLightDirection,
  fallback: [number, number, number],
): [number, number, number] {
  switch (direction) {
    case 'left-back':
      return [-2.35, 3.85, -2.75];
    case 'right-back':
      return [2.35, 3.85, -2.75];
    case 'top-back':
      return [0, 5.65, -1.05];
    default:
      return fallback;
  }
}

function clampScale(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(value, 0), 2);
}

function clampRange(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isLookPresetId(value: unknown): value is LookPresetId {
  return (
    value === 'standard' ||
    value === 'bright' ||
    value === 'front-top' ||
    value === 'neon' ||
    value === 'edge'
  );
}

function isKeyLightColor(value: unknown): value is KeyLightColor {
  return (
    value === 'neutral' ||
    value === 'warm' ||
    value === 'cool' ||
    value === 'neon-blue' ||
    value === 'neon-green'
  );
}

function isKeyLightDirection(value: unknown): value is KeyLightDirection {
  return (
    value === 'front-top' ||
    value === 'left-top' ||
    value === 'right-top' ||
    value === 'high-front'
  );
}

function isRimLightStrength(value: unknown): value is RimLightStrength {
  return value === 'off' || value === 'soft' || value === 'medium' || value === 'strong';
}

function isRimLightColor(value: unknown): value is RimLightColor {
  return value === 'white' || value === 'blue' || value === 'green';
}

function isRimLightDirection(value: unknown): value is RimLightDirection {
  return value === 'left-back' || value === 'right-back' || value === 'top-back';
}
